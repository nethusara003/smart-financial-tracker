import React, { useState } from 'react';
import { useCurrency } from '../context/CurrencyContext';
import { Plus, Trash2, TrendingDown, DollarSign, Calendar, Percent } from 'lucide-react';
import * as loanAPI from '../services/api';

const LoanComparison = () => {
  const { formatCurrency } = useCurrency();
  const [loanOffers, setLoanOffers] = useState([
    { id: 1, name: 'Loan Offer 1', principal: '', rate: '', tenure: '', tenureUnit: 'months', processingFee: '', prepaymentPenalty: '', calculated: null },
    { id: 2, name: 'Loan Offer 2', principal: '', rate: '', tenure: '', tenureUnit: 'months', processingFee: '', prepaymentPenalty: '', calculated: null }
  ]);
  const [calculating, setCalculating] = useState(false);

  const addLoanOffer = () => {
    const newId = Math.max(...loanOffers.map(l => l.id)) + 1;
    setLoanOffers([...loanOffers, {
      id: newId,
      name: `Loan Offer ${newId}`,
      principal: '',
      rate: '',
      tenure: '',
      tenureUnit: 'months',
      processingFee: '',
      prepaymentPenalty: '',
      calculated: null
    }]);
  };

  const removeLoanOffer = (id) => {
    if (loanOffers.length > 2) {
      setLoanOffers(loanOffers.filter(loan => loan.id !== id));
    }
  };

  const updateLoanOffer = (id, field, value) => {
    setLoanOffers(loanOffers.map(loan =>
      loan.id === id ? { ...loan, [field]: value } : loan
    ));
  };

  const calculateAllLoans = async () => {
    setCalculating(true);
    try {
      const updatedLoans = await Promise.all(
        loanOffers.map(async (loan) => {
          if (loan.principal && loan.rate && loan.tenure) {
            try {
              const principal = parseFloat(loan.principal);
              const rate = parseFloat(loan.rate);
              const tenure = parseInt(loan.tenure);
              
              // Validate parsed values
              if (isNaN(principal) || principal <= 0 ||
                  isNaN(rate) || rate <= 0 ||
                  isNaN(tenure) || tenure <= 0) {
                return { ...loan, calculated: { error: 'Invalid input values' } };
              }
              
              const tenureInMonths = loan.tenureUnit === 'years' ? tenure * 12 : tenure;
              
              const response = await loanAPI.calculateEMI(principal, rate, tenureInMonths);

              const processingFee = loan.processingFee ? parseFloat(loan.processingFee) : 0;
              const totalCost = response.calculation.totalAmount + processingFee;

              return {
                ...loan,
                calculated: {
                  ...response.calculation,
                  tenureInMonths,
                  processingFee,
                  totalCost,
                  prepaymentPenalty: loan.prepaymentPenalty ? parseFloat(loan.prepaymentPenalty) : 0
                }
              };
            } catch {
              return { ...loan, calculated: { error: 'Calculation failed' } };
            }
          }
          return loan;
        })
      );
      setLoanOffers(updatedLoans);
    } catch (error) {
      console.error('Error calculating loans:', error);
    } finally {
      setCalculating(false);
    }
  };

  const getBestLoan = () => {
    const validLoans = loanOffers.filter(loan => loan.calculated && !loan.calculated.error);
    if (validLoans.length === 0) return null;
    
    return validLoans.reduce((best, current) => 
      current.calculated.totalCost < best.calculated.totalCost ? current : best
    );
  };

  const bestLoan = getBestLoan();

  return (
    <div className="space-y-6">

      {/* Input Grid */}
      <div className="grid grid-cols-1 gap-6 mb-6">
        {loanOffers.map((loan) => (
          <div 
            key={loan.id} 
            className={`rounded-2xl border border-light-border-default dark:border-white/5 bg-light-surface-secondary dark:bg-[#0D1117] p-6 shadow-premium dark:shadow-card-dark transition-all ${
              bestLoan && bestLoan.id === loan.id ? 'ring-2 ring-emerald-500/50 shadow-emerald-500/20' : ''
            }`}
          >
            <div className="flex justify-between items-center mb-4">
              <input
                type="text"
                value={loan.name}
                onChange={(e) => updateLoanOffer(loan.id, 'name', e.target.value)}
                className="border-b border-light-border-default dark:border-white/15 bg-transparent text-lg font-semibold text-light-text-primary dark:text-white focus:border-blue-500 focus:outline-none"
              />
              <div className="flex items-center gap-2">
                {bestLoan && bestLoan.id === loan.id && (
                  <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-sm font-medium text-emerald-300">
                    Best Deal
                  </span>
                )}
                {loanOffers.length > 2 && (
                  <button
                    onClick={() => removeLoanOffer(loan.id)}
                    className="rounded-xl p-2 text-rose-500 dark:text-rose-300 hover:bg-rose-500/10 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-light-text-secondary dark:text-slate-300">
                  <DollarSign className="w-4 h-4 inline mr-1" />
                  Principal Amount ({formatCurrency(0).replace('0', '').trim()})
                </label>
                <input
                  type="number"
                  value={loan.principal}
                  onChange={(e) => updateLoanOffer(loan.id, 'principal', e.target.value)}
                  placeholder="500000"
                  className="w-full rounded-lg border border-light-border-default dark:border-white/10 bg-light-surface-primary dark:bg-white/[0.03] px-3 py-2 text-light-text-primary dark:text-slate-100 placeholder:text-light-text-tertiary dark:placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-light-text-secondary dark:text-slate-300">
                  <Percent className="w-4 h-4 inline mr-1" />
                  Interest Rate (% p.a.)
                </label>
                <input
                  type="number"
                  value={loan.rate}
                  onChange={(e) => updateLoanOffer(loan.id, 'rate', e.target.value)}
                  placeholder="8.5"
                  step="0.1"
                  className="w-full rounded-lg border border-light-border-default dark:border-white/10 bg-light-surface-primary dark:bg-white/[0.03] px-3 py-2 text-light-text-primary dark:text-slate-100 placeholder:text-light-text-tertiary dark:placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-light-text-secondary dark:text-slate-300">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Tenure
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={loan.tenure}
                    onChange={(e) => updateLoanOffer(loan.id, 'tenure', e.target.value)}
                    placeholder="60"
                    className="flex-1 rounded-lg border border-light-border-default dark:border-white/10 bg-light-surface-primary dark:bg-white/[0.03] px-3 py-2 text-light-text-primary dark:text-slate-100 placeholder:text-light-text-tertiary dark:placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <select
                    value={loan.tenureUnit}
                    onChange={(e) => updateLoanOffer(loan.id, 'tenureUnit', e.target.value)}
                    className="rounded-lg border border-light-border-default dark:border-white/10 bg-light-surface-primary dark:bg-white/[0.03] px-3 py-2 text-light-text-primary dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="months">Months</option>
                    <option value="years">Years</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-light-text-secondary dark:text-slate-300">
                  Processing Fee ({formatCurrency(0).replace('0', '').trim()})
                </label>
                <input
                  type="number"
                  value={loan.processingFee}
                  onChange={(e) => updateLoanOffer(loan.id, 'processingFee', e.target.value)}
                  placeholder="5000"
                  className="w-full rounded-lg border border-light-border-default dark:border-white/10 bg-light-surface-primary dark:bg-white/[0.03] px-3 py-2 text-light-text-primary dark:text-slate-100 placeholder:text-light-text-tertiary dark:placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-light-text-secondary dark:text-slate-300">
                  Prepayment Penalty (%)
                </label>
                <input
                  type="number"
                  value={loan.prepaymentPenalty}
                  onChange={(e) => updateLoanOffer(loan.id, 'prepaymentPenalty', e.target.value)}
                  placeholder="2"
                  step="0.1"
                  className="w-full rounded-lg border border-light-border-default dark:border-white/10 bg-light-surface-primary dark:bg-white/[0.03] px-3 py-2 text-light-text-primary dark:text-slate-100 placeholder:text-light-text-tertiary dark:placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            {/* Results */}
            {loan.calculated && !loan.calculated.error && (
              <div className="mt-4 border-t border-light-border-default dark:border-white/10 pt-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="mb-1 text-xs text-light-text-tertiary dark:text-slate-400">Monthly EMI</p>
                    <p className="text-lg font-bold text-blue-500 dark:text-blue-300">
                      {formatCurrency(loan.calculated.emiAmount)}
                    </p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs text-light-text-tertiary dark:text-slate-400">Total Interest</p>
                    <p className="text-lg font-bold text-amber-500 dark:text-amber-300">
                      {formatCurrency(loan.calculated.totalInterest)}
                    </p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs text-light-text-tertiary dark:text-slate-400">Total Repayment</p>
                    <p className="text-lg font-bold text-indigo-500 dark:text-violet-300">
                      {formatCurrency(loan.calculated.totalAmount)}
                    </p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs text-light-text-tertiary dark:text-slate-400">Total Cost</p>
                    <p className="text-lg font-bold text-rose-500 dark:text-rose-300">
                      {formatCurrency(loan.calculated.totalCost)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {loan.calculated && loan.calculated.error && (
              <div className="mt-4 rounded-lg bg-rose-500/10 p-3 text-rose-300">
                {loan.calculated.error}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 mb-8">
        <button
          onClick={addLoanOffer}
          className="flex items-center gap-2 rounded-xl border border-light-border-default dark:border-white/15 px-4 py-2 text-light-text-primary dark:text-slate-100 transition-all hover:bg-light-bg-hover dark:hover:bg-white/[0.06]"
        >
          <Plus className="w-5 h-5" />
          Add Another Loan
        </button>
        <button
          onClick={calculateAllLoans}
          disabled={calculating}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2 text-white transition-all hover:bg-blue-700 disabled:bg-slate-500 shadow-lg shadow-blue-500/20"
        >
          <TrendingDown className="w-5 h-5" />
          {calculating ? 'Calculating...' : 'Compare All Loans'}
        </button>
      </div>

      {/* Summary Comparison Table */}
      {bestLoan && (
        <div className="rounded-2xl border border-light-border-default dark:border-white/5 bg-light-surface-secondary dark:bg-[#0D1117] p-6 shadow-premium dark:shadow-card-dark">
          <h2 className="mb-4 text-xl font-bold text-blue-500 dark:text-[#3B82F6]">
            Quick Comparison Summary
          </h2>
          <div className="overflow-x-auto rounded-xl border border-light-border-default dark:border-white/10">
            <table className="w-full text-sm">
              <thead className="bg-light-bg-accent dark:bg-white/[0.04]">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-light-text-primary dark:text-slate-100">Loan Offer</th>
                  <th className="px-4 py-3 text-right font-medium text-light-text-primary dark:text-slate-100">Monthly EMI</th>
                  <th className="px-4 py-3 text-right font-medium text-light-text-primary dark:text-slate-100">Total Interest</th>
                  <th className="px-4 py-3 text-right font-medium text-light-text-primary dark:text-slate-100">Processing Fee</th>
                  <th className="px-4 py-3 text-right font-medium text-light-text-primary dark:text-slate-100">Total Cost</th>
                  <th className="px-4 py-3 text-center font-medium text-light-text-primary dark:text-slate-100">Savings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-light-border-default dark:divide-white/10">
                {loanOffers.filter(loan => loan.calculated && !loan.calculated.error).map(loan => {
                  const savings = loan.calculated.totalCost - bestLoan.calculated.totalCost;
                  return (
                    <tr 
                      key={loan.id}
                      className={loan.id === bestLoan.id ? 'bg-emerald-500/5 dark:bg-emerald-500/10' : ''}
                    >
                      <td className="px-4 py-3 font-medium text-light-text-primary dark:text-slate-100">
                        {loan.name}
                        {loan.id === bestLoan.id && (
                          <span className="ml-2 text-xs text-emerald-600 dark:text-emerald-300 font-bold">✓ BEST</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-light-text-secondary dark:text-slate-200">{formatCurrency(loan.calculated.emiAmount)}</td>
                      <td className="px-4 py-3 text-right text-light-text-secondary dark:text-slate-200">{formatCurrency(loan.calculated.totalInterest)}</td>
                      <td className="px-4 py-3 text-right text-light-text-secondary dark:text-slate-200">{formatCurrency(loan.calculated.processingFee)}</td>
                      <td className="px-4 py-3 text-right font-bold text-light-text-primary dark:text-slate-100">{formatCurrency(loan.calculated.totalCost)}</td>
                      <td className="px-4 py-3 text-center">
                        {savings === 0 ? (
                          <span className="font-medium text-emerald-300">Best!</span>
                        ) : (
                          <span className="text-rose-300">
                            +{formatCurrency(savings)}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-6 rounded-xl bg-blue-500/5 dark:bg-blue-500/10 p-4 border border-blue-500/10 dark:border-blue-500/20">
            <p className="text-sm text-light-text-secondary dark:text-slate-200">
              <strong className="text-blue-600 dark:text-blue-300">Tip:</strong> The "Best Deal" is determined by the lowest total cost 
              (including principal, interest, and processing fees). Consider other factors like prepayment flexibility, 
              lender reputation, and additional benefits when making your final decision.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoanComparison;
