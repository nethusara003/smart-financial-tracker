// @ts-nocheck
import mongoose from "mongoose";
import Transfer from "../models/Transfer.js";
import Transaction from "../models/Transaction.js";
import User from "../models/User.js";
import Wallet from "../models/Wallet.js";
import TransferLimit from "../models/TransferLimit.js";
import { createNotification } from "./notificationController.js";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import crypto from "crypto";

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_PIN_THRESHOLD = 1000;
const OTP_EXPIRY_MS = 5 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const OTP_RATE_WINDOW_MS = 15 * 60 * 1000;
const OTP_RATE_MAX_REQUESTS = 5;
const MAX_SAVED_RECIPIENTS = 30;
const OTP_EMAIL_ONLY_MODE = String(process.env.OTP_EMAIL_ONLY || "").toLowerCase() === "true";
const SMS_PROVIDER_CONFIGURED = Boolean(
  process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_PHONE
);
const EFFECTIVE_OTP_EMAIL_ONLY_MODE = OTP_EMAIL_ONLY_MODE || !SMS_PROVIDER_CONFIGURED;

const OTP_FALLBACK_REASON = {
  EMAIL_ONLY_MODE: "email_only_mode",
  INVALID_PHONE_FORMAT: "invalid_phone_format",
  PHONE_NOT_AVAILABLE: "phone_not_available",
  SMS_PROVIDER_UNAVAILABLE: "sms_provider_unavailable",
  SMS_AUTH_FAILED: "sms_auth_failed",
  SMS_DELIVERY_FAILED: "sms_delivery_failed",
};

const transferOtpSessions = new Map();
const transferOtpRateTracker = new Map();
const DEFAULT_OTP_COUNTRY_CODE = String(process.env.OTP_DEFAULT_COUNTRY_CODE || "94").replace(/\D/g, "") || "94";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const toAmount = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizePhoneNumber = (value) => {
  const raw = String(value || "").trim();
  if (!raw) {
    return "";
  }

  const unified = raw.startsWith("00") ? `+${raw.slice(2)}` : raw;

  if (unified.startsWith("+")) {
    const digits = unified.slice(1).replace(/\D/g, "");
    if (!digits) {
      return "";
    }

    const withoutLeadingZeroCountry = digits.replace(/^0+/, "");
    return `+${withoutLeadingZeroCountry}`;
  }

  const digitsOnly = unified.replace(/\D/g, "");
  if (!digitsOnly) {
    return "";
  }

  if (digitsOnly.startsWith(DEFAULT_OTP_COUNTRY_CODE) && digitsOnly.length >= 8) {
    return `+${digitsOnly}`;
  }

  if (digitsOnly.startsWith("0") && digitsOnly.length >= 9) {
    return `+${DEFAULT_OTP_COUNTRY_CODE}${digitsOnly.replace(/^0+/, "")}`;
  }

  return `+${digitsOnly}`;
};

const isValidPhoneNumber = (value) => /^\+[1-9]\d{7,14}$/.test(String(value || ""));
const isValidEmailAddress = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());

const describeFallbackReason = (code) => {
  switch (code) {
    case OTP_FALLBACK_REASON.EMAIL_ONLY_MODE:
      return "SMS OTP is disabled for this environment.";
    case OTP_FALLBACK_REASON.INVALID_PHONE_FORMAT:
      return "Phone number format is invalid. Use international format (e.g. +947XXXXXXXX).";
    case OTP_FALLBACK_REASON.PHONE_NOT_AVAILABLE:
      return "No valid phone number is available for SMS verification.";
    case OTP_FALLBACK_REASON.SMS_PROVIDER_UNAVAILABLE:
      return "SMS provider is not configured right now.";
    case OTP_FALLBACK_REASON.SMS_AUTH_FAILED:
      return "SMS provider authentication failed.";
    case OTP_FALLBACK_REASON.SMS_DELIVERY_FAILED:
    default:
      return "SMS delivery failed.";
  }
};

const maskPhone = (phone) => {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length < 4) return "***";
  return `***${digits.slice(-4)}`;
};

const clearExpiredOtpSessions = () => {
  const now = Date.now();
  for (const [sessionId, session] of transferOtpSessions.entries()) {
    if (!session || session.expiresAt <= now || session.used) {
      transferOtpSessions.delete(sessionId);
    }
  }
};

const canRequestOtp = (userId) => {
  const now = Date.now();
  const key = String(userId);
  const windowStart = now - OTP_RATE_WINDOW_MS;
  const existing = transferOtpRateTracker.get(key) || [];
  const active = existing.filter((timestamp) => timestamp > windowStart);

  transferOtpRateTracker.set(key, active);
  return active.length < OTP_RATE_MAX_REQUESTS;
};

const recordOtpRequest = (userId) => {
  const key = String(userId);
  const existing = transferOtpRateTracker.get(key) || [];
  existing.push(Date.now());
  transferOtpRateTracker.set(key, existing.slice(-OTP_RATE_MAX_REQUESTS));
};

const createOtpSession = async ({ userId, code, deliveryChannel, deliveryTarget }) => {
  const sessionId = crypto.randomUUID();
  const codeHash = await bcrypt.hash(String(code), 8);

  transferOtpSessions.set(sessionId, {
    userId: String(userId),
    codeHash,
    deliveryChannel,
    deliveryTarget,
    createdAt: Date.now(),
    expiresAt: Date.now() + OTP_EXPIRY_MS,
    attempts: 0,
    used: false,
  });

  return sessionId;
};

const verifyOtpSessionCode = async ({ userId, otpSessionId, otpCode }) => {
  clearExpiredOtpSessions();

  const session = transferOtpSessions.get(String(otpSessionId || ""));
  if (!session) {
    return { valid: false, message: "Verification code expired or invalid" };
  }

  if (session.userId !== String(userId)) {
    return { valid: false, message: "Verification session does not belong to this user" };
  }

  if (session.used) {
    transferOtpSessions.delete(String(otpSessionId));
    return { valid: false, message: "Verification code already used" };
  }

  if (Date.now() > session.expiresAt) {
    transferOtpSessions.delete(String(otpSessionId));
    return { valid: false, message: "Verification code expired" };
  }

  if (session.attempts >= OTP_MAX_ATTEMPTS) {
    transferOtpSessions.delete(String(otpSessionId));
    return { valid: false, message: "Too many incorrect attempts. Request a new code." };
  }

  const isValid = await bcrypt.compare(String(otpCode || ""), session.codeHash);
  if (!isValid) {
    session.attempts += 1;
    transferOtpSessions.set(String(otpSessionId), session);
    return { valid: false, message: "Invalid verification code" };
  }

  transferOtpSessions.delete(String(otpSessionId));
  return { valid: true, deliveryChannel: session.deliveryChannel, deliveryTarget: session.deliveryTarget };
};

