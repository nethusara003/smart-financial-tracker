import React, { useMemo, useState } from "react";
import { X, Smartphone, Mail, ShieldCheck, AlertCircle } from "lucide-react";
import { Overlay, useToast } from "../ui";

const CODE_LENGTH = 6;

const isLikelyPhone = (value) => /^\+?[0-9\s()-]{8,20}$/.test(String(value || "").trim());
const isLikelyEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());

const PinInputModal = ({
  onSubmit,
  onSendOtp,
  onCancel,
  isSendingOtp = false,
  defaultPhone = "",
  fallbackEmail = "",
  emailOnlyMode = false,
  recipientName = "recipient",
}) => {
  const toast = useToast();
  const [phoneNumber, setPhoneNumber] = useState(defaultPhone || "");
  const [savePhonePermanently, setSavePhonePermanently] = useState(Boolean(defaultPhone));
  const [fallbackEmailInput, setFallbackEmailInput] = useState(fallbackEmail || "");
  const [showEmailFallbackInput, setShowEmailFallbackInput] = useState(Boolean(emailOnlyMode));
  const [code, setCode] = useState("");
  const [otpSessionId, setOtpSessionId] = useState("");
  const [deliverySummary, setDeliverySummary] = useState("");
  const [fallbackReasonText, setFallbackReasonText] = useState("");
  const [error, setError] = useState("");

  const canSendCode = useMemo(() => {
    if (!phoneNumber) {
      return true;
    }

    return isLikelyPhone(phoneNumber);
  }, [phoneNumber]);

  const handleSendCode = async () => {
    if (!onSendOtp) {
      setError("Unable to send code right now");
      return;
    }

    if (!emailOnlyMode && phoneNumber && !canSendCode) {
      setError("Enter a valid phone number (e.g. 0771234567 or +94771234567)");
      return;
    }

    if (showEmailFallbackInput && !isLikelyEmail(fallbackEmailInput)) {
      setError("Enter a valid email address to receive OTP");
      return;
    }

    setError("");
    setFallbackReasonText("");

    try {
      const payload = await onSendOtp({
        phoneNumber: emailOnlyMode ? undefined : phoneNumber || undefined,
        savePhone: emailOnlyMode ? false : savePhonePermanently,
        fallbackEmail: showEmailFallbackInput ? fallbackEmailInput.trim() : undefined,
      });

      setOtpSessionId(String(payload?.sessionId || ""));

      const channel = payload?.delivery?.channel || "email";
      const target = payload?.delivery?.target || (channel === "sms" ? "your phone" : "your email");
      const message =
        channel === "sms"
          ? `Code sent to ${target}`
          : emailOnlyMode
          ? `Code sent to ${target}`
          : `Phone unavailable. Code sent to ${target}`;

      setDeliverySummary(message);
      setShowEmailFallbackInput(channel === "email");
      setFallbackReasonText(payload?.delivery?.fallbackReason?.message || "");
      toast.success(payload?.message || "Verification code sent");
    } catch (sendError) {
      if (sendError?.requiresEmailInput) {
        setShowEmailFallbackInput(true);
        setFallbackReasonText(sendError?.fallbackReasonMessage || "SMS is unavailable right now.");
      }
      const message = sendError?.message || "Failed to send verification code";
      setError(message);
      toast.error(message);
    }
  };

  const handleConfirm = () => {
    const normalizedCode = String(code || "").replace(/\D/g, "");

    if (!otpSessionId) {
      setError("Send a verification code first");
      return;
    }

    if (normalizedCode.length !== CODE_LENGTH) {
      setError("Enter the 6-digit verification code");
      return;
    }

    onSubmit({ otpSessionId, otpCode: normalizedCode });
  };

  return (
    <Overlay
      isOpen
      onClose={onCancel}
      panelClassName="max-w-md rounded-xl bg-white dark:bg-dark-surface-elevated shadow-2xl overflow-hidden"
      ariaLabelledBy="transfer-otp-title"
    >
      <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-dark-border-default">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h2 id="transfer-otp-title" className="text-xl font-bold text-gray-800 dark:text-white">
            Verify Transfer
          </h2>
        </div>
        <button
          onClick={onCancel}
          className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-6 space-y-5">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Confirm this transfer to {recipientName} with a one-time verification code.
        </p>

        {!emailOnlyMode && (
          <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <Smartphone className="w-4 h-4" />
            Phone number (optional)
          </label>
          <input
            type="tel"
            value={phoneNumber}
            onChange={(event) => setPhoneNumber(event.target.value)}
            placeholder="+94XXXXXXXXX"
            className="w-full px-3 py-2.5 border border-gray-300 dark:border-dark-border-default rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-dark-bg-secondary text-gray-900 dark:text-white"
          />
          <p className="text-xs text-gray-500 dark:text-gray-500 flex items-center gap-1">
            <Mail className="w-3.5 h-3.5" />
            If SMS is unavailable, you will be asked for an email to send OTP.
          </p>
          </div>
        )}

        {showEmailFallbackInput && (
          emailOnlyMode ? (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-500" />
                Email address for OTP
              </label>
              <input
                type="email"
                value={fallbackEmailInput}
                onChange={(event) => setFallbackEmailInput(event.target.value)}
                placeholder={fallbackEmail || "name@example.com"}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-dark-border-default rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-dark-bg-secondary text-gray-900 dark:text-white"
              />
            </div>
          ) : (
            <div className="space-y-2 rounded-lg border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-3">
              {fallbackReasonText && (
                <p className="text-xs text-amber-700 dark:text-amber-300">SMS issue: {fallbackReasonText}</p>
              )}
              <label className="text-sm font-medium text-amber-800 dark:text-amber-300 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Fallback email for OTP
              </label>
              <input
                type="email"
                value={fallbackEmailInput}
                onChange={(event) => setFallbackEmailInput(event.target.value)}
                placeholder={fallbackEmail || "name@example.com"}
                className="w-full px-3 py-2.5 border border-amber-300 dark:border-amber-600 rounded-lg focus:ring-2 focus:ring-amber-500 bg-white dark:bg-dark-bg-secondary text-gray-900 dark:text-white"
              />
            </div>
          )
        )}

        {!emailOnlyMode && (
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={savePhonePermanently}
              onChange={(event) => setSavePhonePermanently(event.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Save this phone number permanently for future transfers
          </label>
        )}

        <button
          type="button"
          onClick={handleSendCode}
          disabled={isSendingOtp || (!emailOnlyMode && !canSendCode)}
          className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium rounded-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSendingOtp ? "Sending Code..." : "Send Verification Code"}
        </button>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Enter verification code</label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={CODE_LENGTH}
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, CODE_LENGTH))}
            placeholder="6-digit code"
            className="w-full px-3 py-2.5 tracking-[0.35em] text-center text-lg border border-gray-300 dark:border-dark-border-default rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-dark-bg-secondary text-gray-900 dark:text-white"
          />
        </div>

        {deliverySummary && <p className="text-xs text-green-600 dark:text-green-400">{deliverySummary}</p>}

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}
      </div>

      <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-dark-border-default">
        <button
          onClick={onCancel}
          className="flex-1 py-3 px-4 border border-gray-300 dark:border-dark-border-default text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-dark-surface-hover transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          disabled={!otpSessionId || code.length !== CODE_LENGTH}
          className="flex-1 py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Confirm Transfer
        </button>
      </div>
    </Overlay>
  );
};

export default PinInputModal;
