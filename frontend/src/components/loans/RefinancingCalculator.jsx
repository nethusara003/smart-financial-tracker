import React, { useState, useEffect } from 'react';
import { useCurrency } from '../../context/CurrencyContext';
import { useToast } from '../ui';
import { TrendingDown, AlertCircle, CheckCircle2 } from 'lucide-react';
import * as loanAPI from '../../services/api';

const RefinancingCalculator = ({ existingLoan = null }) => {
  const { formatCurrency } = useCurrency();
  const toast = useToast();
  const [formData, setFormData] = useState({
    currentPrincipal: existingLoan?.remainingBalance?.toString() || '',
    currentRate: existingLoan?.interestRate?.toString() || '',
    remainingTenure: existingLoan ? Math.ceil((new Date(existingLoan.endDate) - new Date()) / (1000 * 60 * 60 * 24 * 30)) : '',
    newRate: '',
    newTenure: '',
    refinancingFee: '',
    prepaymentPenalty: existingLoan?.prepaymentPenalty?.toString() || '0'
  });

  const [currentLoanDetails, setCurrentLoanDetails] = useState(null);
  const [newLoanDetails, setNewLoanDetails] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [calculating, setCalculating] = useState(false);

  useEffect(() => {
    if (existingLoan) {
      const remainingMonths = Math.ceil((new Date(existingLoan.endDate) - new Date()) / (1000 * 60 * 60 * 24 * 30));
      setFormData(prev => ({
        ...prev,
        currentPrincipal: existingLoan.remainingBalance.toString(),
        currentRate: existingLoan.interestRate.toString(),
        remainingTenure: remainingMonths.toString(),
        prepaymentPenalty: existingLoan.prepaymentPenalty?.toString() || '0'
      }));
    }
  }, [existingLoan]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const calculateRefinancing = async () => {
    // Validate input values
    const currentPrincipal = parseFloat(formData.currentPrincipal);
    const currentRate = parseFloat(formData.currentRate);
    const remainingTenure = parseInt(formData.remainingTenure);
    const newRate = parseFloat(formData.newRate);
    
    if (isNaN(currentPrincipal) || currentPrincipal <= 0 ||
        isNaN(currentRate) || currentRate <= 0 ||
        isNaN(remainingTenure) || remainingTenure <= 0 ||
        isNaN(newRate) || newRate <= 0) {
      toast.warning('Please enter valid positive numbers for all required fields');
      return;
    }
    
    setCalculating(true);
    try {
      // Calculate current loan details
      const currentResponse = await loanAPI.calculateEMI(
        currentPrincipal,
        currentRate,
        remainingTenure
      );

      // Calculate new loan details
      const newTenure = formData.newTenure ? parseInt(formData.newTenure) : remainingTenure;
      const newResponse = await loanAPI.calculateEMI(
        currentPrincipal,
        newRate,
        newTenure
      );

      const refinancingFee = formData.refinancingFee ? parseFloat(formData.refinancingFee) : 0;
      const prepaymentPenalty = formData.prepaymentPenalty ? 
        (currentPrincipal * parseFloat(formData.prepaymentPenalty) / 100) : 0;

      const currentTotalCost = currentResponse.calculation.totalAmount;
      const newTotalCost = newResponse.calculation.totalAmount + refinancingFee + prepaymentPenalty;

      const monthlySavings = currentResponse.calculation.emiAmount - newResponse.calculation.emiAmount;
      const totalSavings = currentTotalCost - newTotalCost;
      const breakEvenMonths = totalSavings > 0 ? Math.ceil((refinancingFee + prepaymentPenalty) / monthlySavings) : null;

      setCurrentLoanDetails(currentResponse.calculation);
      setNewLoanDetails(newResponse.calculation);
      setComparison({
        currentTotalCost,
        newTotalCost,
        monthlySavings,
        totalSavings,
        refinancingFee,
        prepaymentPenalty,
        upfrontCost: refinancingFee + prepaymentPenalty,
        breakEvenMonths,
        recommended: totalSavings > 0 && (breakEvenMonths === null || breakEvenMonths < newTenure)
      });
    } catch (error) {
      console.error('Calculation error:', error);
      toast.error('Failed to calculate refinancing details');
    } finally {
      setCalculating(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* Input Form */}
      <div className="rounded-2xl border border-light-border-default dark:border-white/5 bg-light-surface-secondary dark:bg-[#0D1117] p-6 shadow-premium dark:shadow-card-dark">
        <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Current Loan Details */}
          <div className="xl:col-span-3">
            <h3 className="mb-4 text-lg font-semibold text-blue-500 dark:text-[#3B82F6]">
            Current Loan Details
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
                <label className="mb-2 block text-sm font-medium text-light-text-secondary dark:text-slate-300">
                Remaining Principal ({formatCurrency(0).replace('0', '').trim()})
              </label>
              <input
                type="number"
                name="currentPrincipal"
                value={formData.currentPrincipal}
                onChange={handleChange}
                placeholder="500000"
                  className="w-full rounded-lg border border-light-border-default dark:border-white/10 bg-light-surface-primary dark:bg-white/[0.03] px-3 py-2 text-light-text-primary dark:text-slate-100 placeholder:text-light-text-tertiary dark:placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
                <label className="mb-2 block text-sm font-medium text-light-text-secondary dark:text-slate-300">
                Current Interest Rate (% p.a.)
              </label>
              <input
                type="number"
                name="currentRate"
                value={formData.currentRate}
                onChange={handleChange}
                placeholder="10.5"
                step="0.1"
                  className="w-full rounded-lg border border-light-border-default dark:border-white/10 bg-light-surface-primary dark:bg-white/[0.03] px-3 py-2 text-light-text-primary dark:text-slate-100 placeholder:text-light-text-tertiary dark:placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
                <label className="mb-2 block text-sm font-medium text-light-text-secondary dark:text-slate-300">
                Remaining Tenure (months)
              </label>
              <input
                type="number"
                name="remainingTenure"
                value={formData.remainingTenure}
                onChange={handleChange}
                placeholder="36"
                  className="w-full rounded-lg border border-light-border-default dark:border-white/10 bg-light-surface-primary dark:bg-white/[0.03] px-3 py-2 text-light-text-primary dark:text-slate-100 placeholder:text-light-text-tertiary dark:placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* New Loan Details */}
          <div className="xl:col-span-2">
            <h3 className="mb-4 text-lg font-semibold text-blue-500 dark:text-[#3B82F6]">
            Refinancing Options
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
                <label className="mb-2 block text-sm font-medium text-light-text-secondary dark:text-slate-300">
                New Interest Rate (% p.a.) *
              </label>
              <input
                type="number"
                name="newRate"
                value={formData.newRate}
                onChange={handleChange}
                placeholder="8.5"
                step="0.1"
                required
                  className="w-full rounded-lg border border-light-border-default dark:border-white/10 bg-light-surface-primary dark:bg-white/[0.03] px-3 py-2 text-light-text-primary dark:text-slate-100 placeholder:text-light-text-tertiary dark:placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
                <label className="mb-2 block text-sm font-medium text-light-text-secondary dark:text-slate-300">
                New Tenure (months, optional)
                  <span className="ml-2 text-xs text-light-text-tertiary dark:text-slate-500">Leave blank to keep same</span>
              </label>
              <input
                type="number"
                name="newTenure"
                value={formData.newTenure}
                onChange={handleChange}
                placeholder={formData.remainingTenure}
                  className="w-full rounded-lg border border-light-border-default dark:border-white/10 bg-light-surface-primary dark:bg-white/[0.03] px-3 py-2 text-light-text-primary dark:text-slate-100 placeholder:text-light-text-tertiary dark:placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Fees and Penalties */}
          <div className="xl:col-span-1">
            <h3 className="mb-4 text-lg font-semibold text-blue-500 dark:text-[#3B82F6]">
            Costs & Penalties
            </h3>
            <div className="grid grid-cols-1 gap-4">
            <div>
                <label className="mb-2 block text-sm font-medium text-light-text-secondary dark:text-slate-300">
                Refinancing Fee ({formatCurrency(0).replace('0', '').trim()})
              </label>
              <input
                type="number"
                name="refinancingFee"
                value={formData.refinancingFee}
                onChange={handleChange}
                placeholder="10000"
                  className="w-full rounded-lg border border-light-border-default dark:border-white/10 bg-light-surface-primary dark:bg-white/[0.03] px-3 py-2 text-light-text-primary dark:text-slate-100 placeholder:text-light-text-tertiary dark:placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
                <label className="mb-2 block text-sm font-medium text-light-text-secondary dark:text-slate-300">
                Prepayment Penalty (%)
              </label>
              <input
                type="number"
                name="prepaymentPenalty"
                value={formData.prepaymentPenalty}
                onChange={handleChange}
                placeholder="2"
                step="0.1"
                  className="w-full rounded-lg border border-light-border-default dark:border-white/10 bg-light-surface-primary dark:bg-white/[0.03] px-3 py-2 text-light-text-primary dark:text-slate-100 placeholder:text-light-text-tertiary dark:placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
        </div>
        </div>

        <button
          onClick={calculateRefinancing}
          disabled={calculating || !formData.currentPrincipal || !formData.currentRate || !formData.remainingTenure || !formData.newRate}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-white transition-all hover:bg-blue-700 disabled:bg-slate-500 md:w-auto shadow-lg shadow-blue-500/20"
        >
          <TrendingDown className="w-5 h-5" />
          {calculating ? 'Calculating...' : 'Calculate Refinancing'}
        </button>
      </div>

      {/* Results */}
      {comparison && (
        <div className="space-y-6 rounded-2xl border border-light-border-default dark:border-white/5 bg-light-surface-secondary dark:bg-[#0D1117] p-6 shadow-premium dark:shadow-card-dark">
          {/* Recommendation Banner */}
          {comparison.recommended ? (
            <div className="flex items-start gap-3 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
              <CheckCircle2 className="mt-0.5 h-6 w-6 flex-shrink-0 text-emerald-500 dark:text-emerald-300" />
              <div>
                <h4 className="mb-1 font-bold text-emerald-600 dark:text-emerald-300">
                  Refinancing Recommended
                </h4>
                <p className="text-sm text-emerald-700 dark:text-emerald-200">
                  Refinancing will save you {formatCurrency(comparison.totalSavings)} over the loan tenure.
                  {comparison.breakEvenMonths && ` You'll break even in ${comparison.breakEvenMonths} months.`}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 rounded-xl border border-rose-400/30 bg-rose-500/10 p-4 shadow-[0_0_20px_rgba(244,63,94,0.1)]">
              <AlertCircle className="mt-0.5 h-6 w-6 flex-shrink-0 text-rose-500 dark:text-rose-300" />
              <div>
                <h4 className="mb-1 font-bold text-rose-600 dark:text-rose-300">
                  Refinancing Not Recommended
                </h4>
                <p className="text-sm text-rose-700 dark:text-rose-200">
                  The costs of refinancing outweigh the potential savings. You might pay {formatCurrency(Math.abs(comparison.totalSavings))} more.
                </p>
              </div>
            </div>
          )}

          {/* Comparison Cards */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Current Loan */}
            <div className="rounded-xl border border-light-border-default dark:border-white/10 bg-light-surface-primary dark:bg-white/[0.03] p-4">
              <h4 className="mb-3 flex items-center gap-2 font-semibold text-light-text-primary dark:text-slate-100">
                Current Loan
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-light-text-secondary dark:text-slate-400">Monthly EMI:</span>
                  <span className="font-medium text-light-text-primary dark:text-slate-100">{formatCurrency(currentLoanDetails.emiAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-light-text-secondary dark:text-slate-400">Total Interest:</span>
                  <span className="font-medium text-amber-600 dark:text-amber-300">{formatCurrency(currentLoanDetails.totalInterest)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-light-text-secondary dark:text-slate-400">Total Repayment:</span>
                  <span className="font-medium text-light-text-primary dark:text-slate-100">{formatCurrency(comparison.currentTotalCost)}</span>
                </div>
              </div>
            </div>

            {/* New Loan */}
            <div className="rounded-xl border border-blue-400/30 bg-blue-500/10 p-4 shadow-[0_0_20px_rgba(59,130,246,0.1)]">
              <h4 className="mb-3 flex items-center gap-2 font-semibold text-blue-600 dark:text-slate-100">
                After Refinancing
                <span className="text-xs font-normal text-blue-500 dark:text-blue-300">(New)</span>
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-light-text-secondary dark:text-slate-400">Monthly EMI:</span>
                  <span className="font-medium text-light-text-primary dark:text-slate-100">{formatCurrency(newLoanDetails.emiAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-light-text-secondary dark:text-slate-400">Total Interest:</span>
                  <span className="font-medium text-amber-600 dark:text-amber-300">{formatCurrency(newLoanDetails.totalInterest)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-light-text-secondary dark:text-slate-400">Upfront Costs:</span>
                  <span className="font-medium text-rose-600 dark:text-rose-300">{formatCurrency(comparison.upfrontCost)}</span>
                </div>
                <div className="flex justify-between border-t border-light-border-default dark:border-white/10 pt-2">
                  <span className="text-light-text-secondary dark:text-slate-400">Total Repayment:</span>
                  <span className="font-medium text-light-text-primary dark:text-slate-100">{formatCurrency(comparison.newTotalCost)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Savings Summary */}
          <div className="rounded-xl border border-light-border-default dark:border-white/10 bg-light-surface-primary dark:bg-white/[0.03] p-6 shadow-inner">
            <h4 className="mb-4 text-center font-semibold text-light-text-primary dark:text-slate-100">
              Savings Summary
            </h4>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="text-center">
                <p className="mb-1 text-sm text-light-text-secondary dark:text-slate-400">Monthly Savings</p>
                <p className={`text-2xl font-bold ${comparison.monthlySavings > 0 ? 'text-emerald-500 dark:text-emerald-300' : 'text-rose-500 dark:text-rose-300'}`}>
                  {formatCurrency(Math.abs(comparison.monthlySavings))}
                  {comparison.monthlySavings < 0 && ' more'}
                </p>
              </div>
              <div className="text-center">
                <p className="mb-1 text-sm text-light-text-secondary dark:text-slate-400">Total Savings</p>
                <p className={`text-2xl font-bold ${comparison.totalSavings > 0 ? 'text-emerald-500 dark:text-emerald-300' : 'text-rose-500 dark:text-rose-300'}`}>
                  {formatCurrency(Math.abs(comparison.totalSavings))}
                  {comparison.totalSavings < 0 && ' loss'}
                </p>
              </div>
              <div className="text-center">
                <p className="mb-1 text-sm text-light-text-secondary dark:text-slate-400">Break-Even Point</p>
                <p className="text-2xl font-bold text-blue-500 dark:text-blue-300">
                  {comparison.breakEvenMonths ? `${comparison.breakEvenMonths} months` : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RefinancingCalculator;