const sendOtpViaSms = async ({ phoneNumber, code }) => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromPhone = process.env.TWILIO_FROM_PHONE;

  if (!accountSid || !authToken || !fromPhone) {
    return {
      sent: false,
      reasonCode: OTP_FALLBACK_REASON.SMS_PROVIDER_UNAVAILABLE,
      reason: describeFallbackReason(OTP_FALLBACK_REASON.SMS_PROVIDER_UNAVAILABLE),
    };
  }

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: phoneNumber,
          From: fromPhone,
          Body: `Your Smart Financial Tracker transfer verification code is ${code}. It expires in 5 minutes.`,
        }),
      }
    );

    if (!response.ok) {
      const responsePayload = await response.json().catch(() => null);
      if (response.status === 401 || response.status === 403) {
        return {
          sent: false,
          reasonCode: OTP_FALLBACK_REASON.SMS_AUTH_FAILED,
          reason: describeFallbackReason(OTP_FALLBACK_REASON.SMS_AUTH_FAILED),
          providerError: responsePayload?.message,
        };
      }

      return {
        sent: false,
        reasonCode: OTP_FALLBACK_REASON.SMS_DELIVERY_FAILED,
        reason: responsePayload?.message || describeFallbackReason(OTP_FALLBACK_REASON.SMS_DELIVERY_FAILED),
      };
    }

    return { sent: true };
  } catch {
    return {
      sent: false,
      reasonCode: OTP_FALLBACK_REASON.SMS_DELIVERY_FAILED,
      reason: describeFallbackReason(OTP_FALLBACK_REASON.SMS_DELIVERY_FAILED),
    };
  }
};

const sendOtpViaEmail = async ({ email, code }) => {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS || process.env.EMAIL_PASSWORD;

  if (!emailUser || !emailPass) {
    console.warn("⚠️ Email service is not configured. Mocking OTP email success.");
    console.log(`[MOCK EMAIL] OTP code is ${code} for email ${email}`);
    return { sent: true, mocked: true };
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    });

    await transporter.sendMail({
      from: `"SFT - Smart Financial Tracker" <${emailUser}>`,
      to: email,
      subject: "Transfer Verification Code",
      html: `
        <p>Your transfer verification code is:</p>
        <h2 style="letter-spacing: 4px;">${code}</h2>
        <p>This code expires in 5 minutes and can be used only once.</p>
      `,
    });

    return { sent: true };
  } catch {
    return { sent: false, reason: "Email delivery failed" };
  }
};

const upsertSavedRecipient = async ({ senderId, receiver, saveRecipient }) => {
  if (!saveRecipient || !receiver?._id) {
    return;
  }

  const sender = await User.findById(senderId).select("savedTransferRecipients");
  if (!sender) {
    return;
  }

  const recipients = Array.isArray(sender.savedTransferRecipients)
    ? [...sender.savedTransferRecipients]
    : [];

  const existingIndex = recipients.findIndex(
    (entry) => String(entry.userId) === String(receiver._id)
  );

  if (existingIndex >= 0) {
    recipients[existingIndex] = {
      ...recipients[existingIndex],
      name: receiver.name,
      email: maskEmail(receiver.email),
      profilePicture: receiver.profilePicture || "",
      lastUsedAt: new Date(),
      useCount: Number(recipients[existingIndex].useCount || 0) + 1,
    };
  } else {
    recipients.unshift({
      userId: receiver._id,
      name: receiver.name,
      email: maskEmail(receiver.email),
      profilePicture: receiver.profilePicture || "",
      createdAt: new Date(),
      lastUsedAt: new Date(),
      useCount: 1,
    });
  }

  sender.savedTransferRecipients = recipients
    .sort((a, b) => new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime())
    .slice(0, MAX_SAVED_RECIPIENTS);

  await sender.save();
};

/**
 * @desc    Send transfer OTP code (SMS first, fallback to email)
 * @route   POST /api/transfers/send-otp
 * @access  Private
 */
