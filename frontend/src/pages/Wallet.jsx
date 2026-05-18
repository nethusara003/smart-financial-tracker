import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCurrency } from "../context/CurrencyContext";
import { CurrencyInput, Overlay } from "../components/ui";
import {
  useAddFunds,
  useWalletBalance,
  useWalletTransactions,
  useWithdrawFunds,
} from "../hooks/useWallet";
import {
  Wallet as WalletIcon,
  Plus,
  Minus,
  ArrowUpCircle,
  ArrowDownCircle,
  CreditCard,
  Calendar,
  TrendingUp,
  DollarSign,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
  Settings,
} from "lucide-react";

const getWalletActivityMeta = (category) => {
  const key = String(category || "").toLowerCase();
  const incomingCategories = new Set([
    "wallet_topup",
    "wallet_deposit",
    "wallet_transfer_received",
    "wallet_transfer_reversal_in",
    "transfer_received",
  ]);

  const outgoingCategories = new Set([
    "wallet_withdrawal",
    "wallet_transfer_sent",
    "wallet_transfer_reversal_out",
    "transfer_sent",
  ]);

  if (incomingCategories.has(key)) {
    return {
      isIncoming: true,
      iconClassName: "bg-success-100 dark:bg-success-500/20",
      iconColorClassName: "text-success-600 dark:text-success-400",
      amountColorClassName: "text-success-600 dark:text-success-400",
      sign: "+",
    };
  }

  if (outgoingCategories.has(key)) {
    return {
      isIncoming: false,
      iconClassName: "bg-error-100 dark:bg-error-500/20",
      iconColorClassName: "text-error-600 dark:text-error-400",
      amountColorClassName: "text-error-600 dark:text-error-400",
      sign: "-",
    };
  }

  return {
    isIncoming: true,
    iconClassName: "bg-light-bg-accent dark:bg-dark-surface-elevated",
    iconColorClassName: "text-light-text-secondary dark:text-dark-text-secondary",
    amountColorClassName: "text-light-text-primary dark:text-dark-text-primary",
    sign: "",
  };
};

