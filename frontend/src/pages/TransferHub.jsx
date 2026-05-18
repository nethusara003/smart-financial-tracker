import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCurrency } from "../context/CurrencyContext";
import { useToast } from "../components/ui";
import GuestRestricted from "../components/GuestRestricted";
import UserSearchInput from "../components/transfer/UserSearchInput";
import TransferCard from "../components/transfer/TransferCard";
import TransferPreview from "../components/transfer/TransferPreview";
import PinInputModal from "../components/transfer/PinInputModal";
import { useWalletBalance } from "../hooks/useWallet";
import {
  useInitiateTransfer,
  useMyTransfers,
  useSavedTransferContacts,
  useSendTransferOtp,
  useTransferFeasibility,
  useTransferLimits,
} from "../hooks/useTransfers";
import {
  Send,
  ArrowDownLeft,
  History,
  Wallet,
  TrendingUp,
  TrendingDown,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowUpRight,
  RefreshCw,
  Filter,
  Calendar,
  DollarSign,
  Settings
} from "lucide-react";
import SystemPageHeader from "../components/layout/SystemPageHeader";

const buildMinimumScheduleTime = () => {
  const minimum = new Date();
  minimum.setMinutes(minimum.getMinutes() + 5, 0, 0);
  return minimum.toISOString().slice(0, 16);
};