export const sendTransferOtp = async (req, res) => {
  try {
    clearExpiredOtpSessions();

    const userId = req.user._id;
    const { phoneNumber, savePhone = false, fallbackEmail } = req.body || {};

    if (!canRequestOtp(userId)) {
      return res.status(429).json({
        message: "Too many OTP requests. Please wait a few minutes and try again.",
      });
    }

    const user = await User.findById(userId).select("email phone transferOtpProfile");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const requestedPhone = normalizePhoneNumber(phoneNumber);
    const profilePhone = normalizePhoneNumber(user?.transferOtpProfile?.phoneNumber || user?.phone);
    const finalPhone = requestedPhone || profilePhone;
    const requestedFallbackEmail = String(fallbackEmail || "").trim().toLowerCase();

    const otpCode = String(crypto.randomInt(100000, 1000000));
    let deliveryChannel = "sms";
    let deliveryTarget = finalPhone;
    let fallbackUsed = false;
    let smsUnavailableReason = "";
    let smsUnavailableReasonCode = "";

    if (EFFECTIVE_OTP_EMAIL_ONLY_MODE) {
      deliveryChannel = "email";
      fallbackUsed = true;
      smsUnavailableReasonCode = OTP_EMAIL_ONLY_MODE
        ? OTP_FALLBACK_REASON.EMAIL_ONLY_MODE
        : OTP_FALLBACK_REASON.SMS_PROVIDER_UNAVAILABLE;
      smsUnavailableReason = describeFallbackReason(smsUnavailableReasonCode);
    } else if (finalPhone && isValidPhoneNumber(finalPhone)) {
      const smsResult = await sendOtpViaSms({ phoneNumber: finalPhone, code: otpCode });
      if (smsResult.sent) {
        deliveryChannel = "sms";
        deliveryTarget = finalPhone;
      } else {
        deliveryChannel = "email";
        fallbackUsed = true;
        smsUnavailableReasonCode = smsResult.reasonCode || OTP_FALLBACK_REASON.SMS_DELIVERY_FAILED;
        smsUnavailableReason = smsResult.reason || describeFallbackReason(smsUnavailableReasonCode);
      }
    } else {
      deliveryChannel = "email";
      fallbackUsed = true;
      smsUnavailableReasonCode = finalPhone
        ? OTP_FALLBACK_REASON.INVALID_PHONE_FORMAT
        : OTP_FALLBACK_REASON.PHONE_NOT_AVAILABLE;
      smsUnavailableReason = describeFallbackReason(smsUnavailableReasonCode);
    }

    if (deliveryChannel === "email") {
      if (!requestedFallbackEmail || !isValidEmailAddress(requestedFallbackEmail)) {
        return res.status(400).json({
          message: smsUnavailableReason
            ? `${smsUnavailableReason} Enter an email address to receive OTP.`
            : "Enter an email address to receive OTP.",
          requiresEmailInput: true,
          fallbackReason: {
            code: smsUnavailableReasonCode || OTP_FALLBACK_REASON.SMS_DELIVERY_FAILED,
            message: smsUnavailableReason || describeFallbackReason(OTP_FALLBACK_REASON.SMS_DELIVERY_FAILED),
          },
        });
      }

      const emailResult = await sendOtpViaEmail({ email: requestedFallbackEmail, code: otpCode });
      if (!emailResult.sent) {
        return res.status(503).json({
          message: "Unable to deliver verification code to the provided email right now.",
        });
      }

      deliveryTarget = requestedFallbackEmail;
    }

    if (savePhone && requestedPhone && isValidPhoneNumber(requestedPhone)) {
      await User.findByIdAndUpdate(userId, {
        $set: {
          phone: requestedPhone,
          "transferOtpProfile.phoneNumber": requestedPhone,
          "transferOtpProfile.preferredChannel": deliveryChannel,
          "transferOtpProfile.phoneVerifiedAt": new Date(),
        },
      });
    }

    recordOtpRequest(userId);

    const sessionId = await createOtpSession({
      userId,
      code: otpCode,
      deliveryChannel,
      deliveryTarget,
    });

    res.json({
      sessionId,
      expiresInSeconds: Math.floor(OTP_EXPIRY_MS / 1000),
      delivery: {
        channel: deliveryChannel,
        target: deliveryChannel === "sms" ? maskPhone(deliveryTarget) : maskEmail(deliveryTarget),
        fallbackUsed,
        fallbackReason: fallbackUsed
          ? {
            code: smsUnavailableReasonCode || OTP_FALLBACK_REASON.SMS_DELIVERY_FAILED,
            message: smsUnavailableReason || describeFallbackReason(OTP_FALLBACK_REASON.SMS_DELIVERY_FAILED),
          }
          : null,
      },
      message:
        deliveryChannel === "sms"
          ? "Verification code sent to your phone"
          : "Verification code sent to your email",
    });
  } catch (error) {
    console.error("Send transfer OTP error:", error);
    res.status(500).json({ message: "Error sending verification code" });
  }
};

/**
 * @desc    Get saved transfer recipients
 * @route   GET /api/transfers/contacts
 * @access  Private
 */
export const getSavedRecipients = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("savedTransferRecipients");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const contacts = (user.savedTransferRecipients || [])
      .map((entry) => ({
        userId: entry.userId,
        name: entry.name,
        email: entry.email,
        profilePicture: entry.profilePicture || "",
        lastUsedAt: entry.lastUsedAt,
        useCount: Number(entry.useCount || 0),
      }))
      .sort((a, b) => new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime());

    res.json({ contacts });
  } catch (error) {
    console.error("Get saved recipients error:", error);
    res.status(500).json({ message: "Error fetching saved recipients" });
  }
};

/**
 * @desc    Search users for transfer
 * @route   GET /api/transfers/search-users
 * @access  Private
 */
export const searchUsers = async (req, res) => {
  try {
    const { query, limit = 10 } = req.query;
    const currentUserId = req.user._id;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({ message: "Search query must be at least 2 characters" });
    }

    // Search users by email, name, or account number (excluding current user)
    const users = await User.find({
      _id: { $ne: currentUserId },
      $or: [
        { email: { $regex: query, $options: "i" } },
        { name: { $regex: query, $options: "i" } },
        { accountNumber: { $regex: query, $options: "i" } },
      ],
    })
      .select("name email profilePicture accountNumber")
      .limit(Math.min(parseInt(limit), 50));

    // Mask email for privacy (show only first 2 chars and domain)
    const maskedUsers = users.map((user) => ({
      userId: user._id,
      name: user.name,
      email: maskEmail(user.email),
      profilePicture: user.profilePicture,
      accountNumber: user.accountNumber,
    }));

    res.json({ users: maskedUsers });
  } catch (error) {
    console.error("Search users error:", error);
    res.status(500).json({ message: "Error searching users" });
  }
};

/**
 * @desc    Validate receiver for transfer
 * @route   POST /api/transfers/validate-receiver
 * @access  Private
 */
export const validateReceiver = async (req, res) => {
  try {
    const { receiverIdentifier } = req.body;
    const currentUserId = req.user._id;

    if (!receiverIdentifier) {
      return res.status(400).json({ message: "Receiver identifier is required" });
    }

    // Find receiver by email, accountNumber, or userId
    let receiver = await User.findOne({
      $or: [
        { email: receiverIdentifier },
        { accountNumber: receiverIdentifier },
        { _id: mongoose.Types.ObjectId.isValid(receiverIdentifier) ? receiverIdentifier : null },
      ],
    }).select("name email profilePicture accountNumber");

    if (!receiver) {
      return res.json({
        isValid: false,
        message: "User not found",
        canReceiveTransfers: false,
      });
    }

    // Check if trying to send to self
    if (receiver._id.toString() === currentUserId.toString()) {
      return res.json({
        isValid: false,
        message: "Cannot transfer to yourself",
        canReceiveTransfers: false,
      });
    }

    res.json({
      isValid: true,
      receiver: {
        userId: receiver._id,
        name: receiver.name,
        email: maskEmail(receiver.email),
        profilePicture: receiver.profilePicture,
        accountNumber: receiver.accountNumber,
      },
      canReceiveTransfers: true,
      message: "Receiver is valid",
    });
  } catch (error) {
    console.error("Validate receiver error:", error);
    res.status(500).json({ message: "Error validating receiver" });
  }
};

