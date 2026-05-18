import React, { useState } from 'react';
import { useCurrency } from '../../context/CurrencyContext';
import { CurrencyInput, Overlay, useToast } from '../ui';
import { X, DollarSign, Calendar, FileText, CreditCard } from 'lucide-react';

const RecordPaymentModal = ({ loan, onClose, onSuccess }) => {
  const { formatCurrency } = useCurrency();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    paymentAmount: loan?.emiAmount?.toString() || '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentType: 'regular',
    notes: '',
    createTransaction: true
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const paymentData = {
        paymentAmount: parseFloat(formData.paymentAmount),
        paymentDate: formData.paymentDate,
        paymentType: formData.paymentType,
        notes: formData.notes,
        createTransaction: formData.createTransaction
      };

      console.log('Recording payment:', paymentData);
      await onSuccess(paymentData);
      console.log('Payment recorded successfully');
      onClose();
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error(error.message || error.response?.data?.message || 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Overlay
      isOpen
      onClose={onClose}
      containerClassName="z-[9999]"
      panelClassName="max-w-md rounded-2xl border border-light-border-default dark:border-white/10 bg-light-surface-secondary dark:bg-[#0D1117] shadow-xl overflow-hidden"
      ariaLabelledBy="record-payment-title"
    >
        <div className="flex justify-between items-center p-6 border-b border-light-border-default dark:border-white/10">
          <h2 id="record-payment-title" className="text-xl font-semibold text-light-text-primary dark:text-white">
            Record Payment
          </h2>
          <button
            onClick={onClose}
            className="text-light-text-tertiary dark:text-slate-500 hover:text-light-text-primary dark:hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            {/* Loan Info */}
            <div className="bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/10 dark:border-blue-500/20 p-4 rounded-xl">
              <h3 className="font-medium text-light-text-primary dark:text-white mb-2">
                {loan?.loanName}
              </h3>
              <div className="text-sm text-light-text-secondary dark:text-slate-400 space-y-1">
                <div className="flex justify-between">
                  <span>Regular EMI:</span>
                  <span className="font-medium text-light-text-primary dark:text-white">{formatCurrency(loan?.emiAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Remaining Balance:</span>
                  <span className="font-medium text-light-text-primary dark:text-white">{formatCurrency(loan?.remainingBalance)}</span>
                </div>
              </div>
            </div>

            {/* Payment Amount */}
            <div>
              <label className="block text-sm font-medium text-light-text-secondary dark:text-slate-400 mb-2">
                <DollarSign className="w-4 h-4 inline mr-1" />
                Payment Amount *
              </label>
              <CurrencyInput
                name="paymentAmount"
                value={formData.paymentAmount}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-light-border-default dark:border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 bg-light-surface-primary dark:bg-white/[0.05] text-light-text-primary dark:text-white outline-none"
                placeholder="Enter payment amount"
              />
            </div>

            {/* Payment Date */}
            <div>
              <label className="block text-sm font-medium text-light-text-secondary dark:text-slate-400 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Payment Date *
              </label>
              <input
                type="date"
                name="paymentDate"
                value={formData.paymentDate}
                onChange={handleChange}
                required
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-light-border-default dark:border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 bg-light-surface-primary dark:bg-white/[0.05] text-light-text-primary dark:text-white outline-none"
              />
            </div>

            {/* Payment Type */}
            <div>
              <label className="block text-sm font-medium text-light-text-secondary dark:text-slate-400 mb-2">
                <CreditCard className="w-4 h-4 inline mr-1" />
                Payment Type *
              </label>
              <select
                name="paymentType"
                value={formData.paymentType}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-light-border-default dark:border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 bg-light-surface-primary dark:bg-white/[0.05] text-light-text-primary dark:text-white outline-none"
              >
                <option value="regular">Regular EMI</option>
                <option value="extra">Extra Payment</option>
                <option value="prepayment">Prepayment (Extra Principal)</option>
                <option value="final">Final Payment</option>
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-light-text-secondary dark:text-slate-400 mb-2">
                <FileText className="w-4 h-4 inline mr-1" />
                Notes (Optional)
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows="3"
                className="w-full px-3 py-2 border border-light-border-default dark:border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 bg-light-surface-primary dark:bg-white/[0.05] text-light-text-primary dark:text-white outline-none"
                placeholder="Add any notes about this payment..."
              />
            </div>

            {/* Create Transaction Checkbox */}
            <div className="flex items-center">
              <input
                type="checkbox"
                name="createTransaction"
                checked={formData.createTransaction}
                onChange={handleChange}
                className="w-4 h-4 text-blue-600 border-light-border-default dark:border-white/20 rounded bg-light-surface-primary dark:bg-white/[0.05] focus:ring-blue-500"
              />
              <label className="ml-2 text-sm text-light-text-secondary dark:text-slate-400">
                Automatically create transaction record
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-light-border-default dark:border-white/10 text-light-text-secondary dark:text-slate-400 rounded-xl hover:bg-light-bg-hover dark:hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-blue-400/50 transition-colors shadow-lg shadow-blue-500/20"
            >
              {loading ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </form>
    </Overlay>
  );
};

export default RecordPaymentModal;
