import User from "../models/User.js";
import Budget from "../models/Budget.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { OAuth2Client } from "google-auth-library";
import { generateResetToken } from "../utils/generateResetToken.js";

/* =========================
   GUEST DATA STORE
========================= */
// In-memory storage for guest user data
export const guestStore = new Map();

const VALID_EXPENSE_START_MODES = new Set(["include_existing", "start_from_now"]);
const ACTIVE_BUDGET_FILTER = { $ne: false };
const MIN_BUDGET_PERIOD_DAYS = 1;
const MAX_BUDGET_PERIOD_DAYS = 365;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const PRIVACY_SESSION_TIMEOUT_VALUES = new Set(["15", "30", "60", "120"]);
const VALID_INACTIVITY_REMINDER_INTERVALS = new Set([
  "2hours",
  "4hours",
  "6hours",
  "12hours",
  "24hours",
  "1day",
  "2days",
]);
const DEFAULT_NOTIFICATION_SETTINGS = {
  emailNotifications: true,
  pushNotifications: false,
  budgetAlerts: true,
  billReminders: true,
  weeklyReports: true,
  transactionAlerts: true,
  goalUpdates: true,
  budgetEmailAlerts: true,
  transactionInactivityReminders: false,
  inactivityReminderInterval: "1day",
};

const normalizeInactivityReminderInterval = (value) => {
  if (typeof value !== "string") {
    return DEFAULT_NOTIFICATION_SETTINGS.inactivityReminderInterval;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "24hours") {
    return "1day";
  }

  return VALID_INACTIVITY_REMINDER_INTERVALS.has(normalized)
    ? normalized
    : DEFAULT_NOTIFICATION_SETTINGS.inactivityReminderInterval;
};

const sanitizeNotificationSettings = (incomingSettings, existingSettings) => {
  const mergedSettings = {
    ...DEFAULT_NOTIFICATION_SETTINGS,
    ...(existingSettings || {}),
    ...(incomingSettings || {}),
  };

  const normalizedBudgetEmailAlerts = Boolean(
    mergedSettings.budgetEmailAlerts ?? mergedSettings.budgetAlerts
  );

  return {
    emailNotifications: Boolean(mergedSettings.emailNotifications),
    pushNotifications: Boolean(mergedSettings.pushNotifications),
    // Keep legacy and advanced flags in sync so there is a single source of truth.
    budgetAlerts: normalizedBudgetEmailAlerts,
    billReminders: Boolean(mergedSettings.billReminders),
    weeklyReports: Boolean(mergedSettings.weeklyReports),
    transactionAlerts: Boolean(mergedSettings.transactionAlerts),
    goalUpdates: Boolean(mergedSettings.goalUpdates),
    budgetEmailAlerts: normalizedBudgetEmailAlerts,
    transactionInactivityReminders: Boolean(mergedSettings.transactionInactivityReminders),
    inactivityReminderInterval: normalizeInactivityReminderInterval(
      mergedSettings.inactivityReminderInterval
    ),
  };
};

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }
  return secret;
};

const issueAccessToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    getJwtSecret(),
    { expiresIn: "7d" }
  );
};

const getMailTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error("Email service is not configured");
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

const generateTwoFactorCode = () => {
  return String(Math.floor(100000 + Math.random() * 900000));
};

const clearTwoFactorChallenge = (user) => {
  user.twoFactorLoginCodeHash = undefined;
  user.twoFactorLoginCodeExpires = undefined;
};

const clearTwoFactorTrustedDevices = (user) => {
  if (typeof user?.set === "function") {
    user.set("twoFactorTrustedDevices", []);
    return;
  }

  user.twoFactorTrustedDevices = [];
};

const normalizeRequestIp = (req) => {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string" && forwardedFor.trim()) {
    return forwardedFor.split(",")[0].trim();
  }

  return req.ip || "Unknown IP";
};