/**
 * @desc    Get transfer limits for current user
 * @route   GET /api/transfers/my-limits
 * @access  Private
 */
export const getMyLimits = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get or create transfer limits
    let limits = await TransferLimit.findOne({ user: userId });

    if (!limits) {
      // Create default limits
      limits = await TransferLimit.create({
        user: userId,
        singleTransfer: user.transferLimits?.singleTransfer || 500000,
        dailyLimit: user.transferLimits?.dailyLimit || 50000,
        monthlyLimit: user.transferLimits?.monthlyLimit || 200000,
      });
    }

    // Check if reset is needed
    if (limits.needsDailyReset()) {
      await limits.resetDaily();
    }
    if (limits.needsMonthlyReset()) {
      await limits.resetMonthly();
    }

    res.json({
      limits: {
        singleTransfer: limits.singleTransfer,
        daily: limits.dailyLimit,
        monthly: limits.monthlyLimit,
        requirePinAbove: Number(user.transferSettings?.requirePinAboveAmount || DEFAULT_PIN_THRESHOLD),
      },
      currentUsage: {
        today: limits.dailyUsed,
        thisMonth: limits.monthlyUsed,
      },
      remaining: {
        today: limits.remainingDaily,
        thisMonth: limits.remainingMonthly,
      },
      resetDates: {
        daily: limits.lastDailyReset,
        monthly: limits.lastMonthlyReset,
      },
      otpDefaults: {
        phoneNumber: normalizePhoneNumber(user?.transferOtpProfile?.phoneNumber || user?.phone || ""),
        email: user?.email || "",
        preferredChannel: EFFECTIVE_OTP_EMAIL_ONLY_MODE
          ? "email"
          : user?.transferOtpProfile?.preferredChannel || "sms",
        emailOnlyMode: EFFECTIVE_OTP_EMAIL_ONLY_MODE,
      },
      savedRecipientsCount: Array.isArray(user?.savedTransferRecipients)
        ? user.savedTransferRecipients.length
        : 0,
    });
  } catch (error) {
    console.error("Get limits error:", error);
    res.status(500).json({ message: "Error fetching transfer limits" });
  }
};

const getOrCreateTransferLimits = async (userId, userRecord) => {
  let limits = await TransferLimit.findOne({ user: userId });

  if (!limits) {
    limits = await TransferLimit.create({
      user: userId,
      singleTransfer: userRecord?.transferLimits?.singleTransfer || 500000,
      dailyLimit: userRecord?.transferLimits?.dailyLimit || 50000,
      monthlyLimit: userRecord?.transferLimits?.monthlyLimit || 200000,
    });
  }

  if (limits.needsDailyReset()) {
    await limits.resetDaily();
  }
  if (limits.needsMonthlyReset()) {
    await limits.resetMonthly();
  }

  return limits;
};

const buildSmartTransferInsights = async ({
  senderId,
  receiverId,
  amount,
  senderBalance,
  limits,
  description,
}) => {
  const now = new Date();
  const safeAmount = Math.max(0, toAmount(amount));
  const last30Days = new Date(now.getTime() - 30 * DAY_MS);
  const last24Hours = new Date(now.getTime() - DAY_MS);

  const [recentTransactions, transferHistoryToReceiver, recentTransfers] = await Promise.all([
    Transaction.find({
      user: senderId,
      date: { $gte: last30Days },
      scope: { $ne: "wallet" },
    }).select("type amount"),
    Transfer.countDocuments({
      "sender.userId": senderId,
      "receiver.userId": receiverId,
      status: "completed",
    }),
    Transfer.find({
      "sender.userId": senderId,
      createdAt: { $gte: last24Hours },
      status: { $in: ["pending", "processing", "completed"] },
    }).select("amount status"),
  ]);

  const monthlyIncome = recentTransactions
    .filter((tx) => tx.type === "income")
    .reduce((sum, tx) => sum + toAmount(tx.amount), 0);

  const monthlyExpense = recentTransactions
    .filter((tx) => tx.type === "expense")
    .reduce((sum, tx) => sum + toAmount(tx.amount), 0);

  const dailyTransferAmount = recentTransfers.reduce((sum, tx) => sum + toAmount(tx.amount), 0);
  const dailyTransferCount = recentTransfers.length;
  const firstTimeRecipient = transferHistoryToReceiver === 0;

  let riskScore = 0;

  if (firstTimeRecipient) {
    riskScore += 24;
  }

  if (monthlyIncome > 0) {
    const ratio = safeAmount / monthlyIncome;
    if (ratio >= 0.5) {
      riskScore += 28;
    } else if (ratio >= 0.25) {
      riskScore += 16;
    }
  }

  if (dailyTransferCount >= 3) {
    riskScore += 16;
  } else if (dailyTransferCount >= 2) {
    riskScore += 8;
  }

  if (limits?.dailyLimit && dailyTransferAmount + safeAmount > limits.dailyLimit * 0.75) {
    riskScore += 12;
  }

  if (limits?.singleTransfer && safeAmount > limits.singleTransfer * 0.8) {
    riskScore += 10;
  }

  if (!String(description || "").trim()) {
    riskScore += 4;
  }

  riskScore = clamp(Math.round(riskScore), 0, 100);

  const riskLevel = riskScore >= 70 ? "high" : riskScore >= 40 ? "medium" : "low";
  const shouldRequirePin = riskLevel === "high";

  const amountVsIncomePct = monthlyIncome > 0 ? (safeAmount / monthlyIncome) * 100 : 0;
  const amountVsSpendPct = monthlyExpense > 0 ? (safeAmount / monthlyExpense) * 100 : 0;

  const suggestions = [];
  if (riskLevel === "high") {
    suggestions.push("High-risk transfer detected. Verify recipient details carefully before sending.");
    suggestions.push("Consider scheduling the transfer instead of sending immediately.");
  }
  if (firstTimeRecipient) {
    suggestions.push("This is your first transfer to this recipient.");
  }
  if (monthlyIncome > 0 && amountVsIncomePct >= 30) {
    suggestions.push("This transfer is a large share of your monthly income.");
  }

  const balanceAfter = senderBalance - safeAmount;
  const monthlySavings = monthlyIncome - monthlyExpense;
  const savingsAfterTransfer = monthlySavings - safeAmount;

  return {
    risk: {
      score: riskScore,
      level: riskLevel,
      shouldRequirePin,
    },
    impact: {
      balanceAfter,
      amountVsIncomePct: Number(amountVsIncomePct.toFixed(2)),
      amountVsSpendPct: Number(amountVsSpendPct.toFixed(2)),
      monthlySavingsBefore: Number(monthlySavings.toFixed(2)),
      monthlySavingsAfter: Number(savingsAfterTransfer.toFixed(2)),
      firstTimeRecipient,
      dailyTransferCount,
      dailyTransferAmount: Number(dailyTransferAmount.toFixed(2)),
      previousTransfersToRecipient: transferHistoryToReceiver,
    },
    suggestions,
  };
};