const Wallet = () => {
  // Navigation
  const navigate = useNavigate();
  
  // Currency context
  const { formatCurrency } = useCurrency();

  // State management
  const [showBalance, setShowBalance] = useState(true);
  const [showAddFunds, setShowAddFunds] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);

  // Add funds form state
  const [addAmount, setAddAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCVV, setCardCVV] = useState("");
  const [cardholderName, setCardholderName] = useState("");
  const [cardType, setCardType] = useState("");
  const [validationErrors, setValidationErrors] = useState({});

  // Withdraw form state
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [bankAccount, setBankAccount] = useState("");

  // Message state
  const [message, setMessage] = useState({ type: "", text: "" });

  const {
    data: wallet = {
      balance: 0,
      availableBalance: 0,
      pendingBalance: 0,
      currency: "LKR",
      status: "active",
      lastUpdated: null,
    },
    isLoading: walletLoading,
    refetch: refetchWallet,
  } = useWalletBalance();
  const {
    data: transactions = [],
    isLoading: transactionsLoading,
    refetch: refetchWalletTransactions,
  } = useWalletTransactions({ limit: 10 });
  const addFundsMutation = useAddFunds();
  const withdrawFundsMutation = useWithdrawFunds();
  const loading = walletLoading || transactionsLoading;
  const processing = addFundsMutation.isPending || withdrawFundsMutation.isPending;

  const refreshWalletData = () => {
    refetchWallet();
    refetchWalletTransactions();
  };

  const closeAddFundsModal = () => {
    setShowAddFunds(false);
    setValidationErrors({});
    setCardNumber("");
    setCardExpiry("");
    setCardCVV("");
    setCardholderName("");
    setCardType("");
    setAddAmount("");
  };

  const closeWithdrawModal = () => {
    setShowWithdraw(false);
    setWithdrawAmount("");
    setBankAccount("");
  };

  // Card formatting and validation functions
  const detectCardType = (number) => {
    const cleaned = number.replace(/\D/g, "");
    
    if (/^4/.test(cleaned)) return "visa";
    if (/^5[1-5]/.test(cleaned)) return "mastercard";
    if (/^3[47]/.test(cleaned)) return "amex";
    if (/^6(?:011|5)/.test(cleaned)) return "discover";
    return "";
  };

  const luhnCheck = (num) => {
    const arr = num
      .split("")
      .reverse()
      .map((x) => parseInt(x));
    const lastDigit = arr.shift();
    let sum = arr.reduce(
      (acc, val, i) => (i % 2 !== 0 ? acc + val : acc + ((val * 2) % 9) || 9),
      0
    );
    sum += lastDigit;
    return sum % 10 === 0;
  };

  const formatCardNumber = (value) => {
    const cleaned = value.replace(/\D/g, "");
    const limited = cleaned.slice(0, 16);
    const type = detectCardType(limited);
    setCardType(type);

    // Format with spaces every 4 digits
    const formatted = limited.match(/.{1,4}/g)?.join(" ") || limited;
    return formatted;
  };

  const formatExpiryDate = (value) => {
    const cleaned = value.replace(/\D/g, "");
    const limited = cleaned.slice(0, 4);

    if (limited.length >= 2) {
      return `${limited.slice(0, 2)}/${limited.slice(2)}`;
    }
    return limited;
  };



  const validateCard = () => {
    const errors = {};
    const cleanCard = cardNumber.replace(/\D/g, "");

    // Card number validation
    if (cleanCard.length !== 16 && cleanCard.length !== 15) {
      errors.cardNumber = "Invalid card number length";
    } else if (!luhnCheck(cleanCard)) {
      errors.cardNumber = "Invalid card number";
    }

    // Expiry validation
    const expiryParts = cardExpiry.split("/");
    if (expiryParts.length === 2) {
      const month = parseInt(expiryParts[0]);
      const year = parseInt("20" + expiryParts[1]);
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;

      if (month < 1 || month > 12) {
        errors.cardExpiry = "Invalid month";
      } else if (year < currentYear || (year === currentYear && month < currentMonth)) {
        errors.cardExpiry = "Card expired";
      }
    } else {
      errors.cardExpiry = "Invalid format (MM/YY)";
    }

    // CVV validation
    if (cardCVV.length < 3 || cardCVV.length > 4) {
      errors.cardCVV = "Invalid CVV";
    }

    // Cardholder name validation
    if (!cardholderName.trim()) {
      errors.cardholderName = "Name required";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCardNumberChange = (e) => {
    const formatted = formatCardNumber(e.target.value);
    setCardNumber(formatted);
    
    // Clear validation error when user types
    if (validationErrors.cardNumber) {
      setValidationErrors({ ...validationErrors, cardNumber: "" });
    }
  };

  const handleExpiryChange = (e) => {
    const formatted = formatExpiryDate(e.target.value);
    setCardExpiry(formatted);
    
    if (validationErrors.cardExpiry) {
      setValidationErrors({ ...validationErrors, cardExpiry: "" });
    }
  };

  const handleCVVChange = (e) => {
    const cleaned = e.target.value.replace(/\D/g, "").slice(0, 4);
    setCardCVV(cleaned);
    
    if (validationErrors.cardCVV) {
      setValidationErrors({ ...validationErrors, cardCVV: "" });
    }
  };


  const handleAddFunds = async (e) => {
    e.preventDefault();
    setMessage({ type: "", text: "" });

    try {
      const amount = parseFloat(addAmount);

      if (!amount || amount <= 0) {
        setMessage({ type: "error", text: "Please enter a valid amount" });
        return;
      }

      if (amount > 500000) {
        setMessage({ type: "error", text: `Maximum deposit is ${formatCurrency(500000)}` });
        return;
      }

      // Validate card if payment method is card
      if (paymentMethod === "card" && !validateCard()) {
        setMessage({ type: "error", text: "Please fix the validation errors" });
        return;
      }

      const response = await addFundsMutation.mutateAsync({
        amount,
        paymentMethod,
        cardLast4: cardNumber.replace(/\D/g, "").slice(-4),
      });

      if (response?.success) {
        setMessage({ type: "success", text: "Funds added successfully!" });
        closeAddFundsModal();
        refreshWalletData();
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: error.message || "Failed to add funds",
      });
    }
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    setMessage({ type: "", text: "" });

    try {
      const amount = parseFloat(withdrawAmount);

      if (!amount || amount <= 0) {
        setMessage({ type: "error", text: "Please enter a valid amount" });
        return;
      }

      if (amount > wallet.availableBalance) {
        setMessage({ type: "error", text: "Insufficient balance" });
        return;
      }

      const response = await withdrawFundsMutation.mutateAsync({
        amount,
        bankAccount,
      });

      if (response?.success) {
        setMessage({ type: "success", text: "Withdrawal successful!" });
        closeWithdrawModal();
        refreshWalletData();
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: error.message || "Failed to withdraw funds",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-500 mb-4"></div>
          <p className="text-light-text-secondary dark:text-dark-text-secondary">
            Loading wallet...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <section className="rounded-2xl border border-light-border-default dark:border-white/5 bg-light-surface-secondary dark:bg-[#0B0E14] p-6 sm:p-8 text-light-text-primary dark:text-white shadow-2xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/transfers')}
              className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-200 transition hover:border-blue-400/40 hover:bg-white/[0.06]"
              title="Back to Transfers"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="rounded-xl border border-blue-400/20 bg-blue-500/10 p-3">
              <WalletIcon className="h-6 w-6 text-blue-300" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-[#3B82F6]">
                My Wallet
              </h1>
              <p className="mt-2 text-sm text-light-text-secondary dark:text-blue-100/80">
                Liquidity control panel for funds, withdrawals, and balance visibility
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <div className="flex h-12 items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 text-left">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Available Balance
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-light-text-primary dark:text-white">
                  {showBalance ? formatCurrency(wallet?.balance || 0) : "••••••"}
                </p>
                {wallet?.pendingBalance > 0 && (
                  <p className="mt-1 text-xs text-slate-400">
                    Pending: {formatCurrency(wallet.pendingBalance)}
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={refreshWalletData}
              className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-200 transition hover:border-blue-400/40 hover:bg-white/[0.06]"
              title="Refresh wallet"
            >
              <RefreshCw className="h-4 w-4" />
            </button>

            <button
              onClick={() => setShowBalance((value) => !value)}
              className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-200 transition hover:border-blue-400/40 hover:bg-white/[0.06]"
              title="Toggle balance visibility"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={() => setShowAddFunds(true)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 font-semibold text-emerald-300 transition hover:border-emerald-400/40 hover:bg-emerald-500/15"
          >
            <Plus className="h-4 w-4" />
            Add Funds
          </button>
          <button
            onClick={() => setShowWithdraw(true)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 font-semibold text-rose-300 transition hover:border-rose-400/40 hover:bg-rose-500/15"
          >
            <Minus className="h-4 w-4" />
            Withdraw
          </button>
        </div>
      </section>

      {/* Message Display */}
      {message.text && (
        <div
          className={`flex items-center gap-3 p-4 rounded-xl ${
            message.type === "success"
              ? "bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-500/30 text-success-700 dark:text-success-300"
              : "bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-500/30 text-error-700 dark:text-error-300"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Recent Transactions */}
      <div className="rounded-2xl border border-light-border-default dark:border-white/5 bg-light-surface-secondary dark:bg-[#0B0E14] p-6 shadow-premium">
        <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-light-text-primary dark:text-slate-100">
          <TrendingUp className="h-5 w-5 text-blue-300" />
          Recent Activity
        </h2>

        {transactions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] py-12 text-center">
            <WalletIcon className="mx-auto mb-4 h-12 w-12 text-slate-500 opacity-70" />
            <p className="text-slate-300">
              No transactions yet
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Add funds to get started
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((transaction) => (
              <div
                key={transaction._id}
                className="flex items-center justify-between rounded-xl border border-light-border-default dark:border-white/10 bg-light-surface-primary dark:bg-white/[0.03] p-4 transition-shadow hover:shadow-md"
              >
                {(() => {
                  const activityMeta = getWalletActivityMeta(transaction.category);

                  return (
                    <>
                <div className="flex items-center gap-4">
                  <div
                    className={`p-3 rounded-xl ${activityMeta.iconClassName}`}
                  >
                    {activityMeta.isIncoming ? (
                      <ArrowDownCircle className={`w-5 h-5 ${activityMeta.iconColorClassName}`} />
                    ) : (
                      <ArrowUpCircle className={`w-5 h-5 ${activityMeta.iconColorClassName}`} />
                    )}
                  </div>
                  <div>
                    <div className="font-semibold text-light-text-primary dark:text-dark-text-primary">
                      {transaction.category.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                    </div>
                    <div className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                      {new Date(transaction.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
                <div
                  className={`text-lg font-bold ${activityMeta.amountColorClassName}`}
                >
                  {activityMeta.sign}
                  {formatCurrency(transaction.amount)}
                </div>
                    </>
                  );
                })()}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Funds Modal */}
      {showAddFunds && (
        <Overlay
          isOpen={showAddFunds}
          onClose={closeAddFundsModal}
          containerClassName="z-50 overflow-y-auto"
          backdropClassName="bg-black/60 backdrop-blur-md"
          panelClassName="max-w-2xl"
          ariaLabelledBy="wallet-add-funds-title"
        >
              <div className="bg-white dark:bg-dark-surface-primary rounded-3xl p-8 w-full shadow-2xl border border-light-border-default dark:border-dark-border-strong transform transition-all animate-slide-in-up my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-8 sticky top-0 bg-white dark:bg-dark-surface-primary z-10 pb-4">
              <div>
                <h3 id="wallet-add-funds-title" className="text-3xl font-bold text-light-text-primary dark:text-dark-text-primary bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                  Add Funds
                </h3>
                <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mt-1">
                  Securely add money to your wallet
                </p>
              </div>
              <button
                onClick={closeAddFundsModal}
                className="text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text-primary dark:hover:text-dark-text-primary hover:bg-light-bg-secondary dark:hover:bg-dark-surface-secondary rounded-xl p-2 transition-all"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAddFunds} className="space-y-6">
              {/* Card Preview */}
              {paymentMethod === "card" && (
                <div className="relative h-52 rounded-2xl p-6 shadow-2xl overflow-hidden transform transition-all hover:scale-[1.02] duration-300"
                  style={{
                    background: cardType === "visa" 
                      ? "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)"
                      : cardType === "mastercard"
                      ? "linear-gradient(135deg, #991b1b 0%, #ef4444 100%)"
                      : cardType === "amex"
                      ? "linear-gradient(135deg, #064e3b 0%, #10b981 100%)"
                      : "linear-gradient(135deg, #4c1d95 0%, #8b5cf6 100%)"
                  }}
                >
                  {/* Card pattern overlay */}
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute inset-0" style={{
                      backgroundImage: `radial-gradient(circle at 20% 50%, white 0%, transparent 50%),
                                      radial-gradient(circle at 80% 80%, white 0%, transparent 50%)`
                    }}></div>
                  </div>

                  <div className="relative h-full flex flex-col justify-between">
                    {/* Card type logo */}
                    <div className="flex justify-between items-start">
                      <div className="text-white/90 font-bold text-lg tracking-wider">
                        {cardType === "visa" && "VISA"}
                        {cardType === "mastercard" && "Mastercard"}
                        {cardType === "amex" && "AMEX"}
                        {!cardType && "CARD"}
                      </div>
                      <div className="flex gap-2">
                        <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm"></div>
                      </div>
                    </div>

                    {/* Card number */}
                    <div className="text-white font-sans text-2xl tracking-widest">
                      {cardNumber || "•••• •••• •••• ••••"}
                    </div>

                    {/* Card holder and expiry */}
                    <div className="flex justify-between items-end">
                      <div>
                        <div className="text-white/60 text-xs mb-1">CARD HOLDER</div>
                        <div className="text-white font-semibold tracking-wide uppercase">
                          {cardholderName || "YOUR NAME"}
                        </div>
                      </div>
                      <div>
                        <div className="text-white/60 text-xs mb-1">EXPIRES</div>
                        <div className="text-white font-semibold">
                          {cardExpiry || "MM/YY"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Amount */}
              <div>
                <label className="block text-sm font-semibold text-light-text-primary dark:text-dark-text-primary mb-3">
                  Amount
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <CurrencyInput
                    name="addAmount"
                    value={addAmount}
                    onChange={(e) => setAddAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-12 pr-4 py-4 bg-light-bg-secondary dark:bg-dark-surface-secondary border-2 border-light-border-default dark:border-dark-border-default rounded-xl focus:border-blue-500 dark:focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 text-light-text-primary dark:text-dark-text-primary text-lg font-semibold transition-all outline-none"
                    required
                  />
                </div>
                <p className="text-xs text-light-text-tertiary dark:text-dark-text-tertiary mt-2 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Maximum: {formatCurrency(500000)} per transaction
                </p>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-semibold text-light-text-primary dark:text-dark-text-primary mb-3">
                  Payment Method
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("card")}
                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all ${
                      paymentMethod === "card"
                        ? "bg-blue-600 dark:bg-blue-500 text-white shadow-lg shadow-blue-500/30"
                        : "bg-light-bg-secondary dark:bg-dark-surface-secondary text-light-text-secondary dark:text-dark-text-secondary border-2 border-light-border-default dark:border-dark-border-default hover:border-blue-500 dark:hover:border-blue-400"
                    }`}
                  >
                    <CreditCard className="w-5 h-5" />
                    Card
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("bank")}
                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all ${
                      paymentMethod === "bank"
                        ? "bg-blue-600 dark:bg-blue-500 text-white shadow-lg shadow-blue-500/30"
                        : "bg-light-bg-secondary dark:bg-dark-surface-secondary text-light-text-secondary dark:text-dark-text-secondary border-2 border-light-border-default dark:border-dark-border-default hover:border-blue-500 dark:hover:border-blue-400"
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    Bank
                  </button>
                </div>
              </div>

              {/* Card Details */}
              {paymentMethod === "card" && (
                <div className="space-y-4 animate-fade-in">
                  {/* Cardholder Name */}
                  <div>
                    <label className="block text-sm font-semibold text-light-text-primary dark:text-dark-text-primary mb-2">
                      Cardholder Name
                    </label>
                    <input
                      type="text"
                      value={cardholderName}
                      onChange={(e) => {
                        setCardholderName(e.target.value);
                        if (validationErrors.cardholderName) {
                          setValidationErrors({ ...validationErrors, cardholderName: "" });
                        }
                      }}
                      placeholder="John Doe"
                      className={`w-full px-4 py-3 bg-light-bg-secondary dark:bg-dark-surface-secondary border-2 ${
                        validationErrors.cardholderName
                          ? "border-error-500 dark:border-error-400"
                          : "border-light-border-default dark:border-dark-border-default"
                      } rounded-xl focus:border-blue-500 dark:focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 text-light-text-primary dark:text-dark-text-primary transition-all outline-none`}
                      required
                    />
                    {validationErrors.cardholderName && (
                      <p className="text-xs text-error-600 dark:text-error-400 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {validationErrors.cardholderName}
                      </p>
                    )}
                  </div>

                  {/* Card Number */}
                  <div>
                    <label className="block text-sm font-semibold text-light-text-primary dark:text-dark-text-primary mb-2">
                      Card Number
                    </label>
                    <div className="relative">
                      <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-light-text-tertiary dark:text-dark-text-tertiary" />
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={handleCardNumberChange}
                        placeholder="1234 5678 9012 3456"
                        maxLength="19"
                        className={`w-full pl-12 pr-12 py-3 bg-light-bg-secondary dark:bg-dark-surface-secondary border-2 ${
                          validationErrors.cardNumber
                            ? "border-error-500 dark:border-error-400"
                            : "border-light-border-default dark:border-dark-border-default"
                        } rounded-xl focus:border-blue-500 dark:focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 text-light-text-primary dark:text-dark-text-primary font-sans tracking-wider transition-all outline-none`}
                        required
                      />
                      {cardType && !validationErrors.cardNumber && cardNumber.replace(/\D/g, "").length === 16 && (
                        <CheckCircle className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-success-600 dark:text-success-400" />
                      )}
                    </div>
                    {validationErrors.cardNumber ? (
                      <p className="text-xs text-error-600 dark:text-error-400 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {validationErrors.cardNumber}
                      </p>
                    ) : (
                      <p className="text-xs text-light-text-tertiary dark:text-dark-text-tertiary mt-1">
                        Test card: 4242 4242 4242 4242
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Expiry */}
                    <div>
                      <label className="block text-sm font-semibold text-light-text-primary dark:text-dark-text-primary mb-2">
                        Expiry Date
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-light-text-tertiary dark:text-dark-text-tertiary" />
                        <input
                          type="text"
                          value={cardExpiry}
                          onChange={handleExpiryChange}
                          placeholder="MM/YY"
                          maxLength="5"
                          className={`w-full pl-10 pr-4 py-3 bg-light-bg-secondary dark:bg-dark-surface-secondary border-2 ${
                            validationErrors.cardExpiry
                              ? "border-error-500 dark:border-error-400"
                              : "border-light-border-default dark:border-dark-border-default"
                          } rounded-xl focus:border-blue-500 dark:focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 text-light-text-primary dark:text-dark-text-primary font-sans transition-all outline-none`}
                          required
                        />
                      </div>
                      {validationErrors.cardExpiry && (
                        <p className="text-xs text-error-600 dark:text-error-400 mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {validationErrors.cardExpiry}
                        </p>
                      )}
                    </div>

                    {/* CVV */}
                    <div>
                      <label className="block text-sm font-semibold text-light-text-primary dark:text-dark-text-primary mb-2">
                        CVV
                      </label>
                      <div className="relative">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-light-text-tertiary dark:text-dark-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <input
                          type="password"
                          value={cardCVV}
                          onChange={handleCVVChange}
                          placeholder="123"
                          maxLength="4"
                          className={`w-full pl-10 pr-4 py-3 bg-light-bg-secondary dark:bg-dark-surface-secondary border-2 ${
                            validationErrors.cardCVV
                              ? "border-error-500 dark:border-error-400"
                              : "border-light-border-default dark:border-dark-border-default"
                          } rounded-xl focus:border-blue-500 dark:focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 text-light-text-primary dark:text-dark-text-primary font-mono transition-all outline-none`}
                          required
                        />
                      </div>
                      {validationErrors.cardCVV && (
                        <p className="text-xs text-error-600 dark:text-error-400 mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {validationErrors.cardCVV}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Security badge */}
                  <div className="flex items-center gap-2 text-xs text-light-text-tertiary dark:text-dark-text-tertiary bg-light-bg-secondary dark:bg-dark-surface-secondary p-3 rounded-xl border border-light-border-default dark:border-dark-border-default">
                    <svg className="w-4 h-4 text-success-600 dark:text-success-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span>Your payment information is encrypted and secure</span>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={processing}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 dark:from-blue-500 dark:to-purple-500 dark:hover:from-blue-600 dark:hover:to-purple-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transform hover:scale-[1.02] active:scale-[0.98]"
              >
                {processing ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Processing Payment...
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5" />
                    Add {addAmount ? formatCurrency(parseFloat(addAmount)) : "Funds"}
                  </>
                )}
              </button>
            </form>
          </div>
        </Overlay>
      )}

      {/* Withdraw Modal */}
      {showWithdraw && (
        <Overlay
          isOpen={showWithdraw}
          onClose={closeWithdrawModal}
          panelClassName="max-w-md"
          ariaLabelledBy="wallet-withdraw-title"
        >
          <div className="bg-white dark:bg-dark-surface-primary rounded-2xl p-6 w-full shadow-2xl border border-light-border-default dark:border-dark-border-strong">
            <div className="flex items-center justify-between mb-6">
              <h3 id="wallet-withdraw-title" className="text-2xl font-bold text-light-text-primary dark:text-dark-text-primary">
                Withdraw Funds
              </h3>
              <button
                onClick={closeWithdrawModal}
                className="text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text-primary dark:hover:text-dark-text-primary"
              >
                ✕
              </button>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-500/30 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 text-sm">
                <WalletIcon className="w-4 h-4" />
                <span>
                  Available: <strong>{formatCurrency(wallet?.availableBalance || 0)}</strong>
                </span>
              </div>
            </div>

            <form onSubmit={handleWithdraw} className="space-y-4">
              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-light-text-primary dark:text-dark-text-primary mb-2">
                  Amount
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-light-text-tertiary dark:text-dark-text-tertiary" />
                  <CurrencyInput
                    name="withdrawAmount"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-10 pr-4 py-3 bg-light-bg-secondary dark:bg-dark-surface-secondary border border-light-border-default dark:border-dark-border-default rounded-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-light-text-primary dark:text-dark-text-primary"
                    required
                  />
                </div>
              </div>

              {/* Bank Account */}
              <div>
                <label className="block text-sm font-medium text-light-text-primary dark:text-dark-text-primary mb-2">
                  Bank Account (Optional)
                </label>
                <input
                  type="text"
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value)}
                  placeholder="Bank ending in ****1234"
                  className="w-full px-4 py-3 bg-light-bg-secondary dark:bg-dark-surface-secondary border border-light-border-default dark:border-dark-border-default rounded-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-light-text-primary dark:text-dark-text-primary"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={processing}
                className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {processing ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Minus className="w-5 h-5" />
                    Withdraw
                  </>
                )}
              </button>
            </form>
          </div>
        </Overlay>
      )}
    </div>
  );
};

export default Wallet;