const TransferHub = ({ auth }) => {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrency();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState("send");

  // Transfer history filters
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Send money form state
  const [selectedUser, setSelectedUser] = useState(null);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [saveRecipient, setSaveRecipient] = useState(false);
  const [isScheduledTransfer, setIsScheduledTransfer] = useState(false);
  const [scheduledFor, setScheduledFor] = useState("");
  const [scheduledMin, setScheduledMin] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);

  const { data: walletBalance, refetch: refetchWalletBalance } = useWalletBalance({ enabled: !auth?.isGuest });
  const {
    data: limits = {
      dailyRemaining: 0,
      monthlyRemaining: 0,
      requirePinAbove: 1000,
      otpDefaults: { phoneNumber: "", email: "", preferredChannel: "sms", emailOnlyMode: false },
    },
    refetch: refetchLimits,
  } = useTransferLimits({ enabled: !auth?.isGuest });
  const {
    data: transferHistory = {
      transfers: [],
      stats: { totalSent: 0, totalReceived: 0, transferCount: 0 },
    },
    isLoading: transfersLoading,
    isFetching: transfersFetching,
    refetch: refetchTransfers,
  } = useMyTransfers({
    type: filterType,
    status: filterStatus,
    enabled: !auth?.isGuest,
  });
  const initiateTransferMutation = useInitiateTransfer();
  const sendTransferOtpMutation = useSendTransferOtp();
  const { data: savedContacts = [] } = useSavedTransferContacts({ enabled: !auth?.isGuest });

  const {
    data: feasibility = {
      canTransfer: true,
      reasons: [],
      risk: { score: 0, level: "low", shouldRequirePin: false },
      impact: null,
      suggestions: [],
      requiresOtp: true,
      otpDeliveryHint: "email",
    },
    isFetching: feasibilityLoading,
  } = useTransferFeasibility(
    {
      receiverId: selectedUser?.userId,
      amount,
      description,
      scheduledFor: isScheduledTransfer ? scheduledFor : undefined,
    },
    { enabled: !auth?.isGuest }
  );

  const balance = Number(walletBalance?.balance || 0);
  const transfers = transferHistory.transfers || [];
  const stats = transferHistory.stats || { totalSent: 0, totalReceived: 0, transferCount: 0 };
  const loading = initiateTransferMutation.isPending;

  const errorReasons = (feasibility?.reasons || []).filter((reason) => reason.severity === "error");
  const warningReasons = (feasibility?.reasons || []).filter((reason) => reason.severity === "warning");

  const refreshTransferData = () => {
    refetchTransfers();
    refetchLimits();
    refetchWalletBalance();
  };

  const handleReviewTransfer = () => {
    if (!selectedUser) {
      toast.warning("Please select a recipient");
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      toast.warning("Please enter a valid amount");
      return;
    }
    if (parseFloat(amount) > balance) {
      toast.error("Insufficient balance");
      return;
    }

    if (errorReasons.length > 0) {
      toast.error(errorReasons[0]?.message || "Transfer currently not feasible");
      return;
    }

    if (isScheduledTransfer && !scheduledFor) {
      toast.warning("Please select a schedule date/time");
      return;
    }

    setShowPreview(true);
  };

  const handleConfirmTransfer = () => {
    setShowPreview(false);
    setShowPinModal(true);
  };

  const handleSubmitTransfer = async ({ otpSessionId, otpCode }) => {
    try {
      const data = await initiateTransferMutation.mutateAsync({
        receiverIdentifier: selectedUser.userId,
        amount: parseFloat(amount),
        description,
        otpSessionId,
        otpCode,
        saveRecipient,
        scheduledFor: isScheduledTransfer ? scheduledFor : undefined,
      });

      // Success!
      const successMessage =
        data?.status === "pending"
          ? `Transfer scheduled successfully. ID: ${data.transferId}`
          : `Transfer successful. Transfer ID: ${data.transferId}`;
      toast.success(successMessage);
      
      // Reset form
      setSelectedUser(null);
      setAmount("");
      setDescription("");
      setSaveRecipient(false);
      setIsScheduledTransfer(false);
      setScheduledFor("");
      setScheduledMin("");
      setShowPinModal(false);
      refreshTransferData();
      
      // Switch to history tab
      setActiveTab("history");
    } catch (error) {
      toast.error(error.message || "Transfer failed. Please try again.");
    }
  };

  const calculateFee = () => {
    // Currently no fees, but you can implement fee logic here
    return 0;
  };

  const fee = calculateFee(amount);
  const total = parseFloat(amount || 0) + fee;
  const riskToneClass =
    feasibility?.risk?.level === "high"
      ? "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700"
      : feasibility?.risk?.level === "medium"
      ? "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700"
      : "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700";

  // Block guest users
  if (auth?.isGuest) {
    return <GuestRestricted featureName="Money Transfers" />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <SystemPageHeader
        tagline="DETERMINISTIC MONEY FLOW"
        title="Money Transfers"
        subtitle="Send and receive money instantly."
        actions={(
          <>
            <button
              onClick={() => navigate('/wallet')}
              className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-left transition hover:border-white/20 hover:bg-white/10"
            >
              <div className="rounded-lg border border-white/10 bg-white/5 p-2">
                <Wallet className="h-4 w-4 text-slate-300" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Available Balance</p>
                <p className="text-sm font-semibold text-white">{formatCurrency(balance)}</p>
              </div>
            </button>

            <button
              type="button"
              onClick={refreshTransferData}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-200 transition hover:border-white/20 hover:bg-white/10"
              title="Refresh data"
            >
              <RefreshCw className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => navigate('/wallet')}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-200 transition hover:border-white/20 hover:bg-white/10"
              title="Wallet settings"
            >
              <Settings className="h-4 w-4" />
            </button>
          </>
        )}
      />

      <section className="rounded-2xl border border-light-border-default dark:border-white/5 bg-light-surface-secondary dark:bg-[#0D1117] p-4 shadow-premium dark:shadow-card-dark">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="flex h-[92px] items-center justify-between rounded-xl border border-light-border-default dark:border-white/10 bg-light-surface-primary dark:bg-white/[0.03] p-4 shadow-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-light-text-secondary dark:text-slate-300">
                Total Sent
              </p>
              <p className="mt-1 text-lg font-bold text-light-text-primary dark:text-white">{formatCurrency(stats.totalSent)}</p>
            </div>
            <ArrowUpRight className="h-4 w-4 text-blue-500 dark:text-blue-300" />
          </div>

          <div className="flex h-[92px] items-center justify-between rounded-xl border border-light-border-default dark:border-white/10 bg-light-surface-primary dark:bg-white/[0.03] p-4 shadow-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-light-text-secondary dark:text-slate-300">
                Total Received
              </p>
              <p className="mt-1 text-lg font-bold text-light-text-primary dark:text-white">{formatCurrency(stats.totalReceived)}</p>
            </div>
            <ArrowDownLeft className="h-4 w-4 text-emerald-500 dark:text-emerald-300" />
          </div>

          <div className="flex h-[92px] items-center justify-between rounded-xl border border-light-border-default dark:border-white/10 bg-light-surface-primary dark:bg-white/[0.03] p-4 shadow-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-light-text-secondary dark:text-slate-300">
                Total Transfers
              </p>
              <p className="mt-1 text-lg font-bold text-light-text-primary dark:text-white">{stats.transferCount}</p>
            </div>
            <RefreshCw className="h-4 w-4 text-violet-500 dark:text-violet-300" />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-light-border-default dark:border-white/5 bg-light-surface-secondary dark:bg-[#0D1117] p-3 shadow-premium dark:shadow-card-dark">
        <div className="flex overflow-x-auto gap-2 custom-scrollbar pb-1">
          {[
            { id: "send", label: "Send Money", icon: Send },
            { id: "history", label: "Transfer History", icon: History },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
                  isActive
                    ? "bg-blue-500/80 text-white shadow-[0_0_16px_rgba(59,130,246,0.35)]"
                    : "bg-light-bg-accent text-light-text-secondary hover:bg-light-bg-hover dark:bg-white/[0.04] dark:text-slate-300 dark:hover:bg-white/[0.08]"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-light-border-default dark:border-white/5 bg-light-surface-secondary dark:bg-[#0D1117] p-6 shadow-premium dark:shadow-card-dark">
        <div className="p-6">
            {/* Send Money Tab */}
            {activeTab === "send" && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Who do you want to send money to?
                  </label>
                  <UserSearchInput
                    onSelectUser={setSelectedUser}
                    selectedUser={selectedUser}
                    savedContacts={savedContacts}
                  />
                </div>

                {selectedUser && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        How much?
                      </label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="number"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="0.00"
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-dark-border-default rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-dark-bg-secondary text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                          min="0"
                          step="0.01"
                        />
                      </div>
                      {amount && (
                        <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                          <div className="flex justify-between">
                            <span>Fee:</span>
                            <span>{formatCurrency(fee)}</span>
                          </div>
                          <div className="flex justify-between font-medium text-gray-800 dark:text-white mt-1">
                            <span>Total:</span>
                            <span>{formatCurrency(total)}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Add a note (optional)
                      </label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="What's this for?"
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border-default rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-dark-bg-secondary text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                      />
                    </div>

                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      <input
                        type="checkbox"
                        checked={saveRecipient}
                        onChange={(event) => setSaveRecipient(event.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      Save this recipient for future transfers
                    </label>

                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                        <input
                          type="checkbox"
                          checked={isScheduledTransfer}
                          onChange={(event) => {
                            const checked = event.target.checked;
                            setIsScheduledTransfer(checked);
                            if (checked) {
                              const minimum = buildMinimumScheduleTime();
                              setScheduledMin(minimum);
                              setScheduledFor((current) => {
                                if (!current || current < minimum) {
                                  return minimum;
                                }

                                return current;
                              });
                            } else {
                              setScheduledFor("");
                              setScheduledMin("");
                            }
                          }}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        Schedule this transfer
                      </label>

                      {isScheduledTransfer && (
                        <input
                          type="datetime-local"
                          value={scheduledFor}
                          min={scheduledMin || undefined}
                          onChange={(event) => setScheduledFor(event.target.value)}
                          className="w-full px-4 py-2.5 border border-gray-300 dark:border-dark-border-default rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-dark-bg-secondary text-gray-900 dark:text-white"
                        />
                      )}
                    </div>

                    {limits && (
                      <div className="rounded-lg border border-white/5 bg-white/[0.03] p-4">
                        <p className="mb-2 text-sm font-medium text-blue-300">
                          Transfer Limits
                        </p>
                          <div className="space-y-1 text-xs text-slate-300">
                          <div className="flex justify-between">
                            <span>Daily Remaining:</span>
                            <span className="font-medium">{formatCurrency(limits.dailyRemaining)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Monthly Remaining:</span>
                            <span className="font-medium">{formatCurrency(limits.monthlyRemaining)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>OTP Delivery:</span>
                            <span className="font-medium uppercase">{feasibility?.otpDeliveryHint || "email"}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {(feasibilityLoading || feasibility?.impact || warningReasons.length > 0) && (
                      <div className="rounded-lg border p-4 bg-white dark:bg-dark-bg-secondary border-gray-200 dark:border-dark-border-default">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-semibold text-gray-800 dark:text-white">Smart Transfer Insights</p>
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${riskToneClass}`}>
                            Risk {feasibility?.risk?.level || "low"} ({Number(feasibility?.risk?.score || 0)})
                          </span>
                        </div>

                        {feasibilityLoading ? (
                          <p className="text-xs text-gray-500 dark:text-gray-400">Analyzing transfer impact...</p>
                        ) : (
                          <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
                            {feasibility?.impact && (
                              <>
                                <div className="flex justify-between">
                                  <span>Balance after transfer:</span>
                                  <span className="font-medium">{formatCurrency(feasibility.impact.balanceAfter || 0)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Amount vs monthly income:</span>
                                  <span className="font-medium">{Number(feasibility.impact.amountVsIncomePct || 0).toFixed(1)}%</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>First-time recipient:</span>
                                  <span className="font-medium">{feasibility.impact.firstTimeRecipient ? "Yes" : "No"}</span>
                                </div>
                              </>
                            )}

                            {warningReasons.map((reason, index) => (
                              <p key={`warning-${index}`} className="text-amber-600 dark:text-amber-400">• {reason.message}</p>
                            ))}

                            {(feasibility?.suggestions || []).slice(0, 2).map((suggestion, index) => (
                              <p key={`suggestion-${index}`}>• {suggestion}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <button
                      onClick={handleReviewTransfer}
                      disabled={
                        loading ||
                        !selectedUser ||
                        !amount ||
                        parseFloat(amount) <= 0 ||
                        errorReasons.length > 0 ||
                        (isScheduledTransfer && !scheduledFor)
                      }
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Send className="w-5 h-5" />
                      {isScheduledTransfer ? "Review Scheduled Transfer" : "Review Transfer"}
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Transfer History Tab */}
            {activeTab === "history" && (
                <div className="space-y-4">
                {/* Filters */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex gap-2">
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-100 focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All Transfers</option>
                      <option value="sent">Sent</option>
                      <option value="received">Received</option>
                    </select>

                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-100 focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All Status</option>
                      <option value="completed">Completed</option>
                      <option value="pending">Pending</option>
                      <option value="failed">Failed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>

                  <button
                    onClick={refreshTransferData}
                    className="rounded-lg border border-white/10 bg-white/[0.03] p-2 text-slate-300 transition-colors hover:border-blue-400/40 hover:text-blue-300"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>
                </div>

                {/* Transfer List */}
                {transfersLoading || transfersFetching ? (
                  <div className="py-12 text-center">
                    <RefreshCw className="mx-auto h-8 w-8 animate-spin text-blue-300" />
                    <p className="mt-2 text-slate-400">Loading transfers...</p>
                  </div>
                ) : transfers.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] py-12 text-center">
                    <History className="mx-auto h-12 w-12 text-slate-500" />
                    <p className="mt-2 text-slate-300">No transfers found</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {transfers.map((transfer) => (
                      <TransferCard
                        key={transfer._id}
                        transfer={transfer}
                        currentUserId={auth?.user?._id}
                        onRefresh={refreshTransferData}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
        </div>
      </section>

        {/* Modals */}
        {showPreview && (
          <TransferPreview
            sender={auth?.user}
            receiver={selectedUser}
            amount={parseFloat(amount)}
            fee={fee}
            description={description}
            balance={balance}
            scheduledFor={isScheduledTransfer ? scheduledFor : null}
            risk={feasibility?.risk || null}
            onConfirm={handleConfirmTransfer}
            onCancel={() => setShowPreview(false)}
          />
        )}

        {showPinModal && (
          <PinInputModal
            onSubmit={handleSubmitTransfer}
            onSendOtp={async ({ phoneNumber, savePhone, fallbackEmail }) =>
              sendTransferOtpMutation.mutateAsync({ phoneNumber, savePhone, fallbackEmail })
            }
            onCancel={() => setShowPinModal(false)}
            isSendingOtp={sendTransferOtpMutation.isPending}
            defaultPhone={limits?.otpDefaults?.phoneNumber || ""}
            fallbackEmail={limits?.otpDefaults?.email || auth?.user?.email || ""}
            emailOnlyMode={Boolean(limits?.otpDefaults?.emailOnlyMode)}
            recipientName={selectedUser?.name || "recipient"}
          />
        )}
      </div>
  );
};

export default TransferHub;