/**
 * @desc    Check if transfer is feasible
 * @route   POST /api/transfers/check-feasibility
 * @access  Private
 */
export const checkFeasibility = async (req, res) => {
  try {
    const { receiverId, amount, description, scheduledFor } = req.body;
    const senderId = req.user._id;
    const reasons = [];
    const transferAmount = toAmount(amount);

    if (!receiverId || !transferAmount) {
      return res.status(400).json({ message: "Receiver ID and amount are required" });
    }

    if (!mongoose.Types.ObjectId.isValid(receiverId)) {
      return res.status(400).json({
        canTransfer: false,
        reasons: [
          {
            type: "receiver",
            message: "Invalid receiver identifier",
            severity: "error",
          },
        ],
      });
    }

    if (transferAmount <= 0) {
      reasons.push({
        type: "amount",
        message: "Amount must be greater than 0",
        severity: "error",
      });
    }

    // Check receiver exists
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      reasons.push({
        type: "receiver",
        message: "Receiver not found",
        severity: "error",
      });
    }

    // Calculate sender balance
    const senderBalance = await calculateUserBalance(senderId);
    if (senderBalance < transferAmount) {
      reasons.push({
        type: "balance",
        message: `Insufficient balance. Available: $${senderBalance.toFixed(2)}`,
        severity: "error",
      });
    }

    if (scheduledFor) {
      const scheduledDate = new Date(scheduledFor);
      const now = new Date();
      const maxScheduleDate = new Date(now.getTime() + 90 * DAY_MS);

      if (Number.isNaN(scheduledDate.getTime())) {
        reasons.push({
          type: "schedule",
          message: "Invalid schedule date",
          severity: "error",
        });
      } else if (scheduledDate.getTime() <= now.getTime()) {
        reasons.push({
          type: "schedule",
          message: "Scheduled transfers must be set to a future date/time",
          severity: "error",
        });
      } else if (scheduledDate.getTime() > maxScheduleDate.getTime()) {
        reasons.push({
          type: "schedule",
          message: "Scheduled date must be within the next 90 days",
          severity: "error",
        });
      }
    }

    // Check transfer limits
    const sender = await User.findById(senderId);
    const limits = await getOrCreateTransferLimits(senderId, sender);
    if (limits) {
      const limitCheck = limits.canTransfer(transferAmount);
      if (!limitCheck.allowed) {
        reasons.push({
          type: "limit",
          message: limitCheck.reason,
          severity: "error",
        });
      }
    }

    const insights = await buildSmartTransferInsights({
      senderId,
      receiverId,
      amount: transferAmount,
      senderBalance,
      limits,
      description,
    });

    const preferredPhone = normalizePhoneNumber(sender?.transferOtpProfile?.phoneNumber || sender?.phone);
    const otpDeliveryHint =
      !EFFECTIVE_OTP_EMAIL_ONLY_MODE && preferredPhone && isValidPhoneNumber(preferredPhone)
        ? "sms"
        : "email";

    const canTransfer = reasons.filter((r) => r.severity === "error").length === 0;

    if (insights.risk.level === "high") {
      reasons.push({
        type: "risk",
        message: "High-risk transfer detected. Additional verification is recommended.",
        severity: "warning",
      });
    }

    res.json({
      canTransfer,
      reasons,
      risk: insights.risk,
      impact: insights.impact,
      requiresOtp: true,
      otpDeliveryHint,
      suggestions: canTransfer
        ? insights.suggestions
        : [
          senderBalance < transferAmount ? "Add funds to your account" : null,
          "Try a smaller amount",
          "Check your daily/monthly limits",
          ...insights.suggestions,
        ].filter(Boolean),
    });
  } catch (error) {
    console.error("Check feasibility error:", error);
    res.status(500).json({ message: "Error checking transfer feasibility" });
  }
};

/**
 * @desc    Initiate a transfer
 * @route   POST /api/transfers/initiate
 * @access  Private
 */
