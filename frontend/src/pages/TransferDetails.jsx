import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCurrency } from "../context/CurrencyContext";
import { InlineEditor, useToast } from "../components/ui";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import TransferStatusBadge from "../components/transfer/TransferStatusBadge";
import GuestRestricted from "../components/GuestRestricted";
import { useCancelTransfer, useReverseTransfer, useTransferDetails } from "../hooks/useTransfers";
import {
  ArrowLeft,
  User,
  Calendar,
  Clock,
  MessageSquare,
  Download,
  RefreshCw,
  XCircle,
  RotateCcw,
  ArrowUpRight,
  ArrowDownLeft,
  AlertCircle,
  CheckCircle,
  DollarSign,
  Hash
} from "lucide-react";

const TransferDetails = ({ auth }) => {
  const { transferId } = useParams();
  const navigate = useNavigate();
  const { formatCurrency } = useCurrency();
  const toast = useToast();

  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showReverseModal, setShowReverseModal] = useState(false);
  const [reversePin, setReversePin] = useState("");
  const [reverseReason, setReverseReason] = useState("");

  const {
    data: transfer,
    isLoading: loading,
    error,
  } = useTransferDetails(transferId, { enabled: !auth?.isGuest });

  const cancelTransferMutation = useCancelTransfer();
  const reverseTransferMutation = useReverseTransfer();
  const actionLoading = cancelTransferMutation.isPending || reverseTransferMutation.isPending;

  const handleCancel = async () => {
    setShowCancelConfirm(true);
  };

  const confirmCancelTransfer = async () => {

    try {
      await cancelTransferMutation.mutateAsync({
        transferId,
        reason: "Cancelled by user",
      });

      toast.success("Transfer cancelled successfully");
      setShowCancelConfirm(false);
    } catch (err) {
      toast.error(err.message || "Failed to cancel transfer");
    }
  };

  const handleReverse = async () => {
    setReversePin("");
    setReverseReason("");
    setShowReverseModal(true);
  };

  const confirmReverseTransfer = async () => {
    if (!reversePin) {
      toast.warning("Enter your transfer PIN to continue");
      return;
    }

    if (!reverseReason.trim()) {
      toast.warning("Please provide a reason for reversal");
      return;
    }

    try {
      await reverseTransferMutation.mutateAsync({
        transferId,
        reason: reverseReason.trim(),
        transferPin: reversePin,
      });

      toast.success("Transfer reversed successfully");
      setShowReverseModal(false);
      setReversePin("");
      setReverseReason("");
    } catch (err) {
      toast.error(err.message || "Failed to reverse transfer");
    }
  };

  const handleDownloadReceipt = () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Header
      doc.setFontSize(22);
      doc.setTextColor(33, 37, 41);
      doc.text("TRANSFER RECEIPT", pageWidth / 2, 20, { align: "center" });
      
      doc.setFontSize(10);
      doc.setTextColor(108, 117, 125);
      doc.text("Smart Financial Tracker", pageWidth / 2, 28, { align: "center" });

      doc.setDrawColor(222, 226, 230);
      doc.line(14, 35, pageWidth - 14, 35);

      // Meta info
      doc.setFontSize(10);
      doc.setTextColor(73, 80, 87);
      doc.text(`Receipt ID: ${transfer._id}`, 14, 45);
      doc.text(`Date: ${new Date(transfer.createdAt).toLocaleString()}`, 14, 52);
      doc.text(`Status: ${transfer.status.toUpperCase()}`, 14, 59);

      // Main Table
      const tableData = [
        [{ content: 'SENDER DETAILS', colSpan: 2, styles: { fillColor: [248, 249, 250], fontStyle: 'bold' } }],
        ['Name', transfer.sender.userName],
        ['Email', transfer.sender.userEmail],
        ['Account No.', transfer.sender.accountNumber || 'N/A'],
        [{ content: 'RECEIVER DETAILS', colSpan: 2, styles: { fillColor: [248, 249, 250], fontStyle: 'bold' } }],
        ['Name', transfer.receiver.userName],
        ['Email', transfer.receiver.userEmail],
        ['Account No.', transfer.receiver.accountNumber || 'N/A'],
        [{ content: 'TRANSACTION DETAILS', colSpan: 2, styles: { fillColor: [248, 249, 250], fontStyle: 'bold' } }],
        ['Transfer Amount', formatCurrency(transfer.amount)],
        ['Platform Fee', formatCurrency(transfer.fee)],
        ['Total Net Amount', formatCurrency(transfer.amount + transfer.fee)]
      ];

      if (transfer.description) {
        tableData.push(['Note', transfer.description]);
      }
      
      if (transfer.senderTransactionId) {
        const sTrxId = typeof transfer.senderTransactionId === 'object' ? 
          (transfer.senderTransactionId._id || transfer.senderTransactionId.id) : 
          transfer.senderTransactionId;
        tableData.push(['Sender Trx ID', String(sTrxId)]);
      }
      
      if (transfer.receiverTransactionId) {
        const rTrxId = typeof transfer.receiverTransactionId === 'object' ? 
          (transfer.receiverTransactionId._id || transfer.receiverTransactionId.id) : 
          transfer.receiverTransactionId;
        tableData.push(['Receiver Trx ID', String(rTrxId)]);
      }

      autoTable(doc, {
        startY: 68,
        head: [],
        body: tableData,
        theme: 'grid',
        styles: { fontSize: 10, cellPadding: 6 },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 50, textColor: [73, 80, 87] },
          1: { textColor: [33, 37, 41] }
        },
        alternateRowStyles: { fillColor: [255, 255, 255] }
      });

      // Footer
      const finalY = doc.lastAutoTable?.finalY || 150;
      doc.setFontSize(10);
      doc.setTextColor(173, 181, 189);
      doc.text("Thank you for using Smart Financial Tracker", pageWidth / 2, finalY + 20, { align: "center" });

      doc.save(`Transfer_Receipt_${transfer._id}.pdf`);
      toast.success("Receipt downloaded successfully!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate receipt. Please try again.");
    }
  };

  // Block guest users
  if (auth?.isGuest) {
    return <GuestRestricted featureName="Transfer Details" />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            <h3 className="text-lg font-semibold text-red-800 dark:text-red-300">
              Error Loading Transfer
            </h3>
          </div>
          <p className="text-red-700 dark:text-red-400 mb-4">{error?.message || "Failed to load transfer details"}</p>
          <button
            onClick={() => navigate("/transfers")}
            className="flex items-center gap-2 text-red-600 dark:text-red-400 hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Transfers
          </button>
        </div>
      </div>
    );
  }

  if (!transfer) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 dark:text-gray-400">Transfer not found</p>
        <button
          onClick={() => navigate("/transfers")}
          className="mt-4 text-blue-600 dark:text-blue-400 hover:underline"
        >
          Back to Transfers
        </button>
      </div>
    );
  }

  const isSender = transfer.sender.userId === auth?.user?.id;
  const canCancel = isSender && ["initiated", "pending"].includes(transfer.status);
  const canReverse = isSender && transfer.status === "completed";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
        {/* Back Button */}
        <button
          onClick={() => navigate("/transfers")}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Transfers
        </button>

        {/* Header */}
        <div className="bg-white dark:bg-dark-surface-elevated rounded-xl shadow-sm border border-gray-200 dark:border-dark-border-default p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                Transfer Details
              </h1>
              <TransferStatusBadge status={transfer.status} size="md" />
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 dark:text-gray-400">Amount</p>
              <p className={`text-3xl font-bold ${
                isSender
                  ? "text-red-600 dark:text-red-400"
                  : "text-green-600 dark:text-green-400"
              }`}>
                {isSender ? "-" : "+"}
                {formatCurrency(transfer.amount)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-dark-border-subtle">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Calendar className="w-4 h-4" />
              <span>
                {new Date(transfer.createdAt).toLocaleString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit"
                })}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Hash className="w-4 h-4" />
              <span className="font-mono text-xs">{transfer._id}</span>
            </div>
          </div>
        </div>

        {/* Transfer Flow */}
        <div className="bg-white dark:bg-dark-surface-elevated rounded-xl shadow-sm border border-gray-200 dark:border-dark-border-default p-6">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            Transfer Flow
          </h2>
          
          <div className="flex items-center justify-between">
            <div className="text-center flex-1">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-3 ${
                isSender
                  ? "bg-red-100 dark:bg-red-900/30"
                  : "bg-gray-100 dark:bg-gray-800"
              }`}>
                <User className={`w-10 h-10 ${
                  isSender
                    ? "text-red-600 dark:text-red-400"
                    : "text-gray-600 dark:text-gray-400"
                }`} />
              </div>
              <p className="font-medium text-gray-800 dark:text-white mb-1">
                {transfer.sender.userName}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {transfer.sender.userEmail}
              </p>
              {isSender && (
                <span className="inline-block mt-2 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-1 rounded-full">
                  You
                </span>
              )}
            </div>

            <div className="px-6">
              <ArrowUpRight className="w-12 h-12 text-gray-400 dark:text-gray-600" />
            </div>

            <div className="text-center flex-1">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-3 ${
                !isSender
                  ? "bg-green-100 dark:bg-green-900/30"
                  : "bg-gray-100 dark:bg-gray-800"
              }`}>
                <User className={`w-10 h-10 ${
                  !isSender
                    ? "text-green-600 dark:text-green-400"
                    : "text-gray-600 dark:text-gray-400"
                }`} />
              </div>
              <p className="font-medium text-gray-800 dark:text-white mb-1">
                {transfer.receiver.userName}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {transfer.receiver.userEmail}
              </p>
              {!isSender && (
                <span className="inline-block mt-2 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-1 rounded-full">
                  You
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="bg-white dark:bg-dark-surface-elevated rounded-xl shadow-sm border border-gray-200 dark:border-dark-border-default p-6">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            Transaction Details
          </h2>

          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-gray-100 dark:border-dark-border-subtle">
              <span className="text-gray-600 dark:text-gray-400">Amount</span>
              <span className="font-medium text-gray-800 dark:text-white">
                {formatCurrency(transfer.amount)}
              </span>
            </div>

            {transfer.fee > 0 && (
              <div className="flex justify-between py-2 border-b border-gray-100 dark:border-dark-border-subtle">
                <span className="text-gray-600 dark:text-gray-400">Fee</span>
                <span className="font-medium text-gray-800 dark:text-white">
                  {formatCurrency(transfer.fee)}
                </span>
              </div>
            )}

            <div className="flex justify-between py-2 border-b border-gray-100 dark:border-dark-border-subtle">
              <span className="font-medium text-gray-800 dark:text-white">Net Amount</span>
              <span className="font-bold text-gray-900 dark:text-white">
                {formatCurrency(transfer.netAmount)}
              </span>
            </div>

            {transfer.description && (
              <div className="pt-2">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Note</span>
                </div>
                <p className="text-gray-800 dark:text-white bg-gray-50 dark:bg-dark-bg-secondary rounded-lg p-3 border border-gray-200 dark:border-dark-border-default">
                  {transfer.description}
                </p>
              </div>
            )}

            {transfer.completedAt && (
              <div className="flex items-center gap-2 py-2 text-sm text-gray-600 dark:text-gray-400">
                <CheckCircle className="w-4 h-4" />
                <span>
                  Completed on {new Date(transfer.completedAt).toLocaleString()}
                </span>
              </div>
            )}

            {transfer.failureReason && (
              <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800 dark:text-red-300">Failure Reason</p>
                  <p className="text-sm text-red-700 dark:text-red-400">{transfer.failureReason}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleDownloadReceipt}
            className="flex-1 py-3 px-4 border border-gray-300 dark:border-dark-border-default text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-dark-surface-hover transition-colors flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download Receipt
          </button>

          {canCancel && (
            <button
              onClick={handleCancel}
              disabled={actionLoading}
              className="flex-1 py-3 px-4 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-400 font-medium rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <XCircle className="w-4 h-4" />
              Cancel Transfer
            </button>
          )}

          {canReverse && (
            <button
              onClick={handleReverse}
              disabled={actionLoading}
              className="flex-1 py-3 px-4 border border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-400 font-medium rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RotateCcw className="w-4 h-4" />
              Reverse Transfer
            </button>
          )}
        </div>

        <InlineEditor
          isOpen={showCancelConfirm}
          title="Cancel Transfer"
          subtitle="This action may not be reversible"
          onClose={() => {
            if (actionLoading) return;
            setShowCancelConfirm(false);
          }}
          className="max-w-xl"
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Are you sure you want to cancel this transfer?
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowCancelConfirm(false)}
                disabled={actionLoading}
                className="flex-1 px-4 py-2.5 rounded-lg border border-light-border-default dark:border-dark-border-strong text-light-text-primary dark:text-dark-text-primary bg-light-surface-primary dark:bg-dark-surface-secondary font-semibold"
              >
                Keep Transfer
              </button>
              <button
                type="button"
                onClick={confirmCancelTransfer}
                disabled={actionLoading}
                className="flex-1 px-4 py-2.5 rounded-lg bg-gradient-to-r from-danger-500 to-danger-600 text-white font-semibold disabled:opacity-60"
              >
                {actionLoading ? "Cancelling..." : "Cancel Transfer"}
              </button>
            </div>
          </div>
        </InlineEditor>

        <InlineEditor
          isOpen={showReverseModal}
          title="Reverse Transfer"
          subtitle="Provide PIN and reason to proceed"
          onClose={() => {
            if (actionLoading) return;
            setShowReverseModal(false);
          }}
          className="max-w-xl"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Transfer PIN
              </label>
              <input
                type="password"
                value={reversePin}
                onChange={(e) => setReversePin(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                placeholder="Enter transfer PIN"
                disabled={actionLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Reversal Reason
              </label>
              <textarea
                value={reverseReason}
                onChange={(e) => setReverseReason(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                placeholder="Why are you reversing this transfer?"
                disabled={actionLoading}
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowReverseModal(false)}
                disabled={actionLoading}
                className="flex-1 px-4 py-2.5 rounded-lg border border-light-border-default dark:border-dark-border-strong text-light-text-primary dark:text-dark-text-primary bg-light-surface-primary dark:bg-dark-surface-secondary font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmReverseTransfer}
                disabled={actionLoading}
                className="flex-1 px-4 py-2.5 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold disabled:opacity-60"
              >
                {actionLoading ? "Reversing..." : "Confirm Reversal"}
              </button>
            </div>
          </div>
        </InlineEditor>
      </div>
  );
};

export default TransferDetails;