const sendLoginNotificationEmail = async ({ user, req }) => {
  if (!user?.privacySettings?.loginNotifications) {
    return;
  }

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn("⚠️ Email service is not configured. Skipping login notification email.");
    return;
  }

  const transporter = getMailTransporter();
  const ipAddress = normalizeRequestIp(req);
  const userAgent = req.headers["user-agent"] || "Unknown device";
  const timestamp = new Date().toISOString();

  await transporter.sendMail({
    from: `"SFT - Smart Financial Tracker" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: "New login to your account",
    html: `
      <p>Hello ${user.name || "there"},</p>
      <p>We detected a new login to your account.</p>
      <ul>
        <li><strong>Time:</strong> ${timestamp}</li>
        <li><strong>IP address:</strong> ${ipAddress}</li>
        <li><strong>Device:</strong> ${userAgent}</li>
      </ul>
      <p>If this was not you, please change your password immediately.</p>
    `,
  });
};

const buildAuthenticatedUserResponse = (user, token, extras = {}) => {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    currency: user.currency || "LKR",
    monthlySalary: user.monthlySalary,
    savingsPercentage: user.savingsPercentage,
    expenseStartMode: user.expenseStartMode || "include_existing",
    expenseStartDate: user.expenseStartDate || null,
    budgetPeriodDays: Number(user.budgetPeriodDays) || 30,
    budgetPeriodStartDate: user.budgetPeriodStartDate || null,
    budgetPeriodEndDate: resolveBudgetPeriodEndDate(user.budgetPeriodStartDate, user.budgetPeriodDays),
    privacySettings: user.privacySettings,
    token,
    ...extras,
  };
};

const normalizeExpenseStartMode = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const normalized = String(value).trim().toLowerCase();
  if (!VALID_EXPENSE_START_MODES.has(normalized)) {
    return null;
  }

  return normalized;
};

const toStartOfDay = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const parseBudgetDateInput = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const normalized = String(value).trim();
  const dateOnlyMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (dateOnlyMatch) {
    const year = Number(dateOnlyMatch[1]);
    const month = Number(dateOnlyMatch[2]);
    const day = Number(dateOnlyMatch[3]);
    const parsed = new Date(year, month - 1, day, 0, 0, 0, 0);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const calculateInclusivePeriodDays = (startDate, endDate) => {
  const normalizedStart = toStartOfDay(startDate);
  const normalizedEnd = toStartOfDay(endDate);
  const diffMs = normalizedEnd.getTime() - normalizedStart.getTime();
  return Math.floor(diffMs / MS_PER_DAY) + 1;
};

const resolveBudgetPeriodEndDate = (startDate, periodDays) => {
  const normalizedStart = parseBudgetDateInput(startDate);
  const parsedDays = Number(periodDays);

  if (!normalizedStart || !Number.isFinite(parsedDays) || parsedDays < 1) {
    return null;
  }

  const endDate = new Date(toStartOfDay(normalizedStart).getTime() + (Math.round(parsedDays) - 1) * MS_PER_DAY);
  return endDate;
};

/* =========================
   REGISTER
========================= */
export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const strongPassword =
      password.length >= 8 &&
      /[a-zA-Z]/.test(password) &&
      /\d/.test(password);

    if (!strongPassword) {
      return res.status(400).json({
        message:
          "Password must be at least 8 characters long, and contain both letters and numbers",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* =========================
   LOGIN
========================= */
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const userQuery = User.findOne({ email });
    const user = typeof userQuery?.select === "function"
      ? await userQuery.select("+password")
      : await userQuery;
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // 2FA has been removed from account login flow; force-disable any stored legacy state.
    user.privacySettings = {
      ...(user.privacySettings || {}),
      twoFactorAuth: false,
    };
    clearTwoFactorChallenge(user);
    clearTwoFactorTrustedDevices(user);
    if (typeof user.save === "function") {
      await user.save();
    }

    const token = issueAccessToken(user);

    void sendLoginNotificationEmail({ user, req }).catch((mailError) => {
      console.error("Login notification email failed:", mailError);
    });

    res.json(buildAuthenticatedUserResponse(user, token));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* =========================
   GOOGLE LOGIN
========================= */
const googleOAuthClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ message: "Credential token is required" });
    }

    // Verify Google ID Token
    const ticket = await googleOAuthClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      return res.status(400).json({ message: "Invalid token payload" });
    }

    const { email, name, picture, sub: googleId } = payload;

    // Check if user exists in our DB
    let user = await User.findOne({ email });

    if (!user) {
      // Create new user (automatically register)
      const randomPassword = crypto.randomBytes(32).toString("hex");
      const hashedPassword = await bcrypt.hash(randomPassword, 10);
      
      user = await User.create({
        name: name || email.split("@")[0],
        email,
        password: hashedPassword,
        googleId,
        profilePicture: picture || "",
      });
    } else {
      // Link Google ID if not already linked
      if (!user.googleId) {
        user.googleId = googleId;
        if (picture && !user.profilePicture) {
          user.profilePicture = picture;
        }
        await user.save();
      }
    }

    // Issue standard Access Token
    const token = issueAccessToken(user);

    // Send login notification email if enabled
    void sendLoginNotificationEmail({ user, req }).catch((mailError) => {
      console.error("Google login notification email failed:", mailError);
    });

    res.json(buildAuthenticatedUserResponse(user, token));
  } catch (error) {
    console.error("Google login error:", error);
    res.status(400).json({ message: "Google authentication failed: " + error.message });
  }
};

/* =========================
   FORGOT PASSWORD (PHASE 4.2)
========================= */
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    // Do not reveal user existence
    if (!user) {
      return res.json({
        message: "If the email exists, a reset link will be sent",
      });
    }

    const { resetToken, hashedToken, expires } = generateResetToken();

    user.resetPasswordToken = hashedToken;
    // Ensure expires is properly typed as Date
    user.resetPasswordExpires = new Date(Number(expires));
    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.warn("⚠️ Email service is not configured. Skipping password reset email sending.");
      return res.json({
        message: "If the email exists, a reset link will be sent (SMTP not configured)",
      });
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"SFT - Smart Financial Tracker" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "Reset Your Password",
      html: `
        <p>You requested a password reset.</p>
        <p>Click the link below to reset your password:</p>
        <a href="${resetUrl}">${resetUrl}</a>
        <p>This link expires in 15 minutes.</p>
      `,
    });

    res.json({
      message: "If the email exists, a reset link will be sent",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Email could not be sent" });
  }
};

/* =========================
   RESET PASSWORD
========================= */
export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    // 🔐 Backend password validation
    const strongPassword =
      newPassword.length >= 8 &&
      /[a-zA-Z]/.test(newPassword) &&
      /\d/.test(newPassword);

    if (!strongPassword) {
      return res.status(400).json({
        message:
          "Password must be at least 8 characters long, and contain both letters and numbers",
      });
    }

    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        message: "Invalid or expired reset token",
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    res.json({ message: "Password reset successful" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* =========================
   GET USER PROFILE
========================= */
export const getUserProfile = async (req, res) => {
  try {
    // GUEST USER - Return guest profile
    if (req.user.isGuest) {
      const guestData = guestStore.get(req.user.id);
      
      return res.json({ 
        user: {
          _id: req.user.id,
          name: "Guest User",
          email: "guest@example.com",
          phone: "",
          bio: "",
          profilePicture: "",
          currency: guestData?.settings?.currency || "USD",
          monthlySalary: null,
          savingsPercentage: null,
          expenseStartMode: "include_existing",
          expenseStartDate: null,
          budgetPeriodDays: 30,
          budgetPeriodStartDate: null,
          budgetPeriodEndDate: null,
          isGuest: true
        }
      });
    }

    // AUTHENTICATED USER - Database lookup
    const userId = req.user._id;

    const user = await User.findById(userId).select('-password -resetPasswordToken -resetPasswordExpires');

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ 
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        bio: user.bio,
        profilePicture: user.profilePicture,
        currency: user.currency,
        monthlySalary: user.monthlySalary,
        savingsPercentage: user.savingsPercentage,
        expenseStartMode: user.expenseStartMode || "include_existing",
        expenseStartDate: user.expenseStartDate || null,
        budgetPeriodDays: Number(user.budgetPeriodDays) || 30,
        budgetPeriodStartDate: user.budgetPeriodStartDate || null,
        budgetPeriodEndDate: resolveBudgetPeriodEndDate(user.budgetPeriodStartDate, user.budgetPeriodDays),
        notificationSettings: user.notificationSettings,
        privacySettings: user.privacySettings,
        accountNumber: user.accountNumber,
        isGuest: false
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* =========================
   UPDATE CURRENCY
========================= */
export const updateCurrency = async (req, res) => {
  try {
    const { currency } = req.body;
    const userId = req.user._id;

    const validCurrencies = ["LKR", "USD", "EUR", "GBP", "INR", "AUD", "CAD", "SGD", "JPY", "CNY"];
    
    if (!currency || !validCurrencies.includes(currency)) {
      return res.status(400).json({ message: "Invalid currency" });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { currency },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ 
      message: "Currency updated successfully",
      currency: user.currency
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* =========================
   UPDATE BUDGET SETTINGS
========================= */
export const updateBudgetSettings = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      monthlySalary,
      savingsPercentage,
      currency,
      expenseStartMode,
      budgetPeriodDays,
      budgetPeriodStartDate,
      budgetPeriodEndDate,
    } = req.body;

    if (
      monthlySalary === undefined &&
      savingsPercentage === undefined &&
      currency === undefined &&
      expenseStartMode === undefined &&
      budgetPeriodDays === undefined &&
      budgetPeriodStartDate === undefined &&
      budgetPeriodEndDate === undefined
    ) {
      return res.status(400).json({ message: "No budget settings provided" });
    }

    const existingUser = await User.findById(userId)
      .select("monthlySalary savingsPercentage");

    if (!existingUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const updateData = {};

    if (monthlySalary !== undefined) {
      const parsedSalary = Number(monthlySalary);
      if (!Number.isFinite(parsedSalary) || parsedSalary <= 0) {
        return res.status(400).json({ message: "Monthly salary must be a positive number" });
      }
      updateData.monthlySalary = parsedSalary;
    }

    if (savingsPercentage !== undefined) {
      const parsedSavingsPercentage = Number(savingsPercentage);
      if (!Number.isFinite(parsedSavingsPercentage) || parsedSavingsPercentage < 0 || parsedSavingsPercentage >= 100) {
        return res.status(400).json({ message: "Savings percentage must be between 0 and less than 100" });
      }
      updateData.savingsPercentage = parsedSavingsPercentage;
    }

    if (currency !== undefined) {
      const validCurrencies = ["LKR", "USD", "EUR", "GBP", "INR", "AUD", "CAD", "SGD", "JPY", "CNY"];
      if (!validCurrencies.includes(currency)) {
        return res.status(400).json({ message: "Invalid currency" });
      }
      updateData.currency = currency;
    }

    if (expenseStartMode !== undefined) {
      const normalizedExpenseStartMode = normalizeExpenseStartMode(expenseStartMode);
      if (!normalizedExpenseStartMode) {
        return res.status(400).json({
          message: "Expense start mode must be either include_existing or start_from_now",
        });
      }

      updateData.expenseStartMode = normalizedExpenseStartMode;
      updateData.expenseStartDate =
        normalizedExpenseStartMode === "start_from_now" ? new Date() : null;
    }

    const hasExplicitBudgetRange = budgetPeriodStartDate !== undefined || budgetPeriodEndDate !== undefined;

    if (hasExplicitBudgetRange) {
      if (budgetPeriodStartDate === undefined || budgetPeriodEndDate === undefined) {
        return res.status(400).json({
          message: "Provide both budget period start and end dates",
        });
      }

      const parsedStartDate = parseBudgetDateInput(budgetPeriodStartDate);
      const parsedEndDate = parseBudgetDateInput(budgetPeriodEndDate);

      if (!parsedStartDate || !parsedEndDate) {
        return res.status(400).json({
          message: "Budget period start and end dates must be valid dates",
        });
      }

      const normalizedStartDate = toStartOfDay(parsedStartDate);
      const normalizedEndDate = toStartOfDay(parsedEndDate);

      if (normalizedStartDate.getTime() > normalizedEndDate.getTime()) {
        return res.status(400).json({
          message: "Budget period start date must be before or equal to end date",
        });
      }

      const derivedPeriodDays = calculateInclusivePeriodDays(normalizedStartDate, normalizedEndDate);

      if (
        derivedPeriodDays < MIN_BUDGET_PERIOD_DAYS ||
        derivedPeriodDays > MAX_BUDGET_PERIOD_DAYS
      ) {
        return res.status(400).json({
          message: `Budget period range must be between ${MIN_BUDGET_PERIOD_DAYS} and ${MAX_BUDGET_PERIOD_DAYS} days`,
        });
      }

      updateData.budgetPeriodStartDate = normalizedStartDate;
      updateData.budgetPeriodDays = derivedPeriodDays;
    } else if (budgetPeriodDays !== undefined) {
      const parsedBudgetPeriodDays = Number(budgetPeriodDays);
      const isValidIntegerPeriod = Number.isInteger(parsedBudgetPeriodDays);

      if (
        !Number.isFinite(parsedBudgetPeriodDays) ||
        !isValidIntegerPeriod ||
        parsedBudgetPeriodDays < MIN_BUDGET_PERIOD_DAYS ||
        parsedBudgetPeriodDays > MAX_BUDGET_PERIOD_DAYS
      ) {
        return res.status(400).json({
          message: `Budget period days must be an integer between ${MIN_BUDGET_PERIOD_DAYS} and ${MAX_BUDGET_PERIOD_DAYS}`,
        });
      }

      updateData.budgetPeriodDays = parsedBudgetPeriodDays;
      updateData.budgetPeriodStartDate = new Date();
    }

    const effectiveSalary = updateData.monthlySalary !== undefined
      ? Number(updateData.monthlySalary)
      : Number(existingUser.monthlySalary);
    const effectiveSavingsPercentage = updateData.savingsPercentage !== undefined
      ? Number(updateData.savingsPercentage)
      : Number(existingUser.savingsPercentage);

    if (Number.isFinite(effectiveSalary) && effectiveSalary > 0 && Number.isFinite(effectiveSavingsPercentage)) {
      const projectedSavingsAmount = effectiveSalary * (effectiveSavingsPercentage / 100);
      const projectedUsableBudget = effectiveSalary - projectedSavingsAmount;

      if (projectedUsableBudget <= 0) {
        return res.status(400).json({
          message: "Usable budget must be greater than 0. Reduce savings percentage or increase salary.",
        });
      }
    }

    const user = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
    }).select(
      "monthlySalary savingsPercentage currency expenseStartMode expenseStartDate budgetPeriodDays budgetPeriodStartDate"
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (expenseStartMode !== undefined) {
      await Budget.updateMany(
        { userId, active: ACTIVE_BUDGET_FILTER },
        {
          $set: {
            expenseStartMode: user.expenseStartMode || "include_existing",
            expenseStartDate:
              user.expenseStartMode === "start_from_now" ? user.expenseStartDate || new Date() : null,
          },
        }
      );
    }

    const savedSalary = Number(user.monthlySalary);
    const savedSavingsPercentage = Number(user.savingsPercentage);

    if (Number.isFinite(savedSalary) && savedSalary > 0 && Number.isFinite(savedSavingsPercentage)) {
      const savingsAmount = savedSalary * (savedSavingsPercentage / 100);
      const usableBudget = savedSalary - savingsAmount;

      return res.json({
        message: "Budget settings updated successfully",
        settings: {
          monthlySalary: user.monthlySalary,
          savingsPercentage: user.savingsPercentage,
          currency: user.currency,
          expenseStartMode: user.expenseStartMode || "include_existing",
          expenseStartDate: user.expenseStartDate || null,
          budgetPeriodDays: Number(user.budgetPeriodDays) || 30,
          budgetPeriodStartDate: user.budgetPeriodStartDate || null,
          budgetPeriodEndDate: resolveBudgetPeriodEndDate(user.budgetPeriodStartDate, user.budgetPeriodDays),
        },
        derived: {
          savingsAmount,
          usableBudget,
        },
      });
    }

    return res.json({
      message: "Budget settings updated successfully",
      settings: {
        monthlySalary: user.monthlySalary,
        savingsPercentage: user.savingsPercentage,
        currency: user.currency,
        expenseStartMode: user.expenseStartMode || "include_existing",
        expenseStartDate: user.expenseStartDate || null,
        budgetPeriodDays: Number(user.budgetPeriodDays) || 30,
        budgetPeriodStartDate: user.budgetPeriodStartDate || null,
        budgetPeriodEndDate: resolveBudgetPeriodEndDate(user.budgetPeriodStartDate, user.budgetPeriodDays),
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/* =========================
   CHANGE PASSWORD
========================= */
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const strongPassword =
      newPassword.length >= 8 &&
      /[a-zA-Z]/.test(newPassword) &&
      /\d/.test(newPassword);

    if (!strongPassword) {
      return res.status(400).json({
        message:
          "Password must be at least 8 characters long, and contain both letters and numbers",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* =========================
   UPDATE PROFILE
========================= */
export const updateProfile = async (req, res) => {
  try {
    const { name, email, phone, bio, profilePicture, monthlySalary, savingsPercentage } = req.body;
    const userId = req.user._id;

    // Check if email is being changed and if it's already in use
    if (email) {
      const existingUser = await User.findOne({ email, _id: { $ne: userId } });
      if (existingUser) {
        return res.status(400).json({ message: "Email already in use" });
      }
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (bio !== undefined) updateData.bio = bio;
    if (profilePicture !== undefined) updateData.profilePicture = profilePicture;

    if (monthlySalary !== undefined) {
      const parsedSalary = Number(monthlySalary);
      if (!Number.isFinite(parsedSalary) || parsedSalary <= 0) {
        return res.status(400).json({ message: "Monthly salary must be a positive number" });
      }
      updateData.monthlySalary = parsedSalary;
    }

    if (savingsPercentage !== undefined) {
      const parsedSavingsPercentage = Number(savingsPercentage);
      if (!Number.isFinite(parsedSavingsPercentage) || parsedSavingsPercentage < 0 || parsedSavingsPercentage >= 100) {
        return res.status(400).json({ message: "Savings percentage must be between 0 and less than 100" });
      }
      updateData.savingsPercentage = parsedSavingsPercentage;
    }

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ 
      message: "Profile updated successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        bio: user.bio,
        profilePicture: user.profilePicture,
        monthlySalary: user.monthlySalary,
        savingsPercentage: user.savingsPercentage,
        accountNumber: user.accountNumber
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* =========================
   UPDATE NOTIFICATION SETTINGS
========================= */
export const updateNotificationSettings = async (req, res) => {
  try {
    const { notificationSettings } = req.body;
    const userId = req.user._id;

    if (!notificationSettings || typeof notificationSettings !== "object") {
      return res.status(400).json({ message: "Notification settings payload is required" });
    }

    console.log(`📧 Updating notification settings for user ${userId}`);
    console.log('Received settings:', notificationSettings);

    const user = await User.findById(userId).select(
      "notificationSettings email lastTransactionInactivityReminderSentAt"
    );

    if (!user) {
      console.log('❌ User not found');
      return res.status(404).json({ message: "User not found" });
    }

    user.notificationSettings = sanitizeNotificationSettings(
      notificationSettings,
      user.notificationSettings
    );

    if (!user.notificationSettings.transactionInactivityReminders) {
      user.lastTransactionInactivityReminderSentAt = null;
    }

    await user.save();

    console.log(`✅ Notification settings updated for ${user.email}:`, user.notificationSettings);

    res.json({ 
      message: "Notification settings updated successfully",
      notificationSettings: user.notificationSettings
    });
  } catch (error) {
    console.error('❌ Error updating notification settings:', error);
    res.status(500).json({ message: error.message });
  }
};

/* =========================
   UPDATE PRIVACY SETTINGS
========================= */
export const updatePrivacySettings = async (req, res) => {
  try {
    const { privacySettings } = req.body;
    const userId = req.user._id;

    if (!privacySettings || typeof privacySettings !== "object") {
      return res.status(400).json({ message: "Privacy settings payload is required" });
    }

    const user = await User.findById(userId).select(
      "privacySettings twoFactorLoginCodeHash twoFactorLoginCodeExpires twoFactorTrustedDevices"
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const nextPrivacySettings = {
      twoFactorAuth: false,
      sessionTimeout: "30",
      loginNotifications: true,
      dataSharing: false,
      ...(user.privacySettings || {}),
    };

    // 2FA is intentionally disabled globally.
    nextPrivacySettings.twoFactorAuth = false;

    if (Object.prototype.hasOwnProperty.call(privacySettings, "loginNotifications")) {
      nextPrivacySettings.loginNotifications = Boolean(privacySettings.loginNotifications);
    }

    if (Object.prototype.hasOwnProperty.call(privacySettings, "dataSharing")) {
      nextPrivacySettings.dataSharing = Boolean(privacySettings.dataSharing);
    }

    if (Object.prototype.hasOwnProperty.call(privacySettings, "sessionTimeout")) {
      const normalizedTimeout = String(privacySettings.sessionTimeout).trim();
      if (!PRIVACY_SESSION_TIMEOUT_VALUES.has(normalizedTimeout)) {
        return res.status(400).json({ message: "Invalid session timeout value" });
      }
      nextPrivacySettings.sessionTimeout = normalizedTimeout;
    }

    user.privacySettings = nextPrivacySettings;
    clearTwoFactorChallenge(user);
    clearTwoFactorTrustedDevices(user);

    await user.save();

    res.json({ 
      message: "Privacy settings updated successfully",
      privacySettings: user.privacySettings
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* =========================
   EXPORT USER DATA
========================= */
export const exportUserData = async (req, res) => {
  try {
    const userId = req.user._id;

    // Import models as needed
    const Transaction = (await import('../models/Transaction.js')).default;
    const Goal = (await import('../models/Goal.js')).default;

    const user = await User.findById(userId).select('-password -resetPasswordToken -resetPasswordExpires');
    const transactions = await Transaction.find({ userId });
    const goals = await Goal.find({ userId });

    const exportData = {
      user: user,
      transactions: transactions,
      goals: goals,
      exportedAt: new Date().toISOString()
    };

    res.json({
      message: "Data exported successfully",
      data: exportData
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* =========================
   DELETE ACCOUNT
========================= */
export const deleteAccount = async (req, res) => {
  try {
    const { password } = req.body;
    const userId = req.user._id;

    if (!password) {
      return res.status(400).json({ message: "Password is required to delete account" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Incorrect password" });
    }

    // Import models as needed
    const Transaction = (await import('../models/Transaction.js')).default;
    const Goal = (await import('../models/Goal.js')).default;
    const Conversation = (await import('../models/Conversation.js')).default;

    // Delete all user data
    await Transaction.deleteMany({ userId  });
    await Goal.deleteMany({ userId });
    await Conversation.deleteMany({ userId });
    await User.findByIdAndDelete(userId);

    res.json({ message: "Account deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* =========================
   GUEST LOGIN
========================= */
export const guestLogin = async (req, res) => {
  try {
    // Generate unique session ID for guest
    const sessionId = crypto.randomUUID();
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours from now

    // Initialize guest data in memory
    guestStore.set(sessionId, {
      transactions: [],
      goals: [],
      settings: {
        currency: 'USD',
        theme: 'light'
      },
      createdAt: Date.now(),
      expiresAt
    });

    // Generate JWT token for guest
    const token = jwt.sign(
      { 
        id: sessionId, 
        role: 'guest', 
        sessionId 
      },
      getJwtSecret(),
      { expiresIn: '24h' }
    );

    console.log(`🎭 Guest session created: ${sessionId}`);

    res.json({
      token,
      role: 'guest',
      name: 'Guest User',
      email: 'guest@example.com',
      _id: sessionId,
      message: 'Guest session created. Data will be available for 24 hours.'
    });
  } catch (error) {
    console.error('Guest login error:', error);
    res.status(500).json({ message: 'Failed to create guest session' });
  }
};

/* =========================
   SET/UPDATE TRANSFER PIN
========================= */
export const setTransferPin = async (req, res) => {
  try {
    const userId = req.user._id;
    const { currentPin, newPin, confirmPin } = req.body;

    // Validation
    if (!newPin || !confirmPin) {
      return res.status(400).json({
        success: false,
        message: "Please provide both new PIN and confirmation"
      });
    }

    if (newPin !== confirmPin) {
      return res.status(400).json({
        success: false,
        message: "PINs do not match"
      });
    }

    // Validate PIN format (must be 6 digits)
    if (!/^\d{6}$/.test(newPin)) {
      return res.status(400).json({
        success: false,
        message: "PIN must be exactly 6 digits"
      });
    }

    // Get user with existing transferPin
    const user = await User.findById(userId).select("+transferPin");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // If user has existing PIN, verify current PIN
    if (user.transferPin) {
      if (!currentPin) {
        return res.status(400).json({
          success: false,
          message: "Current PIN is required to change existing PIN"
        });
      }

      const isPinValid = await bcrypt.compare(currentPin, user.transferPin);
      if (!isPinValid) {
        return res.status(401).json({
          success: false,
          message: "Current PIN is incorrect"
        });
      }
    }

    // Hash the new PIN
    const hashedPin = await bcrypt.hash(newPin, 10);

    // Update user's transfer PIN
    user.transferPin = hashedPin;
    await user.save();

    res.json({
      success: true,
      message: user.transferPin ? "Transfer PIN updated successfully" : "Transfer PIN set successfully"
    });
  } catch (error) {
    console.error("Set transfer PIN error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to set transfer PIN"
    });
  }
};

/* =========================
   CHECK IF TRANSFER PIN EXISTS
========================= */
export const checkTransferPin = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).select("+transferPin");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    res.json({
      success: true,
      hasPin: !!user.transferPin
    });
  } catch (error) {
    console.error("Check transfer PIN error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to check transfer PIN status"
    });
  }
};