export const initiateTransfer = async (req, res) => {
  try {
    const { receiverIdentifier, amount, description, scheduledFor, otpSessionId, otpCode, saveRecipient } = req.body;
    const senderId = req.user._id;
    const transferAmount = toAmount(amount);

    // Validation
    if (!receiverIdentifier || !transferAmount) {
      return res.status(400).json({ message: "Receiver and amount are required" });
    }

    if (transferAmount <= 0) {
      return res.status(400).json({ message: "Amount must be greater than 0" });
    }

    let scheduledDate = null;
    if (scheduledFor) {
      scheduledDate = new Date(scheduledFor);
      const now = new Date();
      const maxScheduleDate = new Date(now.getTime() + 90 * DAY_MS);

      if (Number.isNaN(scheduledDate.getTime())) {
        return res.status(400).json({ message: "Invalid schedule date" });
      }

      if (scheduledDate.getTime() <= now.getTime()) {
        return res.status(400).json({ message: "Scheduled transfers must be set to a future date/time" });
      }

      if (scheduledDate.getTime() > maxScheduleDate.getTime()) {
        return res.status(400).json({ message: "Scheduled date must be within the next 90 days" });
      }
    }

    // Find receiver
    const receiver = await User.findOne({
      $or: [
        { email: receiverIdentifier },
        { _id: mongoose.Types.ObjectId.isValid(receiverIdentifier) ? receiverIdentifier : null },
      ],
    });

    if (!receiver) {
      return res.status(404).json({ message: "Receiver not found" });
    }

    // Check not sending to self
    if (receiver._id.toString() === senderId.toString()) {
      return res.status(400).json({ message: "Cannot transfer to yourself" });
    }

    // Get sender info
    const sender = await User.findById(senderId);

    // Check balance
    const senderBalance = await calculateUserBalance(senderId);
    if (senderBalance < transferAmount) {
      return res.status(400).json({
        message: "Insufficient balance",
        available: senderBalance,
        required: transferAmount,
      });
    }

    // Check transfer limits
    const limits = await getOrCreateTransferLimits(senderId, sender);
    if (limits) {
      const limitCheck = limits.canTransfer(transferAmount);
      if (!limitCheck.allowed) {
        return res.status(403).json({ message: limitCheck.reason });
      }
    }

    const intelligence = await buildSmartTransferInsights({
      senderId,
      receiverId: receiver._id,
      amount: transferAmount,
      senderBalance,
      limits,
      description,
    });

    if (!otpSessionId || !otpCode) {
      return res.status(400).json({
        message: "Verification code is required to confirm transfer",
        requiresOtp: true,
      });
    }

    const otpCheck = await verifyOtpSessionCode({
      userId: senderId,
      otpSessionId,
      otpCode,
    });

    if (!otpCheck.valid) {
      return res.status(401).json({
        message: otpCheck.message || "Invalid verification code",
        requiresOtp: true,
      });
    }

    // Calculate fee (if applicable)
    const fee = 0; // No fee for now
    const netAmount = transferAmount - fee;

    // Create transfer record
    const transfer = await Transfer.create({
      sender: {
        userId: sender._id,
        userName: sender.name,
        userEmail: sender.email,
      },
      receiver: {
        userId: receiver._id,
        userName: receiver.name,
        userEmail: receiver.email,
      },
      amount: transferAmount,
      currency: sender.currency || "USD",
      fee,
      netAmount,
      status: scheduledDate ? "pending" : "initiated",
      description: description || "",
      scheduledFor: scheduledDate,
      processingMode: scheduledDate ? "scheduled" : "instant",
      riskScore: intelligence.risk.score,
      riskLevel: intelligence.risk.level,
      intelligenceSnapshot: intelligence,
      senderBalanceAtTransfer: senderBalance,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
      deviceType: "web",
    });

    if (!scheduledDate) {
      // Automatically process instant transfer
      await processTransferInternal(transfer._id);
    }

    // Fetch updated transfer
    const updatedTransfer = await Transfer.findById(transfer._id);

    await upsertSavedRecipient({
      senderId,
      receiver,
      saveRecipient: Boolean(saveRecipient),
    });

    res.status(201).json({
      transferId: updatedTransfer._id,
      status: updatedTransfer.status,
      sender: updatedTransfer.sender,
      receiver: updatedTransfer.receiver,
      amount: updatedTransfer.amount,
      fee: updatedTransfer.fee,
      netAmount: updatedTransfer.netAmount,
      risk: {
        score: updatedTransfer.riskScore || intelligence.risk.score,
        level: updatedTransfer.riskLevel || intelligence.risk.level,
      },
      scheduledFor: updatedTransfer.scheduledFor || null,
      estimatedCompletion: updatedTransfer.scheduledFor || new Date(),
      message: scheduledDate ? "Transfer scheduled successfully" : "Transfer completed successfully",
    });
  } catch (error) {
    console.error("Initiate transfer error:", error);
    res.status(500).json({ message: error.message || "Error initiating transfer" });
  }
};

/**
 * @desc    Process a transfer (internal function)
 * @access  Private (called internally)
 */
