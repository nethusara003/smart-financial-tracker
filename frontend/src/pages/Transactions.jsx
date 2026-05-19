import React, { useState, useMemo } from "react";
import { useLocalStorage } from "../hooks/useLocalStorage";
import TransactionForm from "../components/TransactionForm";
import { useCurrency } from "../context/CurrencyContext";
import GuestRestricted from '../components/GuestRestricted';
import { ContextMenu, InlineEditor, useToast } from "../components/ui";
import { useDeleteTransaction, useTransactions } from "../hooks/useTransactions";
import {
  getPresetDateBounds,
  getRangeBounds,
  parseDateInputValue,
  toStartOfDay,
  toEndOfDay,
} from "../utils/dateRangeFilter";
import CompactDateModal from "../components/CompactDateModal";
import SystemPageHeader from "../components/layout/SystemPageHeader";
import {
  Search,
  Filter,
  Plus,
  TrendingUp,
  TrendingDown,
  Calendar,
  Edit,
  Trash2,
  Download,
  BarChart3,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  SlidersHorizontal,
  RefreshCw,
  DollarSign,
  X,
  Receipt,
  MoreVertical,
  ChevronDown
} from "lucide-react";

/* ================= CATEGORY BADGES ================= */

const CATEGORY_CONFIG = {
  // Expense categories
  food: { icon: "🍔", className: "bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-700 border-emerald-200", color: "emerald" },
  transport: { icon: "🚗", className: "bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border-blue-200", color: "blue" },
  rent: { icon: "🏠", className: "bg-gradient-to-r from-yellow-50 to-yellow-100 text-yellow-700 border-yellow-200", color: "yellow" },
  utilities: { icon: "⚡", className: "bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border-blue-200", color: "blue" },
  entertainment: { icon: "🎮", className: "bg-gradient-to-r from-orange-50 to-orange-100 text-orange-700 border-orange-200", color: "orange" },
  healthcare: { icon: "🏥", className: "bg-gradient-to-r from-red-50 to-red-100 text-red-700 border-red-200", color: "red" },
  education: { icon: "🎓", className: "bg-gradient-to-r from-teal-50 to-teal-100 text-teal-700 border-teal-200", color: "teal" },
  shopping: { icon: "🛍", className: "bg-gradient-to-r from-rose-50 to-rose-100 text-rose-700 border-rose-200", color: "rose" },
  subscriptions: { icon: "📦", className: "bg-gradient-to-r from-slate-50 to-slate-100 text-slate-700 border-slate-200", color: "slate" },
  "loan payment": { icon: "🏦", className: "bg-gradient-to-r from-purple-50 to-purple-100 text-purple-700 border-purple-200", color: "purple" },
  goal_contribution: { icon: "🎯", className: "bg-gradient-to-r from-violet-50 to-violet-100 text-violet-700 border-violet-200", color: "violet" },
  wallet_topup: { icon: "💳", className: "bg-gradient-to-r from-indigo-50 to-indigo-100 text-indigo-700 border-indigo-200", color: "indigo" },
  wallet_withdrawal: { icon: "🏧", className: "bg-gradient-to-r from-cyan-50 to-cyan-100 text-cyan-700 border-cyan-200", color: "cyan" },
  wallet_transfer_sent: { icon: "↗", className: "bg-gradient-to-r from-violet-50 to-violet-100 text-violet-700 border-violet-200", color: "violet" },
  wallet_transfer_received: { icon: "↘", className: "bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-700 border-emerald-200", color: "emerald" },
  wallet_transfer_reversal_in: { icon: "↩", className: "bg-gradient-to-r from-lime-50 to-lime-100 text-lime-700 border-lime-200", color: "lime" },
  wallet_transfer_reversal_out: { icon: "↪", className: "bg-gradient-to-r from-amber-50 to-amber-100 text-amber-700 border-amber-200", color: "amber" },
  // Income categories
  salary: { icon: "💼", className: "bg-gradient-to-r from-success-50 to-success-100 text-success-700 border-success-200", color: "success" },
  freelance: { icon: "💻", className: "bg-gradient-to-r from-teal-50 to-teal-100 text-teal-700 border-teal-200", color: "teal" },
  business: { icon: "🏢", className: "bg-gradient-to-r from-primary-50 to-primary-100 text-primary-700 border-primary-200", color: "primary" },
  investment: { icon: "📈", className: "bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-700 border-emerald-200", color: "emerald" },
  gift: { icon: "🎁", className: "bg-gradient-to-r from-fuchsia-50 to-fuchsia-100 text-fuchsia-700 border-fuchsia-200", color: "fuchsia" },
  "other income": { icon: "💰", className: "bg-gradient-to-r from-success-50 to-success-100 text-success-700 border-success-200", color: "success" },
  "other expense": { icon: "📊", className: "bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 border-gray-200", color: "gray" },
  default: { icon: "📌", className: "bg-gradient-to-r from-gray-50 to-gray-100 text-gray-600 border-gray-200", color: "gray" },
};

