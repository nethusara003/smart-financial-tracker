import { useState, useMemo } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Heart, TrendingUp, AlertCircle, CheckCircle, Target, DollarSign, CreditCard } from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';
import { useTransactions } from '../hooks/useTransactions';
import { useFinancialHealthScore } from '../hooks/useInsights';
import {
  DATE_RANGE_OPTIONS,
  getPresetDateBounds,
  getRangeBounds,
  parseDateInputValue,
  toStartOfDay,
  toEndOfDay,
} from '../utils/dateRangeFilter';
import CompactDateModal from '../components/CompactDateModal';
import SystemPageHeader from '../components/layout/SystemPageHeader';

const FinancialHealth = () => {
  const { formatCurrency } = useCurrency();
  const defaultCustomRange = useMemo(() => getPresetDateBounds('week'), []);
  const [timeRange, setTimeRange] = useLocalStorage('sft_financialhealth_timeRange', 'thisMonth');
  const [customDateRange, setCustomDateRange] = useState(defaultCustomRange);
  const [customRangeDraft, setCustomRangeDraft] = useState(defaultCustomRange);
  const [showCustomRangePanel, setShowCustomRangePanel] = useState(false);
  const months = useMemo(() => {
    const { startDate, endDate } = getRangeBounds(timeRange, customDateRange);
    const days = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1);
    return Math.min(24, Math.max(1, Math.ceil(days / 30)));
  }, [customDateRange, timeRange]);
  const {
    data: healthData,
    isLoading: loading,
    error,
  } = useFinancialHealthScore(months);
  const { data: transactions = [] } = useTransactions({ scope: 'all' });

  const trendMetrics = useMemo(() => {
    const { startDate, endDate } = getRangeBounds(timeRange, customDateRange);
    const periodLengthMs = Math.max(1, endDate.getTime() - startDate.getTime() + 1);
    const previousStart = new Date(startDate.getTime() - periodLengthMs);
    const previousEnd = new Date(startDate.getTime() - 1);

    const sumPeriod = (from, to) => {
      return transactions.reduce(
        (accumulator, tx) => {
          const txDate = new Date(tx.date);
          if (txDate < from || txDate > to) {
            return accumulator;
          }

          const amount = Number(tx.amount || 0);
          if (tx.type === 'income') {
            accumulator.income += amount;
          } else if (tx.type === 'expense') {
            accumulator.expense += amount;
          }

          return accumulator;
        },
        { income: 0, expense: 0 }
      );
    };

    const current = sumPeriod(startDate, endDate);
    const previous = sumPeriod(previousStart, previousEnd);

    const toDelta = (currentValue, previousValue) => {
      if (!previousValue) {
        return currentValue > 0 ? 100 : 0;
      }
      return ((currentValue - previousValue) / previousValue) * 100;
    };

    return {
      incomeDelta: toDelta(current.income, previous.income),
      expenseDelta: toDelta(current.expense, previous.expense),
    };
  }, [customDateRange, timeRange, transactions]);

  const handleTimeRangeChange = (nextRange) => {
    setTimeRange(nextRange);
    if (nextRange === 'custom') {
      setCustomRangeDraft(customDateRange);
      setShowCustomRangePanel(true);
      return;
    }
    setShowCustomRangePanel(false);
  };

  const handleCustomDateDraftChange = (field, value) => {
    const parsed = parseDateInputValue(value, field === 'endDate');
    if (!parsed) {
      return;
    }

    setCustomRangeDraft((prev) => ({
      ...prev,
      [field]: parsed,
    }));
  };

  const handleApplyCustomRange = () => {
    const startDate = toStartOfDay(customRangeDraft.startDate);
    const endDate = toEndOfDay(customRangeDraft.endDate);

    if (startDate > endDate) {
      return;
    }

    setCustomDateRange({ startDate, endDate });
    setTimeRange('custom');
    setShowCustomRangePanel(false);
  };

  const handleCancelCustomRange = () => {
    setCustomRangeDraft(customDateRange);
    setShowCustomRangePanel(false);
  };

  const handleQuickCustomPreset = (presetValue) => {
    setCustomRangeDraft(getPresetDateBounds(presetValue));
  };



  const renderSolidProgressBar = (scoreValue, accentClassName) => (
    <div className="h-[6px] w-full overflow-hidden rounded-full bg-[#05070A]">
      <div
        className={`h-full rounded-full transition-all duration-300 ${accentClassName}`}
        style={{ width: `${Math.max(0, Math.min(100, Number(scoreValue) || 0))}%` }}
      />
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-dark-text-secondary">Calculating your financial health...</p>
        </div>
      </div>
    );
  }
  const {
    score = 0,
    category = '',
    components = {},
    summary = {},
    recommendations = [],
  } = healthData || {};

  const showErrorState = Boolean(error || !healthData?.success);

  return (
    <div className="space-y-6 animate-fade-in overflow-x-hidden">
      <SystemPageHeader
        tagline="DETERMINISTIC HEALTH TRACKING"
        title="Financial Health"
        subtitle="Comprehensive analysis of your financial wellness."
        actions={(
          <div className="flex items-center gap-1.5">
            <div className="group relative flex cursor-pointer items-center gap-2 rounded-full border border-white/5 bg-white/5 px-4 py-2 transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-500/50 hover:bg-white/10 hover:shadow-[0_8px_16px_-4px_rgba(59,130,246,0.3)] active:translate-y-0 active:scale-95 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10">
              <label className="cursor-pointer text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 transition-colors group-hover:text-blue-500 dark:text-slate-300 dark:group-hover:text-blue-400">Analysis Period</label>
              <select
                value={timeRange}
                onChange={(e) => handleTimeRangeChange(e.target.value)}
                className="cursor-pointer appearance-none bg-transparent pr-6 text-sm font-semibold text-slate-800 outline-none transition-colors group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-300"
              >
                {DATE_RANGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value} className="bg-white text-slate-900 dark:bg-slate-950 dark:text-white">
                    {option.label}
                  </option>
                ))}
              </select>

              {timeRange === 'custom' && showCustomRangePanel && (
                <CompactDateModal
                  draft={customRangeDraft}
                  onDraftChange={handleCustomDateDraftChange}
                  onApply={handleApplyCustomRange}
                  onCancel={handleCancelCustomRange}
                  onPreset={handleQuickCustomPreset}
                />
              )}
            </div>
            {timeRange === 'custom' && (
              <button
                type="button"
                onClick={() => setShowCustomRangePanel((prev) => !prev)}
                className="flex items-center justify-center p-2 rounded-full border border-blue-500/20 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 hover:text-white transition-colors cursor-pointer"
                title="Edit custom date range"
              >
                <span className="text-[10px] font-bold px-1 py-0.5">Edit</span>
              </button>
            )}
          </div>
        )}
      />

      

      {showErrorState ? (
        <div className="rounded-2xl border border-[#0D1117] bg-[#0D1117] p-6">
          <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-6 text-center">
            <AlertCircle className="mx-auto mb-3 text-amber-300" size={48} />
            <h3 className="mb-2 text-lg font-semibold text-amber-100">Unable to Calculate Score</h3>
            <p className="mb-2 text-amber-200">{error?.message || healthData?.message || 'No financial data available'}</p>
            <p className="text-sm text-slate-400">Add income and expense transactions to see your financial health score.</p>
          </div>
        </div>
      ) : (
        <>
          <section className="relative rounded-2xl border border-[#0D1117] bg-[#0D1117] p-4 max-w-full overflow-hidden">
            {healthData.dataQuality && (
              <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full border border-white/5 bg-[#05070A] px-3 py-1 text-[11px] text-slate-300">
                <span className="text-slate-200">Data Quality</span>
                <span className="font-semibold text-white">{healthData.dataQuality.reliability}</span>
              </div>
            )}

            <div className="grid items-center gap-6 pt-9 lg:grid-cols-[auto,minmax(0,1fr),auto]">
              <div className="flex-none">
                <div className="group relative flex h-24 w-24 items-center justify-center rounded-full border border-blue-500/20 bg-[#0D1117] shadow-[0_0_24px_rgba(59,130,246,0.1)] transition-all duration-500 hover:scale-[1.03] hover:border-blue-500/40 hover:shadow-[0_0_32px_rgba(59,130,246,0.25)] dark:border-blue-400/20 dark:shadow-[0_0_24px_rgba(59,130,246,0.08)]">
                  <div className="text-center transition-transform duration-500 group-hover:scale-105">
                    <p className="text-2xl font-semibold text-[#F9FAFB]">{score}</p>
                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9CA3AF] transition-colors group-hover:text-blue-400">{category}</p>
                  </div>
                </div>
              </div>

              <div className="min-w-0">
                <div className="space-y-4 text-sm text-[#9CA3AF]">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9CA3AF]">Trend Analysis</p>
                    <p className="mt-1 max-w-xl leading-6 text-[#9CA3AF]">Compared with the previous period to show directional momentum before reviewing the KPI grid.</p>
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div className="rounded-xl border border-white/5 bg-[#05070A] px-3 py-2">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9CA3AF]">Income vs last month</p>
                        <p className={`text-xs font-semibold ${trendMetrics.incomeDelta >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                          {trendMetrics.incomeDelta >= 0 ? '+' : ''}{trendMetrics.incomeDelta.toFixed(2)}%
                        </p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/5 bg-[#05070A] px-3 py-2">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9CA3AF]">Expenses vs last month</p>
                        <p className={`text-xs font-semibold ${trendMetrics.expenseDelta <= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                          {trendMetrics.expenseDelta >= 0 ? '+' : ''}{trendMetrics.expenseDelta.toFixed(2)}%
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-none lg:justify-self-end">
                <div className="grid grid-cols-2 gap-x-12 gap-y-4 justify-items-end text-right">
                  <div className="min-w-[140px]">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9CA3AF]">INCOME</p>
                    <p className="mt-1 text-lg font-semibold text-emerald-300">{formatCurrency(summary.monthlyIncome || 0)}</p>
                    <p className="mt-1 text-[10px] text-[#6B7280]">Target: &gt;20%</p>
                  </div>

                  <div className="min-w-[140px]">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9CA3AF]">EXPENSES</p>
                    <p className="mt-1 text-lg font-semibold text-rose-300">{formatCurrency(summary.monthlyExpenses || 0)}</p>
                    <p className="mt-1 text-[10px] text-[#6B7280]">Target: &lt;50%</p>
                  </div>

                  <div className="min-w-[140px]">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9CA3AF]">SAVINGS</p>
                    <p className="mt-1 text-lg font-semibold text-blue-300">{formatCurrency(summary.monthlySavings || 0)}</p>
                    <p className="mt-1 text-[10px] text-[#6B7280]">Target: positive</p>
                  </div>

                  <div className="min-w-[140px]">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9CA3AF]">SAVINGS RATE</p>
                    <p className="mt-1 text-lg font-semibold text-violet-300">{summary.savingsRate || "0.00%"}</p>
                    <p className="mt-1 text-[10px] text-[#6B7280]">Target: &gt;20%</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div>
            <h2 className="mb-4 text-lg font-semibold text-[#F9FAFB]">Score Components</h2>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {[
                { key: 'savingsRatio', title: 'Savings Ratio', icon: DollarSign, accent: 'bg-emerald-400', metricLabel: 'Rate', metricValue: `${String(components.savingsRatio?.ratio ?? 0).replace('%', '')}%` },
                { key: 'expenseToIncomeRatio', title: 'Expense Efficiency', icon: TrendingUp, accent: 'bg-cyan-400', metricLabel: 'Spending', metricValue: `${String(components.expenseToIncomeRatio?.ratio ?? 0).replace('%', '')}%` },
                { key: 'debtRatio', title: 'Debt Management', icon: CreditCard, accent: 'bg-fuchsia-400', metricLabel: 'Debt', metricValue: `${String(components.debtRatio?.ratio ?? 0).replace('%', '')}%` },
                { key: 'budgetAdherence', title: 'Budget Adherence', icon: Target, accent: 'bg-amber-400', metricLabel: 'Compliance', metricValue: `${String(components.budgetAdherence?.adherence ?? 0).replace('%', '')}%` },
                { key: 'goalProgress', title: 'Goal Achievement', icon: CheckCircle, accent: 'bg-indigo-400', metricLabel: 'Progress', metricValue: `${String(components.goalProgress?.progress ?? 0).replace('%', '')}%` },
              ].map((component) => {
                const componentData = components[component.key] || {};
                const scoreValue = Number(componentData.score || 0);
                const Icon = component.icon;

                return (
                  <div key={component.key} className="group relative overflow-hidden rounded-2xl border border-white/5 bg-[#0D1117] p-4 transition-colors duration-200 hover:border-white/10">
                    <div className="absolute right-3 top-3 flex flex-col items-end gap-1">
                      <span className="rounded border border-white/5 bg-[#0D1117] px-2 py-0.5 text-[10px] font-semibold tracking-[0.2em] text-slate-300">{Number(componentData.weight || 0)}%</span>
                      <span className="rounded border border-white/5 bg-[#0D1117] px-2 py-0.5 text-[10px] font-semibold tracking-[0.2em] text-white">{scoreValue.toFixed(2)}</span>
                    </div>

                    <div className="mb-3 flex items-center gap-3 pr-20">
                      <div className={`rounded-lg border border-white/5 p-2 ${component.accent}`}>
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-[#F9FAFB]">{component.title}</h3>
                        <p className="text-[11px] uppercase tracking-[0.18em] text-[#9CA3AF]">{componentData.category || 'Diagnostic Signal'}</p>
                      </div>
                    </div>

                    <div className="mb-3">
                      {renderSolidProgressBar(scoreValue * 1, component.accent)}
                    </div>

                    <div className="space-y-1 text-xs text-[#9CA3AF]">
                      {component.key === 'savingsRatio' && (
                        <>
                          <p><span className="text-slate-300">Rate:</span> {Number(componentData.ratio ?? 0).toFixed(2)}%</p>
                              <p><span className="text-slate-300">Trend:</span> {componentData.details?.trend}</p>
                        </>
                      )}
                      {component.key === 'expenseToIncomeRatio' && (
                        <>
                              <p><span className="text-slate-300">Spending:</span> {Number(componentData.ratio ?? 0).toFixed(2)}%</p>
                          <p><span className="text-slate-300">Efficiency:</span> {componentData.details?.efficiency}</p>
                        </>
                      )}
                      {component.key === 'debtRatio' && (
                        <>
                              <p><span className="text-slate-300">Debt Payments:</span> {Number(componentData.ratio ?? 0).toFixed(2)}%</p>
                          <p><span className="text-slate-300">Status:</span> {componentData.details?.status}</p>
                          <p><span className="text-slate-300">Active Debts:</span> {componentData.details?.numberOfDebts}</p>
                        </>
                      )}
                      {component.key === 'budgetAdherence' && (
                        <>
                              <p><span className="text-slate-300">Compliance:</span> {Number(componentData.adherence ?? 0).toFixed(2)}%</p>
                          <p><span className="text-slate-300">Total Budgets:</span> {componentData.details?.totalBudgets}</p>
                          <p><span className="text-slate-300">On Track:</span> {componentData.details?.categoriesOnTrack}</p>
                        </>
                      )}
                      {component.key === 'goalProgress' && (
                        <>
                              <p><span className="text-slate-300">Progress:</span> {Number(componentData.progress ?? 0).toFixed(2)}%</p>
                          <p><span className="text-slate-300">Total Goals:</span> {componentData.details?.totalGoals}</p>
                          <p><span className="text-slate-300">Active:</span> {componentData.details?.activeGoals}</p>
                          <p><span className="text-slate-300">Completed:</span> {componentData.details?.completedGoals}</p>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {recommendations && recommendations.length > 0 && (
            <div className="rounded-2xl border border-[#0D1117] bg-[#0D1117] p-6">
              <h2 className="mb-5 text-xl font-semibold text-cyan-100">Recommendations for Improvement</h2>
              <div className="space-y-4">
                {recommendations.map((rec, index) => (
                  <div key={index} className="rounded-2xl border border-white/5 bg-[#0D1117] p-4">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <h3 className="text-base font-semibold text-white">{rec.title}</h3>
                      <span className="rounded-full border border-white/10 bg-black/60 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-cyan-200">
                        {rec.priority.toUpperCase()}
                      </span>
                    </div>
                    <p className="mb-4 text-sm leading-6 text-slate-300">{rec.description}</p>
                    <div className="rounded-xl border border-white/5 bg-[#0D1117] p-4">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Action Items</p>
                      <ul className="space-y-2">
                        {rec.actionItems.map((action, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-slate-300">
                            <CheckCircle size={16} className="mt-0.5 flex-shrink-0 text-cyan-300" />
                            <span>{action}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default FinancialHealth;