const processTransferInternal = async (transferId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const transfer = await Transfer.findById(transferId).session(session);

    if (!transfer) {
      throw new Error("Transfer not found");
    }

    if (!["initiated", "pending"].includes(transfer.status)) {
      throw new Error("Transfer already processed");
    }

    if (transfer.status === "pending" && transfer.scheduledFor) {
      const now = new Date();
      if (new Date(transfer.scheduledFor).getTime() > now.getTime()) {
        throw new Error("Scheduled transfer is not due yet");
      }
    }

    // Update transfer status
    transfer.status = "processing";
    await transfer.save({ session });

    // Verify sender balance again
    const senderBalance = await calculateUserBalance(transfer.sender.userId);
    if (senderBalance < transfer.amount) {
      transfer.status = "failed";
      transfer.failureReason = "Insufficient balance at processing time";
      await transfer.save({ session });
      await session.commitTransaction();
      return;
    }

    // Update sender's wallet (deduct funds)
    const senderWallet = await Wallet.findOne({ user: transfer.sender.userId }).session(session);
    if (!senderWallet) {
      throw new Error("Sender wallet not found");
    }
    senderWallet.balance -= transfer.amount;
    senderWallet.lastTransactionAt = new Date();
    await senderWallet.save({ session });

    // Update receiver's wallet (add funds)
    let receiverWallet = await Wallet.findOne({ user: transfer.receiver.userId }).session(session);
    if (!receiverWallet) {
      // Create wallet for receiver if doesn't exist
      receiverWallet = await Wallet.create(
        [
          {
            user: transfer.receiver.userId,
            balance: transfer.netAmount,
            currency: "USD",
            status: "active",
            lastTransactionAt: new Date(),
          },
        ],
        { session }
      );
      receiverWallet = receiverWallet[0];
    } else {
      receiverWallet.balance += transfer.netAmount;
      receiverWallet.lastTransactionAt = new Date();
      await receiverWallet.save({ session });
    }

    // Create sender transaction (debit)
    const senderTransaction = await Transaction.create(
      [
        {
          user: transfer.sender.userId,
          type: "expense",
          category: "wallet_transfer_sent",
          amount: transfer.amount,
          note: `Transfer to ${transfer.receiver.userName}: ${transfer.description}`,
          date: new Date(),
          isTransfer: true,
          transferId: transfer._id,
          transferDirection: "sent",
          scope: "wallet",
          systemManaged: true,
        },
      ],
      { session }
    );

    // Create receiver transaction (credit)
    const receiverTransaction = await Transaction.create(
      [
        {
          user: transfer.receiver.userId,
          type: "income",
          category: "wallet_transfer_received",
          amount: transfer.netAmount,
          note: `Transfer from ${transfer.sender.userName}: ${transfer.description}`,
          date: new Date(),
          isTransfer: true,
          transferId: transfer._id,
          transferDirection: "received",
          scope: "wallet",
          systemManaged: true,
        },
      ],
      { session }
    );

    // Update transfer with transaction references
    transfer.senderTransactionId = senderTransaction[0]._id;
    transfer.receiverTransactionId = receiverTransaction[0]._id;
    transfer.status = "completed";
    transfer.processedAt = new Date();
    await transfer.save({ session });

    // Update user transfer stats
    await User.findByIdAndUpdate(
      transfer.sender.userId,
      {
        $inc: {
          "transferStats.totalSent": transfer.amount,
          "transferStats.transferCount": 1,
        },
        $set: {
          "transferStats.lastTransferDate": new Date(),
        },
      },
      { session }
    );

    await User.findByIdAndUpdate(
      transfer.receiver.userId,
      {
        $inc: {
          "transferStats.totalReceived": transfer.netAmount,
        },
      },
      { session }
    );

    // Update transfer limits
    const limits = await TransferLimit.findOne({ user: transfer.sender.userId }).session(session);
    if (limits) {
      await limits.recordUsage(transfer.amount);
    }

    // Commit transaction
    await session.commitTransaction();

    // Send notifications (outside transaction)
    await sendTransferNotifications(transfer);
  } catch (error) {
    await session.abortTransaction();
    console.error("Process transfer error:", error);

    // Update transfer as failed
    await Transfer.findByIdAndUpdate(transferId, {
      status: "failed",
      failureReason: error.message,
      errorCode: "PROCESSING_ERROR",
    });

    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * @desc    Process a transfer manually
 * @route   POST /api/transfers/:transferId/process
 * @access  Private (Admin or System)
 */
export const processTransfer = async (req, res) => {
  try {
    const { transferId } = req.params;

    await processTransferInternal(transferId);

    const transfer = await Transfer.findById(transferId);

    res.json({
      transferId: transfer._id,
      status: transfer.status,
      senderTransactionId: transfer.senderTransactionId,
      receiverTransactionId: transfer.receiverTransactionId,
      completedAt: transfer.processedAt,
    });
  } catch (error) {
    console.error("Process transfer error:", error);
    res.status(500).json({ message: error.message || "Error processing transfer" });
  }
};

/**
 * @desc    Get transfer details
 * @route   GET /api/transfers/:transferId
 * @access  Private (sender or receiver only)
 */
export const getTransferDetails = async (req, res) => {
  try {
    const { transferId } = req.params;
    const userId = req.user._id;

    const transfer = await Transfer.findById(transferId)
      .populate("senderTransactionId")
      .populate("receiverTransactionId");

    if (!transfer) {
      return res.status(404).json({ message: "Transfer not found" });
    }

    // Check authorization
    const isSender = transfer.sender.userId.toString() === userId.toString();
    const isReceiver = transfer.receiver.userId.toString() === userId.toString();

    if (!isSender && !isReceiver) {
      return res.status(403).json({ message: "Unauthorized to view this transfer" });
    }

    res.json({ transfer });
  } catch (error) {
    console.error("Get transfer details error:", error);
    res.status(500).json({ message: "Error fetching transfer details" });
  }
};

/**
 * @desc    Get my transfers
 * @route   GET /api/transfers/my-transfers
 * @access  Private
 */
export const getMyTransfers = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      type = "all",
      status = "all",
      page = 1,
      limit = 20,
      startDate,
      endDate,
      sortBy = "date",
      sortOrder = "desc",
    } = req.query;

    // Build query
    let query = {};

    // Filter by type (sent/received/all)
    if (type === "sent") {
      query["sender.userId"] = userId;
    } else if (type === "received") {
      query["receiver.userId"] = userId;
    } else {
      // All transfers
      query.$or = [{ "sender.userId": userId }, { "receiver.userId": userId }];
    }

    // Filter by status
    if (status !== "all") {
      query.status = status;
    }

    // Filter by date range
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Sorting
    const sortField = sortBy === "amount" ? "amount" : "createdAt";
    const sortDirection = sortOrder === "asc" ? 1 : -1;

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 100);
    const skip = (pageNum - 1) * limitNum;

    // Execute query
    const transfers = await Transfer.find(query)
      .sort({ [sortField]: sortDirection })
      .skip(skip)
      .limit(limitNum);

    const totalTransfers = await Transfer.countDocuments(query);
    const totalPages = Math.ceil(totalTransfers / limitNum);

    // Calculate summary
    const sentTransfers = await Transfer.find({
      "sender.userId": userId,
      status: "completed",
    });
    const receivedTransfers = await Transfer.find({
      "receiver.userId": userId,
      status: "completed",
    });

    const totalSent = sentTransfers.reduce((sum, t) => sum + t.amount, 0);
    const totalReceived = receivedTransfers.reduce((sum, t) => sum + t.netAmount, 0);
    const totalFees = sentTransfers.reduce((sum, t) => sum + t.fee, 0);
    const transferCount = sentTransfers.length + receivedTransfers.length;

    res.json({
      transfers,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalTransfers,
        hasMore: pageNum < totalPages,
      },
      stats: {
        totalSent,
        totalReceived,
        totalFees,
        transferCount,
      },
      summary: {
        totalSent,
        totalReceived,
        totalFees,
        transferCount,
      },
    });
  } catch (error) {
    console.error("Get my transfers error:", error);
    res.status(500).json({ message: "Error fetching transfers" });
  }
};

/**
 * @desc    Cancel a transfer
 * @route   POST /api/transfers/:transferId/cancel
 * @access  Private (sender only)
 */