const getBadge = (category) => {
  if (!category) return CATEGORY_CONFIG.default;
  return (
    CATEGORY_CONFIG[category.toLowerCase()] ||
    CATEGORY_CONFIG.default
  );
};

const isWalletOnlyMovement = (tx) => {
  const category = String(tx?.category || "").toLowerCase();
  return tx?.scope === "wallet" || category.startsWith("wallet_transfer") || tx?.isTransfer;
};

const isProtectedSystemEntry = (tx) =>
  Boolean(
    tx?.systemManaged ||
      tx?.isTransfer ||
      String(tx?.category || "").toLowerCase().startsWith("wallet_") ||
      tx?.category === "goal_contribution"
  );



const Transactions = ({ auth }) => {
  const toast = useToast();
  const { formatCurrency } = useCurrency();
  const scopeFilter = "all";
  const {
    data: transactions = [],
    isLoading: loading,
    error: transactionsError,
  } = useTransactions({ scope: scopeFilter });
  const deleteTransactionMutation = useDeleteTransaction();
  const [searchTerm, setSearchTerm] = useState("");
  const [month, setMonth] = useState("All");
  const [type, setType] = useState("All");
  const [category, setCategory] = useState("All");
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState("desc");
  const [showFilters] = useState(true); // Default to showing filters as toggle is missing
  const [activeAction, setActiveAction] = useState(null);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [editingTx, setEditingTx] = useState(null);
  const [txToDelete, setTxToDelete] = useState(null);
  const defaultCustomRange = useMemo(() => getPresetDateBounds("thisMonth"), []);
  const [timePeriod, setTimePeriod] = useLocalStorage("sft_transactions_timePeriod", "thisMonth");
  const [customDateRange, setCustomDateRange] = useState(defaultCustomRange);
  const [customRangeDraft, setCustomRangeDraft] = useState(defaultCustomRange);
  const [showCustomRangePanel, setShowCustomRangePanel] = useState(false);

  /* ================= DELETE ================= */

  const handleDeleteClick = (tx) => {
    setTxToDelete(tx);
    setActiveAction("delete");
    setActiveMenuId(null);
  };

  const confirmDelete = async () => {
    if (!txToDelete) return;

    try {
      await deleteTransactionMutation.mutateAsync(txToDelete._id);
      setActiveAction(null);
      setTxToDelete(null);
      toast.success("Transaction deleted successfully");
    } catch (error) {
      toast.error(error.message || "Failed to delete transaction");
    }
  };

  const cancelDelete = () => {
    setActiveAction(null);
    setTxToDelete(null);
  };

  const { startDate: dateRangeStart, endDate: dateRangeEnd } = useMemo(() => {
    return getRangeBounds(timePeriod, customDateRange);
  }, [timePeriod, customDateRange]);

  /* ================= FILTER ================= */

  const filteredTransactions = transactions.filter((tx) => {
    // Search filter
    const searchMatch = searchTerm === "" || 
      tx.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tx.note && tx.note.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Date range filter
    const transDate = new Date(tx.date);
    const dateMatch = transDate >= dateRangeStart && transDate <= dateRangeEnd;
    
    // Month filter
    const txMonth = new Date(tx.date).getMonth() + 1;
    const monthMatch = month === "All" ? true : txMonth === Number(month);
    
    // Type filter
    const typeMatch = type === "All" ? true : tx.type === type;
    
    // Category filter
    const categoryMatch = category === "All" ? true : tx.category === category;
    
    return searchMatch && dateMatch && monthMatch && typeMatch && categoryMatch;
  });

  // Sort transactions
  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    let aValue, bValue;
    
    switch (sortBy) {
      case 'amount':
        aValue = Number(a.amount);
        bValue = Number(b.amount);
        break;
      case 'category':
        aValue = a.category.toLowerCase();
        bValue = b.category.toLowerCase();
        break;
      case 'type':
        aValue = a.type;
        bValue = b.type;
        break;
      default: // date
        aValue = new Date(a.date).getTime();
        bValue = new Date(b.date).getTime();
        // If dates are the same, use createdAt as tiebreaker
        if (aValue === bValue) {
          aValue = new Date(a.createdAt || a.date).getTime();
          bValue = new Date(b.createdAt || b.date).getTime();
        }
    }
    
    if (sortOrder === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    }
  });

  // Calculate statistics
  const statsSourceTransactions = filteredTransactions;
  const tableScopeLabel = "All Transactions";

  const statsSourceTransactionsAdjusted = statsSourceTransactions.filter((tx) => !isWalletOnlyMovement(tx));

  const stats = {
    total: filteredTransactions.length,
    income: statsSourceTransactionsAdjusted.filter(tx => tx.type === 'income').reduce((sum, tx) => sum + Number(tx.amount), 0),
    expense: statsSourceTransactionsAdjusted.filter(tx => tx.type === 'expense').reduce((sum, tx) => sum + Number(tx.amount), 0),
    incomeCount: statsSourceTransactionsAdjusted.filter(tx => tx.type === 'income').length,
    expenseCount: statsSourceTransactionsAdjusted.filter(tx => tx.type === 'expense').length
  };
  
  const balance = stats.income - stats.expense;

  // Get unique categories for filter
  const uniqueCategories = [...new Set(transactions.map(tx => tx.category))].sort();

  // Block guest users
  if (auth?.isGuest) {
    return <GuestRestricted featureName="Transactions" />;
  }


  const handleTimePeriodChange = (nextPeriod) => {
    setTimePeriod(nextPeriod);
    if (nextPeriod === "custom") {
      setCustomRangeDraft(customDateRange);
      setShowCustomRangePanel(true);
      return;
    }
    setShowCustomRangePanel(false);
  };

  const handleCustomDateDraftChange = (field, value) => {
    const parsed = parseDateInputValue(value, field === "endDate");
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
    setTimePeriod("custom");
    setShowCustomRangePanel(false);
  };

  const handleCancelCustomRange = () => {
    setCustomRangeDraft(customDateRange);
    setShowCustomRangePanel(false);
  };

  const handleQuickCustomPreset = (presetValue) => {
    setCustomRangeDraft(getPresetDateBounds(presetValue));
  };

  return (
    <div className="space-y-6 animate-fade-in">
        <SystemPageHeader
          tagline="DETERMINISTIC TRANSACTION FLOW"
          title="Transactions"
          subtitle="Track, analyze and manage all your financial activities."
          actions={(
            <>
              <div className="flex items-center gap-1.5">
                <div className="flex flex-wrap items-center gap-2 rounded-full border border-light-border-default dark:border-white/5 bg-light-surface-primary dark:bg-white/5 px-3 py-2">
                  <Calendar className="w-4 h-4 text-light-text-secondary dark:text-slate-300" />
                  <div className="relative">
                    <select
                      value={timePeriod}
                      onChange={(e) => handleTimePeriodChange(e.target.value)}
                      className="min-w-[140px] bg-transparent text-[11px] font-semibold text-light-text-primary dark:text-white focus:outline-none cursor-pointer"
                    >
                      <option value="week">Last 7 Days</option>
                      <option value="thisMonth">This Month</option>
                      <option value="thisYear">This Year</option>
                      <option value="pastYear">Past Year</option>
                      <option value="custom">Custom Range</option>
                    </select>

                    {timePeriod === 'custom' && showCustomRangePanel && (
                      <CompactDateModal
                        draft={customRangeDraft}
                        onDraftChange={handleCustomDateDraftChange}
                        onApply={handleApplyCustomRange}
                        onCancel={handleCancelCustomRange}
                        onPreset={handleQuickCustomPreset}
                      />
                    )}
                  </div>
                </div>
                {timePeriod === 'custom' && (
                  <button
                    type="button"
                    onClick={() => setShowCustomRangePanel((prev) => !prev)}
                    className="flex items-center justify-center p-1.5 rounded-full border border-blue-500/20 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 hover:text-white transition-colors cursor-pointer"
                    title="Edit custom date range"
                  >
                    <span className="text-[10px] font-bold px-1 py-0.5">Edit</span>
                  </button>
                )}
              </div>

              <button
                onClick={() => {
                  setEditingTx(null);
                  setActiveAction("create");
                }}
                data-testid="open-add-transaction-button"
                className="inline-flex items-center gap-2 rounded-full border border-light-border-default dark:border-white/10 bg-light-surface-primary dark:bg-white/5 px-4 py-2 text-sm font-semibold text-light-text-primary dark:text-white transition hover:bg-light-bg-accent dark:hover:border-white/20 dark:hover:bg-white/10"
              >
                <Plus className="w-5 h-5" />
                Add Transaction
              </button>
            </>
          )}
        />

        {transactionsError && (
          <div className="rounded-xl border border-danger-200 dark:border-danger-500/30 bg-danger-50 dark:bg-danger-900/20 px-4 py-3 text-sm text-danger-700 dark:text-danger-200">
            {transactionsError.message || "Failed to load transactions."}
          </div>
        )}



        {/* KPI Strip - Horizontal 4-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Total Transactions */}
          <div className="h-[96px] rounded-2xl border border-light-border-default dark:border-white/5 bg-white dark:bg-[#0D1117] p-4 shadow-premium dark:shadow-card-dark transition-all group">
            <div className="flex h-full items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500 dark:bg-blue-500 shadow-lg group-hover:scale-105 transition-transform">
                <BarChart3 className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-light-text-secondary dark:text-[#9CA3AF]">Total</p>
                <p className="dashboard-figure-glow truncate text-xl font-bold text-light-text-primary dark:text-[#F9FAFB]">{stats.total}</p>
              </div>
            </div>
          </div>

          {/* Total Income */}
          <div className="h-[96px] rounded-2xl border border-light-border-default dark:border-white/5 bg-white dark:bg-[#0D1117] p-4 shadow-premium dark:shadow-card-dark transition-all group">
            <div className="flex h-full items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-500 dark:bg-success-500 shadow-lg group-hover:scale-105 transition-transform">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#10B981]">Income</p>
                <p className="dashboard-figure-glow truncate text-xl font-bold text-[#10B981]">{formatCurrency(stats.income)}</p>
              </div>
            </div>
          </div>

          {/* Total Expense */}
          <div className="h-[96px] rounded-2xl border border-light-border-default dark:border-white/5 bg-white dark:bg-[#0D1117] p-4 shadow-premium dark:shadow-card-dark transition-all group">
            <div className="flex h-full items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500 dark:bg-danger-500 shadow-lg group-hover:scale-105 transition-transform">
                <TrendingDown className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#EF4444]">Expenses</p>
                <p className="dashboard-figure-glow truncate text-xl font-bold text-[#EF4444]">{formatCurrency(stats.expense)}</p>
              </div>
            </div>
          </div>

          {/* Net Balance */}
          <div className="h-[96px] rounded-2xl border border-light-border-default dark:border-white/5 bg-white dark:bg-[#0D1117] p-4 shadow-premium dark:shadow-card-dark transition-all group">
            <div className="flex h-full items-center gap-3">
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg shadow-lg group-hover:scale-105 transition-transform ${
                balance >= 0 
                  ? 'bg-emerald-500 dark:bg-emerald-500' 
                  : 'bg-orange-500 dark:bg-orange-500'
              }`}>
                <DollarSign className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <p className={`text-xs font-semibold ${balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-orange-600 dark:text-orange-400'}`}>
                  {balance >= 0 ? 'Balance' : 'Deficit'}
                </p>
                <p className={`dashboard-figure-glow truncate text-xl font-bold ${balance >= 0 ? 'text-emerald-700 dark:text-[#F9FAFB]' : 'text-orange-700 dark:text-[#F9FAFB]'}`}>
                  {formatCurrency(Math.abs(balance))}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Advanced Filters - Collapsible */}
        {showFilters && (
          <div className="bg-light-surface-secondary dark:bg-dark-surface-primary rounded-xl shadow-premium dark:shadow-card-dark border border-light-border-default dark:border-dark-border-strong p-4 animate-in">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h3 className="text-base font-semibold text-light-text-primary dark:text-dark-text-primary">Filter & Search</h3>
            </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                {/* Search */}
                <div className="lg:col-span-2">
                  <label className="block text-xs font-medium text-light-text-primary dark:text-dark-text-primary mb-1.5">Search</label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-light-text-tertiary dark:text-dark-text-tertiary" />
                    <input
                      type="text"
                      placeholder="Search by category or note..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 border border-light-border-default dark:border-dark-border-default bg-light-surface-primary dark:bg-dark-surface-secondary text-light-text-primary dark:text-dark-text-primary rounded-lg text-sm focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-500/20 focus:border-blue-600 dark:focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>

                {/* Month Filter */}
                <div>
                  <label className="block text-xs font-medium text-light-text-primary dark:text-dark-text-primary mb-1.5">Month</label>
                  <select
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    className="w-full px-3 py-2.5 border border-light-border-default dark:border-dark-border-default bg-light-surface-primary dark:bg-dark-surface-secondary text-light-text-primary dark:text-dark-text-primary rounded-lg text-sm focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-500/20 focus:border-blue-600 dark:focus:border-blue-500 transition-all"
                  >
                    <option value="All">All Months</option>
                    {[...Array(12)].map((_, i) => (
                      <option key={i} value={i + 1}>
                        {new Date(0, i).toLocaleString("default", { month: "long" })}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Type Filter */}
                <div>
                  <label className="block text-xs font-medium text-light-text-primary dark:text-dark-text-primary mb-1.5">Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full px-3 py-2.5 border border-light-border-default dark:border-dark-border-default bg-light-surface-primary dark:bg-dark-surface-secondary text-light-text-primary dark:text-dark-text-primary rounded-lg text-sm focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-500/20 focus:border-blue-600 dark:focus:border-blue-500 transition-all"
                  >
                    <option value="All">All Types</option>
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                  </select>
                </div>

                {/* Category Filter */}
                <div>
                  <label className="block text-xs font-medium text-light-text-primary dark:text-dark-text-primary mb-1.5">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2.5 border border-light-border-default dark:border-dark-border-default bg-light-surface-primary dark:bg-dark-surface-secondary text-light-text-primary dark:text-dark-text-primary rounded-lg text-sm focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-500/20 focus:border-blue-600 dark:focus:border-blue-500 transition-all"
                  >
                    <option value="All">All Categories</option>
                    {uniqueCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Sort Options */}
              <div className="flex flex-wrap items-center gap-3 mt-4 pt-3 border-t border-light-border-default dark:border-dark-border-default">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-light-text-primary dark:text-dark-text-primary">Sort by:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-2.5 py-1.5 border border-light-border-default dark:border-dark-border-default bg-light-surface-primary dark:bg-dark-surface-secondary text-light-text-primary dark:text-dark-text-primary rounded-lg text-sm focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-500/20"
                  >
                    <option value="date">Date</option>
                    <option value="amount">Amount</option>
                    <option value="category">Category</option>
                    <option value="type">Type</option>
                  </select>
                  <button
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="px-2.5 py-1.5 bg-light-surface-hover dark:bg-dark-surface-hover text-light-text-primary dark:text-dark-text-primary rounded-lg text-sm hover:bg-light-bg-accent dark:hover:bg-dark-surface-elevated border border-light-border-default dark:border-dark-border-default transition-colors"
                  >
                    {sortOrder === 'asc' ? '↑ Ascending' : '↓ Descending'}
                  </button>
                </div>
                
                {/* Clear Filters */}
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setMonth('All');
                    setType('All');
                    setCategory('All');
                    setSortBy('date');
                    setSortOrder('desc');
                  }}
                  className="px-3 py-1.5 text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text-primary dark:hover:text-dark-text-primary text-sm transition-colors flex items-center gap-1"
                >
                  <RefreshCw className="w-4 h-4" />
                  Clear All
                </button>
              </div>
            </div>
          )}

        {/* Transaction Table */}
        <div className="bg-light-surface-secondary dark:bg-[rgba(13,17,23,0.86)] rounded-2xl shadow-premium dark:shadow-card-dark border border-light-border-default dark:border-white/5 overflow-hidden">
          <div className="px-6 py-4 bg-[rgba(13,17,23,0.72)] backdrop-blur-[8px] border-b border-white/5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-light-text-primary dark:text-dark-text-primary">
                Transactions ({sortedTransactions.length}) - {tableScopeLabel}
              </h3>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-4 border-blue-600 dark:border-blue-400 border-t-transparent"></div>
              <p className="mt-3 text-light-text-secondary dark:text-dark-text-secondary font-medium text-sm">Loading transactions...</p>
            </div>
          ) : sortedTransactions.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-light-surface-hover dark:bg-dark-surface-hover flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-light-text-tertiary dark:text-dark-text-tertiary" />
              </div>
              <p className="text-light-text-secondary dark:text-dark-text-secondary font-medium text-sm">No transactions found</p>
              <p className="text-light-text-tertiary dark:text-dark-text-tertiary text-xs mt-1">Try adjusting your filters or add your first transaction</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-transparent border-b border-white/5">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-light-text-primary dark:text-dark-text-primary">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-light-text-primary dark:text-dark-text-primary">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-light-text-primary dark:text-dark-text-primary">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-light-text-primary dark:text-dark-text-primary">Note</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-light-text-primary dark:text-dark-text-primary">Amount</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-light-text-primary dark:text-dark-text-primary">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTransactions.map((tx) => {
                    const badge = getBadge(tx.category);
                    const isIncome = tx.type === 'income';
                    const walletOnly = isWalletOnlyMovement(tx);
                    const protectedEntry = isProtectedSystemEntry(tx);
                    
                    return (
                      <tr
                        key={tx._id}
                        className="group border-b border-white/5 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-light-text-tertiary dark:text-dark-text-tertiary" />
                            <span className="text-sm text-light-text-primary dark:text-dark-text-primary font-medium">
                              {new Date(tx.date).toLocaleDateString()}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            isIncome 
                              ? 'bg-success-100 dark:bg-success-900/30 text-[#10B981] dark:text-[#10B981] border border-success-200 dark:border-success-500/30'
                              : 'bg-danger-100 dark:bg-danger-900/30 text-[#EF4444] dark:text-[#EF4444] border border-danger-200 dark:border-danger-500/30'
                          }`}>
                            {isIncome ? (
                              <ArrowUpRight className="w-2.5 h-2.5" />
                            ) : (
                              <ArrowDownLeft className="w-2.5 h-2.5" />
                            )}
                            {tx.type}
                          </div>
                          {walletOnly && (
                            <p className="mt-1 text-[11px] font-medium text-blue-600 dark:text-blue-400">Wallet movement</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${badge.className}`}>
                            <span>{badge.icon}</span>
                            {tx.category}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-light-text-secondary dark:text-dark-text-secondary max-w-xs truncate">
                            {tx.note || <span className="text-light-text-tertiary dark:text-dark-text-tertiary italic">No note</span>}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`text-base font-bold ${isIncome ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                            {isIncome ? '+' : '-'}{formatCurrency(tx.amount)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            {protectedEntry ? (
                              <span className="text-[11px] font-medium text-light-text-tertiary dark:text-dark-text-tertiary">
                                Auto record
                              </span>
                            ) : (
                              <ContextMenu
                                isOpen={activeMenuId === tx._id}
                                onOpenChange={(open) => setActiveMenuId(open ? tx._id : null)}
                                icon={<MoreVertical className="w-3.5 h-3.5" />}
                                buttonClassName="p-1.5"
                                items={[
                                  {
                                    key: "edit",
                                    label: "Edit Transaction",
                                    onClick: () => {
                                      setEditingTx(tx);
                                      setActiveAction("edit");
                                    },
                                  },
                                  {
                                    key: "delete",
                                    label: "Delete Transaction",
                                    onClick: () => handleDeleteClick(tx),
                                    variant: "danger",
                                  },
                                ]}
                              />
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Premium Delete Confirmation Modal */}
        <InlineEditor
          isOpen={activeAction === "delete" && Boolean(txToDelete)}
          title="Delete Transaction"
          subtitle="This action cannot be undone"
          onClose={cancelDelete}
          className="max-w-xl"
        >
          {txToDelete && (
            <div>
              <div className="mb-6 bg-light-bg-accent dark:bg-dark-surface-secondary rounded-xl p-4 border border-light-border-default dark:border-dark-border-default">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary">Category</span>
                  <span className="text-sm font-bold text-light-text-primary dark:text-dark-text-primary">{txToDelete.category}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary">Type</span>
                  <span className={`text-sm font-bold ${
                    txToDelete.type === 'income' ? 'text-[#10B981]' : 'text-[#EF4444]'
                  }`}>{txToDelete.type}</span>
                </div>
                <div className="pt-2 border-t border-light-border-subtle dark:border-dark-border-default">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary">Amount</span>
                    <span className={`text-xl font-bold ${
                      txToDelete.type === 'income' ? 'text-[#10B981]' : 'text-[#EF4444]'
                    }`}>{formatCurrency(txToDelete.amount)}</span>
                  </div>
                </div>
              </div>

              <p className="text-sm text-light-text-primary dark:text-dark-text-primary mb-6">
                Are you sure you want to delete this transaction? This will permanently remove it from your records.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={cancelDelete}
                  className="flex-1 px-4 py-2.5 bg-light-bg-accent dark:bg-dark-surface-secondary text-light-text-primary dark:text-dark-text-primary rounded-lg font-semibold hover:bg-light-bg-hover dark:hover:bg-dark-bg-hover transition-all duration-200 border border-light-border-default dark:border-dark-border-strong"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={deleteTransactionMutation.isPending}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-danger-500 to-danger-600 hover:from-danger-600 hover:to-danger-700 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  {deleteTransactionMutation.isPending ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          )}
        </InlineEditor>

        <InlineEditor
          isOpen={activeAction === "create" || activeAction === "edit"}
          title={editingTx ? "Edit Transaction" : "Add New Transaction"}
          subtitle={editingTx ? "Update your transaction details" : "Record a new financial activity"}
          onClose={() => {
            setActiveAction(null);
            setEditingTx(null);
          }}
        >
          <TransactionForm
            key={editingTx?._id || "new-transaction"}
            initialData={editingTx}
            onSuccess={() => {
              setActiveAction(null);
              setEditingTx(null);
            }}
          />
        </InlineEditor>
      </div>
  );
};

export default Transactions;
