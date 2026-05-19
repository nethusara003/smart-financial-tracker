import { useState, useMemo } from 'react';
import { TrendingUp, DollarSign, Target, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';
import { useBudgetRecommendations } from '../hooks/useInsights';
import {
  DATE_RANGE_OPTIONS,
  getPresetDateBounds,
  getRangeBounds,
  parseDateInputValue,
  toStartOfDay,
  toEndOfDay,
} from '../utils/dateRangeFilter';
import CompactDateModal from '../components/CompactDateModal';

const BudgetRecommendations = () => {
  const { formatCurrency } = useCurrency();
  const defaultCustomRange = useMemo(() => getPresetDateBounds('week'), []);
  const [timeRange, setTimeRange] = useState('thisMonth');
  const [customDateRange, setCustomDateRange] = useState(defaultCustomRange);
  const [customRangeDraft, setCustomRangeDraft] = useState(defaultCustomRange);
  const [showCustomRangePanel, setShowCustomRangePanel] = useState(false);
  const months = useMemo(() => {
    const { startDate, endDate } = getRangeBounds(timeRange, customDateRange);
    const days = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1);
    return Math.min(24, Math.max(1, Math.ceil(days / 30)));
  }, [customDateRange, timeRange]);
  const {
    data: recommendations,
    isLoading: loading,
    error,
  } = useBudgetRecommendations(months);

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

  const getInsightIcon = (type) => {
    switch (type) {
      case 'success': return <CheckCircle className="text-green-500" size={20} />;
      case 'warning': return <AlertCircle className="text-yellow-500" size={20} />;
      case 'critical': return <AlertCircle className="text-red-500" size={20} />;
      default: return <Info className="text-blue-500" size={20} />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'on_track': return 'border-green-500 bg-green-50';
      case 'overspending': return 'border-red-500 bg-red-50';
      case 'underspending': return 'border-yellow-500 bg-yellow-50';
      default: return 'border-gray-300 dark:border-dark-border-strong bg-gray-50 dark:bg-dark-surface-elevated';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-dark-text-secondary">Analyzing your finances...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertCircle className="text-red-500 mx-auto mb-3" size={48} />
          <h3 className="text-lg font-semibold text-red-800 mb-2">Unable to Load Recommendations</h3>
          <p className="text-red-600">{error?.message || 'Failed to fetch recommendations'}</p>
        </div>
      </div>
    );
  }

  if (!recommendations?.success) {
    return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        {/* Header with Time Span Selector */}
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-dark-text-primary mb-1.5">💡 Budget Recommendations</h1>
            <p className="text-gray-600 dark:text-dark-text-secondary">AI-powered budget suggestions based on your spending patterns</p>
          </div>
          <div className="flex w-full items-center gap-3 md:w-auto">
            <label className="text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Analysis Period:</label>
            <div className="relative flex items-center gap-1.5">
              <select
                value={timeRange}
                onChange={(e) => handleTimeRangeChange(e.target.value)}
                className="w-full md:w-auto px-3 py-2 text-sm border border-gray-300 dark:border-dark-border-strong rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-dark-surface-secondary cursor-pointer"
              >
                {DATE_RANGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
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
              {timeRange === 'custom' && (
                <button
                  type="button"
                  onClick={() => setShowCustomRangePanel((prev) => !prev)}
                  className="flex items-center justify-center p-1.5 rounded-lg border border-indigo-500/20 bg-indigo-50/10 hover:bg-indigo-50/20 text-indigo-600 dark:text-indigo-400 font-bold text-[10px] transition-colors cursor-pointer"
                  title="Edit custom date range"
                >
                  Edit
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center max-w-2xl mx-auto">
          <AlertCircle className="text-yellow-500 mx-auto mb-4" size={48} />
          <h3 className="text-lg font-semibold text-gray-800 dark:text-dark-text-primary mb-3">Insufficient Data</h3>
          <p className="text-gray-600 dark:text-dark-text-secondary mb-4">{recommendations?.message || 'No financial data available'}</p>
          <p className="text-sm text-gray-500 dark:text-dark-text-tertiary">
            Add income and expense transactions to see AI-powered budget recommendations.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header with Time Span Selector */}
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-dark-text-primary mb-1.5">💡 Budget Recommendations</h1>
          <p className="text-gray-600 dark:text-dark-text-secondary">AI-powered budget suggestions based on your spending patterns</p>
        </div>
        <div className="flex w-full items-center gap-3 md:w-auto">
          <label className="text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Analysis Period:</label>
          <div className="relative flex items-center gap-1.5">
            <select
              value={timeRange}
              onChange={(e) => handleTimeRangeChange(e.target.value)}
              className="w-full md:w-auto px-3 py-2 text-sm border border-gray-300 dark:border-dark-border-strong rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-dark-surface-secondary cursor-pointer"
            >
              {DATE_RANGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
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
            {timeRange === 'custom' && (
              <button
                type="button"
                onClick={() => setShowCustomRangePanel((prev) => !prev)}
                className="flex items-center justify-center p-1.5 rounded-lg border border-indigo-500/20 bg-indigo-50/10 hover:bg-indigo-50/20 text-indigo-600 dark:text-indigo-400 font-bold text-[10px] transition-colors cursor-pointer"
                title="Edit custom date range"
              >
                Edit
              </button>
            )}
          </div>
        </div>
      </div>

      

      {/* Data Quality Indicator */}
      {recommendations.dataQuality && (
        <div className={`mb-6 p-4 rounded-lg border ${
          recommendations.dataQuality.reliability === 'High' ? 'bg-green-50 border-green-200' :
          recommendations.dataQuality.reliability === 'Medium' ? 'bg-yellow-50 border-yellow-200' :
          'bg-blue-50 border-blue-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-dark-text-secondary">
                Data Quality: <span className="font-bold">{recommendations.dataQuality.reliability}</span>
              </p>
              <p className="text-xs text-gray-600 dark:text-dark-text-secondary">
                Based on {recommendations.dataQuality.monthsAnalyzed} month(s) of data
              </p>
            </div>
            {recommendations.dataQuality.note && (
              <p className="text-xs text-gray-600 dark:text-dark-text-secondary italic">{recommendations.dataQuality.note}</p>
            )}
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-dark-surface-secondary rounded-xl border border-gray-200 dark:border-dark-border-strong shadow-sm p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-dark-text-secondary">Monthly Income</span>
            <DollarSign className="text-green-500" size={20} />
          </div>
          <p className="text-xl font-bold text-gray-800 dark:text-dark-text-primary">
            {formatCurrency(recommendations.summary.monthlyIncome)}
          </p>
        </div>

        <div className="bg-white dark:bg-dark-surface-secondary rounded-xl border border-gray-200 dark:border-dark-border-strong shadow-sm p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-dark-text-secondary">Current Spending</span>
            <TrendingUp className="text-blue-500" size={20} />
          </div>
          <p className="text-xl font-bold text-gray-800 dark:text-dark-text-primary">
            {formatCurrency(recommendations.summary.currentTotalSpending)}
          </p>
        </div>

        <div className="bg-white dark:bg-dark-surface-secondary rounded-xl border border-gray-200 dark:border-dark-border-strong shadow-sm p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-dark-text-secondary">Current Savings</span>
            <Target className="text-purple-500" size={20} />
          </div>
          <p className="text-xl font-bold text-gray-800 dark:text-dark-text-primary">
            {formatCurrency(recommendations.summary.currentSavings)}
          </p>
        </div>

        <div className="bg-white dark:bg-dark-surface-secondary rounded-xl border border-gray-200 dark:border-dark-border-strong shadow-sm p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-dark-text-secondary">Savings Rate</span>
            <CheckCircle className="text-teal-500" size={20} />
          </div>
          <p className="text-xl font-bold text-gray-800 dark:text-dark-text-primary">
            {recommendations.summary.currentSavingsRate}
          </p>
        </div>
      </div>

      {/* 50/30/20 Allocation */}
      <div className="bg-white dark:bg-dark-surface-secondary rounded-xl border border-gray-200 dark:border-dark-border-strong shadow-sm p-5 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-dark-text-primary mb-5">Recommended Allocation (50/30/20 Rule)</h2>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium text-gray-700 dark:text-dark-text-secondary">Needs (50%)</span>
              <span className="font-semibold text-gray-800 dark:text-dark-text-primary">
                {formatCurrency(recommendations.summary.recommendedAllocation.needs)}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-dark-border-strong rounded-full h-3">
              <div className="bg-blue-500 h-3 rounded-full" style={{ width: '50%' }}></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium text-gray-700 dark:text-dark-text-secondary">Wants (30%)</span>
              <span className="font-semibold text-gray-800 dark:text-dark-text-primary">
                {formatCurrency(recommendations.summary.recommendedAllocation.wants)}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-dark-border-strong rounded-full h-3">
              <div className="bg-purple-500 h-3 rounded-full" style={{ width: '30%' }}></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium text-gray-700 dark:text-dark-text-secondary">Savings (20%)</span>
              <span className="font-semibold text-gray-800 dark:text-dark-text-primary">
                {formatCurrency(recommendations.summary.recommendedAllocation.savings)}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-dark-border-strong rounded-full h-3">
              <div className="bg-green-500 h-3 rounded-full" style={{ width: '20%' }}></div>
            </div>
          </div>
        </div>

        {recommendations.summary.goalBasedSavingsRequired > 0 && (
          <div className="mt-4 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
            <p className="text-sm text-indigo-800">
              <strong>💡 Goal-Based Savings:</strong> Based on your active goals, you need to save 
              <strong> {formatCurrency(recommendations.summary.goalBasedSavingsRequired)}</strong> monthly.
            </p>
          </div>
        )}

        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800">
            <strong>🛡️ Emergency Fund Target:</strong> Aim for 
            <strong> {formatCurrency(recommendations.summary.emergencyFundRecommendation)}</strong> (6 months of expenses).
          </p>
        </div>
      </div>

      {/* Insights */}
      {recommendations.insights && recommendations.insights.length > 0 && (
        <div className="bg-white dark:bg-dark-surface-secondary rounded-xl border border-gray-200 dark:border-dark-border-strong shadow-sm p-5 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-dark-text-primary mb-4">💡 Personalized Insights</h2>
          <div className="space-y-3">
            {recommendations.insights.map((insight, index) => (
              <div
                key={index}
                className={`flex items-start gap-3 p-4 rounded-lg border ${
                  insight.priority === 'high' ? 'bg-red-50 border-red-200' :
                  insight.priority === 'medium' ? 'bg-yellow-50 border-yellow-200' :
                  'bg-blue-50 border-blue-200'
                }`}
              >
                {getInsightIcon(insight.type)}
                <div className="flex-1">
                  <p className="font-medium text-gray-800 dark:text-dark-text-primary">{insight.category}</p>
                  <p className="text-sm text-gray-600 dark:text-dark-text-secondary">{insight.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category Recommendations */}
      <div className="bg-white dark:bg-dark-surface-secondary rounded-xl border border-gray-200 dark:border-dark-border-strong shadow-sm p-5">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-dark-text-primary mb-5">Category-wise Recommendations</h2>
        <div className="space-y-4">
          {recommendations.recommendations.map((rec, index) => (
            <div
              key={index}
              className={`border-l-4 rounded-lg p-4 ${getStatusColor(rec.status)}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <h3 className="text-base font-semibold text-gray-800 dark:text-dark-text-primary">{rec.category}</h3>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    rec.categoryType === 'essential' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                  }`}>
                    {rec.categoryType}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    rec.status === 'on_track' ? 'bg-green-100 text-green-700' :
                    rec.status === 'overspending' ? 'bg-red-100 text-red-700' :
                    rec.status === 'underspending' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 dark:bg-dark-surface-elevated text-gray-700 dark:text-dark-text-secondary'
                  }`}>
                    {rec.status.replace('_', ' ')}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                <div>
                  <p className="text-xs text-gray-600 dark:text-dark-text-secondary mb-1">Current Spending</p>
                  <p className="text-base font-semibold text-gray-800 dark:text-dark-text-primary">{formatCurrency(rec.currentSpending)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-dark-text-secondary mb-1">Recommended Budget</p>
                  <p className="text-base font-semibold text-indigo-600">{formatCurrency(rec.recommendedBudget)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-dark-text-secondary mb-1">% of Income</p>
                  <p className="text-base font-semibold text-purple-600">{rec.percentageOfIncome}%</p>
                </div>
              </div>

              <p className="text-sm text-gray-700 dark:text-dark-text-secondary italic">💡 {rec.suggestion}</p>

              {rec.hasExistingBudget && (
                <p className="text-xs text-gray-500 dark:text-dark-text-tertiary mt-2">
                  Current budget limit: {formatCurrency(rec.existingBudgetLimit)}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BudgetRecommendations;