export const cancelTransfer = async (req, res) => {
  try {
    const { transferId } = req.params;
    const { reason } = req.body;
    const userId = req.user._id;

    const transfer = await Transfer.findById(transferId);

    if (!transfer) {
      return res.status(404).json({ message: "Transfer not found" });
    }

    // Check authorization
    if (transfer.sender.userId.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Only sender can cancel transfer" });
    }

    // Check if cancellable
    if (!transfer.canBeCancelled()) {
      return res.status(400).json({
        message: "Transfer cannot be cancelled",
        status: transfer.status,
      });
    }

    // Update transfer status
    transfer.status = "cancelled";
    transfer.failureReason = reason || "Cancelled by sender";
    await transfer.save();

    res.json({
      message: "Transfer cancelled successfully",
      transferId: transfer._id,
      refundAmount: transfer.fee,
    });
  } catch (error) {
    console.error("Cancel transfer error:", error);
    res.status(500).json({ message: "Error cancelling transfer" });
  }
};

/**
 * @desc    Reverse a transfer
 * @route   POST /api/transfers/:transferId/reverse
 * @access  Private (sender or admin)
 */
export const reverseTransfer = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { transferId } = req.params;
    const { reason, transferPin } = req.body;
    const userId = req.user._id;

    if (!reason) {
      return res.status(400).json({ message: "Reason is required for reversal" });
    }

    const transfer = await Transfer.findById(transferId).session(session);

    if (!transfer) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Transfer not found" });
    }

    // Check authorization
    const isSender = transfer.sender.userId.toString() === userId.toString();
    const isAdmin = req.user.role === "admin" || req.user.role === "super_admin";

    if (!isSender && !isAdmin) {
      await session.abortTransaction();
      return res.status(403).json({ message: "Unauthorized to reverse this transfer" });
    }

    // Check if reversible
    if (!transfer.canBeReversed()) {
      await session.abortTransaction();
      return res.status(400).json({
        message: "Transfer cannot be reversed",
        reason: transfer.status !== "completed" ? "Transfer not completed" : "Reversal deadline passed",
      });
    }

    // Verify PIN for user reversal
    if (isSender) {
      if (!transferPin) {
        await session.abortTransaction();
        return res.status(400).json({ message: "Transfer PIN required for reversal" });
      }

      const userWithPin = await User.findById(userId).select("+transferPin");
      const isPinValid = await bcrypt.compare(transferPin, userWithPin.transferPin);

      if (!isPinValid) {
        await session.abortTransaction();
        return res.status(401).json({ message: "Invalid transfer PIN" });
      }
    }

    // Update wallets (reverse the transfer)
    // Return money to sender
    const senderWallet = await Wallet.findOne({ user: transfer.sender.userId }).session(session);
    if (senderWallet) {
      senderWallet.balance += transfer.amount;
      senderWallet.lastTransactionAt = new Date();
      await senderWallet.save({ session });
    }

    // Deduct money from receiver
    const receiverWallet = await Wallet.findOne({ user: transfer.receiver.userId }).session(session);
    if (receiverWallet) {
      receiverWallet.balance -= transfer.netAmount;
      receiverWallet.lastTransactionAt = new Date();
      await receiverWallet.save({ session });
    }

    // Create reversal transactions
    await Transaction.create(
      [
        {
          user: transfer.sender.userId,
          type: "income",
          category: "wallet_transfer_reversal_in",
          amount: transfer.amount,
          note: `Reversal of transfer to ${transfer.receiver.userName}: ${reason}`,
          date: new Date(),
          isTransfer: true,
          transferId: transfer._id,
          transferDirection: "received",
          scope: "wallet",
          systemManaged: true,
        },
      ],
      { session }
    );

    await Transaction.create(
      [
        {
          user: transfer.receiver.userId,
          type: "expense",
          category: "wallet_transfer_reversal_out",
          amount: transfer.netAmount,
          note: `Reversal of transfer from ${transfer.sender.userName}: ${reason}`,
          date: new Date(),
          isTransfer: true,
          transferId: transfer._id,
          transferDirection: "sent",
          scope: "wallet",
          systemManaged: true,
        },
      ],
      { session }
    );

    // Update transfer status
    transfer.status = "reversed";
    transfer.reversedAt = new Date();
    transfer.reversalReason = reason;
    transfer.reversalInitiatedBy = userId;
    await transfer.save({ session });

    await session.commitTransaction();

    res.json({
      message: "Transfer reversed successfully",
      transferId: transfer._id,
      newTransferStatus: "reversed",
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Reverse transfer error:", error);
    res.status(500).json({ message: "Error reversing transfer" });
  } finally {
    session.endSession();
  }
};

// ========== Helper Functions ==========

/**
 * Calculate user's current balance from wallet
 */
const calculateUserBalance = async (userId) => {
  // Get balance from wallet instead of calculating from transactions
  const wallet = await Wallet.findOne({ user: userId });

  if (!wallet) {
    // If wallet doesn't exist, create one with 0 balance
    const newWallet = await Wallet.create({
      user: userId,
      balance: 0,
      currency: "USD",
      status: "active",
    });
    return newWallet.balance;
  }

  return wallet.availableBalance || wallet.balance;
};

/**
 * Mask email for privacy
 */
const maskEmail = (email) => {
  if (!email) return "";
  const [local, domain] = email.split("@");
  const maskedLocal = local.charAt(0) + "***" + local.charAt(local.length - 1);
  return `${maskedLocal}@${domain}`;
};

/**
 * Send transfer notifications
 */
const sendTransferNotifications = async (transfer) => {
  try {
    // Notification for sender
    await createNotification({
      userId: transfer.sender.userId,
      type: "transfer_sent",
      title: "Transfer Completed",
      message: `You sent $${transfer.amount.toFixed(2)} to ${transfer.receiver.userName}`,
      data: { transferId: transfer._id },
    });

    // Notification for receiver
    await createNotification({
      userId: transfer.receiver.userId,
      type: "transfer_received",
      title: "Money Received",
      message: `You received $${transfer.netAmount.toFixed(2)} from ${transfer.sender.userName}`,
      data: { transferId: transfer._id },
    });
  } catch (error) {
    console.error("Send notifications error:", error);
    // Don't throw - notifications are non-critical
  }
};
