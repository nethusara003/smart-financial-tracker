import React, { useState, useEffect } from 'react';
import { useCurrency } from '../../context/CurrencyContext';
import * as loanAPI from '../../services/api';
import { TrendingDown, DollarSign, Zap, Target, ArrowRight } from 'lucide-react';

const DebtPayoffWizard = () => {
  const { formatCurrency } = useCurrency();
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [extraPayment, setExtraPayment] = useState('');
  const [snowballStrategy, setSnowballStrategy] = useState(null);
  const [avalancheStrategy, setAvalancheStrategy] = useState(null);

  useEffect(() => {
    loadLoans();
  }, []);

  const loadLoans = async () => {
    try {
      const response = await loanAPI.getLoans({ status: 'active' });
      setLoans(response.loans || []);
    } catch (error) {
      console.error('Error loading loans:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateSnowball = () => {
    if (!extraPayment || loans.length === 0) return;

    const extra = parseFloat(extraPayment);
    const sortedLoans = [...loans].sort((a, b) => a.remainingBalance - b.remainingBalance);
    
    let totalMonths = 0;
    let totalInterestPaid = 0;
    const payoffOrder = [];
    
    sortedLoans.forEach((loan, index) => {
      const monthlyPayment = loan.emiAmount + (index === 0 ? extra : 0);
      const monthsToPayoff = Math.ceil(loan.remainingBalance / monthlyPayment);
      const interestPaid = (monthlyPayment * monthsToPayoff) - loan.remainingBalance;
      
      totalMonths = Math.max(totalMonths, monthsToPayoff);
      totalInterestPaid += interestPaid;
      
      payoffOrder.push({
        ...loan,
        payoffMonth: monthsToPayoff,
        monthlyPayment,
        interestPaid,
        order: index + 1
      });
    });

    setSnowballStrategy({
      method: 'Snowball',
      description: 'Pay off smallest balance first',
      loans: payoffOrder,
      totalMonths,
      totalInterestPaid,
      motivation: 'Quick wins boost motivation'
    });
  };

  const calculateAvalanche = () => {
    if (!extraPayment || loans.length === 0) return;

    const extra = parseFloat(extraPayment);
    const sortedLoans = [...loans].sort((a, b) => b.interestRate - a.interestRate);
    
    let totalMonths = 0;
    let totalInterestPaid = 0;
    const payoffOrder = [];
    
    sortedLoans.forEach((loan, index) => {
      const monthlyPayment = loan.emiAmount + (index === 0 ? extra : 0);
      const monthsToPayoff = Math.ceil(loan.remainingBalance / monthlyPayment);
      const interestPaid = (monthlyPayment * monthsToPayoff) - loan.remainingBalance;
      
      totalMonths = Math.max(totalMonths, monthsToPayoff);
      totalInterestPaid += interestPaid;
      
      payoffOrder.push({
        ...loan,
        payoffMonth: monthsToPayoff,
        monthlyPayment,
        interestPaid,
        order: index + 1
      });
    });

    setAvalancheStrategy({
      method: 'Avalanche',
      description: 'Pay off highest interest rate first',
      loans: payoffOrder,
      totalMonths,
      totalInterestPaid,
      motivation: 'Maximum interest savings'
    });
  };

  const handleCalculate = () => {
    calculateSnowball();
    calculateAvalanche();
  };

  const getBestStrategy = () => {
    if (!snowballStrategy || !avalancheStrategy) return null;
    
    if (avalancheStrategy.totalInterestPaid < snowballStrategy.totalInterestPaid) {
      return 'avalanche';
    }
    return 'snowball';
  };

  const bestStrategy = getBestStrategy();

  if (loading) {
    return (
      <div className="rounded-2xl border border-light-border-default dark:border-white/5 bg-light-surface-secondary dark:bg-[#0D1117] p-8 shadow-premium dark:shadow-card-dark">
        <div className="flex items-center justify-center py-8">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-blue-400/40 border-t-blue-400"></div>
        </div>
      </div>
    );
  }

  if (loans.length === 0) {
    return (
      <div className="rounded-2xl border border-light-border-default dark:border-white/5 bg-light-surface-secondary dark:bg-[#0D1117] p-8 text-center shadow-premium dark:shadow-card-dark">
        <Target className="mx-auto mb-4 h-12 w-12 text-slate-500" />
        <h3 className="mb-2 text-xl font-semibold text-slate-100">
          No Active Loans
        </h3>
        <p className="text-slate-400">
          You need to have active loans to use the debt payoff wizard.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Loans Summary */}
      <div className="rounded-2xl border border-light-border-default dark:border-white/5 bg-light-surface-secondary dark:bg-[#0D1117] p-6 shadow-premium dark:shadow-card-dark">
        <h2 className="mb-4 text-xl font-bold text-blue-500 dark:text-[#3B82F6]">
          Your Active Loans
        </h2>
        <div className="mb-6 space-y-3">
          {loans.map((loan) => {
            const principalBase = Number(loan.principalAmount || loan.originalPrincipalAmount || loan.remainingBalance || 0);
            const progress = principalBase > 0 ? (loan.remainingBalance / principalBase) * 100 : 0;

            return (
              <div
                key={loan._id}
                className="rounded-xl border border-light-border-default dark:border-white/10 bg-light-surface-primary dark:bg-white/[0.03] p-4"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-light-text-primary dark:text-slate-100">{loan.loanName}</p>
                    <p className="text-sm text-light-text-secondary dark:text-slate-400">
                      {loan.interestRate}% interest rate • {formatCurrency(loan.emiAmount)}/month
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-light-text-primary dark:text-slate-100">
                      {formatCurrency(loan.remainingBalance)}
                    </p>
                    <p className="text-sm text-light-text-secondary dark:text-slate-400">remaining</p>
                  </div>
                </div>
                <div className="mt-3 h-1.5 rounded-full bg-light-bg-accent dark:bg-slate-800/90">
                  <div
                    className="h-1.5 rounded-full bg-gradient-to-r from-blue-400 to-cyan-300 shadow-[0_0_12px_rgba(59,130,246,0.45)]"
                    style={{ width: `${Math.max(8, Math.min(100, progress))}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Extra Payment Input */}
        <div className="border-t border-light-border-default dark:border-white/10 pt-6">
          <label className="mb-2 block text-sm font-medium text-light-text-secondary dark:text-slate-300">
            <DollarSign className="w-4 h-4 inline mr-1" />
            Extra Monthly Payment Amount ({formatCurrency(0).replace('0', '').trim()})
          </label>
          <div className="flex gap-4">
            <input
              type="number"
              value={extraPayment}
              onChange={(e) => setExtraPayment(e.target.value)}
              placeholder="5000"
              className="flex-1 rounded-lg border border-light-border-default dark:border-white/10 bg-light-surface-primary dark:bg-white/[0.03] px-4 py-3 text-light-text-primary dark:text-slate-100 placeholder:text-light-text-tertiary dark:placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <button
              onClick={handleCalculate}
              disabled={!extraPayment}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-white transition-all hover:bg-blue-700 disabled:bg-slate-500 shadow-lg shadow-blue-500/20"
            >
              <Zap className="w-5 h-5" />
              Calculate Strategies
            </button>
          </div>
          <p className="mt-2 text-sm text-light-text-tertiary dark:text-slate-400">
            Enter the extra amount you can afford to pay each month beyond your regular EMIs
          </p>
        </div>
      </div>

      {/* Strategy Comparison */}
      {snowballStrategy && avalancheStrategy && (
        <div className="space-y-6">
          {/* Comparison Banner */}
          <div className="rounded-2xl border border-light-border-default dark:border-white/5 bg-light-surface-secondary dark:bg-[#0D1117] p-6 shadow-premium dark:shadow-card-dark">
            <h3 className="mb-4 text-center text-2xl font-bold text-blue-500 dark:text-[#3B82F6]">
              Strategy Comparison
            </h3>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="text-center">
                <p className="mb-1 text-sm text-light-text-secondary dark:text-slate-400">Interest Savings</p>
                <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-300">
                  {formatCurrency(Math.abs(snowballStrategy.totalInterestPaid - avalancheStrategy.totalInterestPaid))}
                </p>
                <p className="mt-1 text-xs text-light-text-tertiary dark:text-slate-500">
                  {bestStrategy === 'avalanche' ? 'Avalanche saves more' : 'Similar savings'}
                </p>
              </div>
              <div className="text-center">
                <p className="mb-1 text-sm text-light-text-secondary dark:text-slate-400">Time Difference</p>
                <p className="text-3xl font-bold text-blue-500 dark:text-blue-300">
                  {Math.abs(snowballStrategy.totalMonths - avalancheStrategy.totalMonths)} months
                </p>
                <p className="mt-1 text-xs text-light-text-tertiary dark:text-slate-500">
                  {snowballStrategy.totalMonths < avalancheStrategy.totalMonths ? 'Snowball is faster' : 'Avalanche is faster'}
                </p>
              </div>
            </div>
          </div>

          {/* Strategy Cards */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Snowball Strategy */}
            <div
              className={`overflow-hidden rounded-2xl border border-light-border-default dark:border-white/5 bg-light-surface-secondary dark:bg-[#0D1117] shadow-premium dark:shadow-card-dark transition-all ${
                bestStrategy === 'snowball' ? 'ring-2 ring-emerald-500/50 shadow-emerald-500/20' : ''
              }`}
            >
              <div className="border-b border-light-border-default dark:border-white/10 bg-orange-500/10 p-6">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-orange-600 dark:text-orange-300">Snowball Method</h3>
                  {bestStrategy === 'snowball' && (
                    <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-sm font-semibold text-emerald-600 dark:text-emerald-300">
                      Recommended
                    </span>
                  )}
                </div>
                <p className="text-orange-700 dark:text-orange-200 font-medium">{snowballStrategy.description}</p>
              </div>
              
              <div className="p-6">
                <div className="mb-6 grid grid-cols-2 gap-4">
                  <div>
                    <p className="mb-1 text-sm text-light-text-secondary dark:text-slate-400">Total Interest</p>
                    <p className="text-xl font-bold text-light-text-primary dark:text-slate-100">
                      {formatCurrency(snowballStrategy.totalInterestPaid)}
                    </p>
                  </div>
                  <div>
                    <p className="mb-1 text-sm text-light-text-secondary dark:text-slate-400">Debt-Free In</p>
                    <p className="text-xl font-bold text-light-text-primary dark:text-slate-100">
                      {snowballStrategy.totalMonths} months
                    </p>
                  </div>
                </div>

                <h4 className="mb-3 font-semibold text-light-text-primary dark:text-slate-100">Payoff Order:</h4>
                <div className="space-y-2">
                  {snowballStrategy.loans.map((loan) => (
                    <div key={loan._id} className="flex items-center gap-3 rounded-xl border border-light-border-default dark:border-white/10 bg-light-surface-primary dark:bg-white/[0.03] p-3">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-orange-500 text-white font-bold">
                        {loan.order}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-light-text-primary dark:text-slate-100">{loan.loanName}</p>
                        <p className="text-xs text-light-text-secondary dark:text-slate-400">
                          {formatCurrency(loan.remainingBalance)} • {loan.interestRate}%
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-500" />
                      <div className="text-right">
                        <p className="text-sm font-medium text-light-text-primary dark:text-slate-100">
                          Month {loan.payoffMonth}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 rounded-xl bg-orange-500/5 dark:bg-orange-500/10 p-4 border border-orange-500/10 dark:border-orange-500/20">
                  <p className="text-sm text-orange-800 dark:text-slate-200">
                    <strong className="text-orange-600 dark:text-orange-300">Best for:</strong> Psychological wins and motivation. Pay off smallest loans first to see progress quickly.
                  </p>
                </div>
              </div>
            </div>

            {/* Avalanche Strategy */}
            <div
              className={`overflow-hidden rounded-2xl border border-light-border-default dark:border-white/5 bg-light-surface-secondary dark:bg-[#0D1117] shadow-premium dark:shadow-card-dark transition-all ${
                bestStrategy === 'avalanche' ? 'ring-2 ring-emerald-500/50 shadow-emerald-500/20' : ''
              }`}
            >
              <div className="border-b border-light-border-default dark:border-white/10 bg-blue-500/10 p-6">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-blue-600 dark:text-blue-300">Avalanche Method</h3>
                  {bestStrategy === 'avalanche' && (
                    <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-sm font-semibold text-emerald-600 dark:text-emerald-300">
                      Recommended
                    </span>
                  )}
                </div>
                <p className="text-blue-700 dark:text-blue-200 font-medium">{avalancheStrategy.description}</p>
              </div>
              
              <div className="p-6">
                <div className="mb-6 grid grid-cols-2 gap-4">
                  <div>
                    <p className="mb-1 text-sm text-light-text-secondary dark:text-slate-400">Total Interest</p>
                    <p className="text-xl font-bold text-light-text-primary dark:text-slate-100">
                      {formatCurrency(avalancheStrategy.totalInterestPaid)}
                    </p>
                  </div>
                  <div>
                    <p className="mb-1 text-sm text-light-text-secondary dark:text-slate-400">Debt-Free In</p>
                    <p className="text-xl font-bold text-light-text-primary dark:text-slate-100">
                      {avalancheStrategy.totalMonths} months
                    </p>
                  </div>
                </div>

                <h4 className="mb-3 font-semibold text-light-text-primary dark:text-slate-100">Payoff Order:</h4>
                <div className="space-y-2">
                  {avalancheStrategy.loans.map((loan) => (
                    <div key={loan._id} className="flex items-center gap-3 rounded-xl border border-light-border-default dark:border-white/10 bg-light-surface-primary dark:bg-white/[0.03] p-3">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-500 text-white font-bold">
                        {loan.order}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-light-text-primary dark:text-slate-100">{loan.loanName}</p>
                        <p className="text-xs text-light-text-secondary dark:text-slate-400">
                          {formatCurrency(loan.remainingBalance)} • {loan.interestRate}%
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-500" />
                      <div className="text-right">
                        <p className="text-sm font-medium text-light-text-primary dark:text-slate-100">
                          Month {loan.payoffMonth}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 rounded-xl bg-blue-500/5 dark:bg-blue-500/10 p-4 border border-blue-500/10 dark:border-blue-500/20">
                  <p className="text-sm text-blue-800 dark:text-slate-200">
                    <strong className="text-blue-600 dark:text-blue-300">Best for:</strong> Maximum savings. Pay off highest interest rates first to minimize total interest paid.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Recommendation */}
          <div className="rounded-2xl border border-light-border-default dark:border-white/5 bg-light-surface-secondary dark:bg-[#0D1117] p-6 shadow-premium dark:shadow-card-dark">
            <h3 className="mb-4 text-xl font-bold text-blue-500 dark:text-[#3B82F6]">
              Our Recommendation
            </h3>
            <p className="mb-4 text-light-text-secondary dark:text-slate-200">
              {bestStrategy === 'avalanche' ? (
                <>
                  The <strong className="text-blue-600 dark:text-blue-300">Avalanche Method</strong> will save you{' '}
                  <strong className="text-light-text-primary dark:text-slate-100">{formatCurrency(Math.abs(snowballStrategy.totalInterestPaid - avalancheStrategy.totalInterestPaid))}</strong>{' '}
                  in interest compared to the Snowball method. This is the most mathematically efficient approach.
                </>
              ) : (
                <>
                  Both methods result in similar interest costs. The <strong className="text-orange-600 dark:text-orange-300">Snowball Method</strong>{' '}
                  may be better for you if you value quick psychological wins and motivation from paying off smaller debts first.
                </>
              )}
            </p>
            <div className="flex gap-4">
              <button
                className="flex-1 rounded-xl border border-orange-400/40 bg-orange-500/10 px-4 py-3 text-orange-600 dark:text-orange-300 transition-all hover:bg-orange-500/20 shadow-lg shadow-orange-500/10"
              >
                Choose Snowball
              </button>
              <button
                className="flex-1 rounded-xl border border-blue-400/40 bg-blue-500/10 px-4 py-3 text-blue-600 dark:text-blue-300 transition-all hover:bg-blue-500/20 shadow-lg shadow-blue-500/10"
              >
                Choose Avalanche
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DebtPayoffWizard;
