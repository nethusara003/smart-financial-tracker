import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { useSearchParams } from "react-router-dom";
import { useCurrency } from "../context/CurrencyContext";
import GuestRestricted from '../components/GuestRestricted';
import { useTransactions } from "../hooks/useTransactions";
import {
  DATE_RANGE_OPTIONS,
  getDateRangeLabel,
  getPresetDateBounds,
  getRangeBounds,
  parseDateInputValue,
  toStartOfDay,
  toEndOfDay,
} from "../utils/dateRangeFilter";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";
import CompactDateModal from "../components/CompactDateModal";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  PieChart as PieChartIcon,
  BarChart3,
  Activity,
  Info,
  Lightbulb,
  Target,
  DollarSign,
  Download,
  ChevronDown,
  FileText,
  FileSpreadsheet,
  FileDown,
} from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import SystemPageHeader from "../components/layout/SystemPageHeader";

/* ================= CUSTOM TOOLTIPS ================= */

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-white dark:bg-[#0D1117] border border-gray-200 dark:border-white/5 rounded-xl shadow-xl px-4 py-3">
      <p className="font-semibold text-gray-900 dark:text-[#F9FAFB] mb-2">{label}</p>
      {payload.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: item.color }}
          ></div>
          <p className="text-sm text-gray-700 dark:text-[#9CA3AF]">
            <span className="font-medium">{item.name}:</span> Rs. {item.value?.toLocaleString()}
          </p>
        </div>
      ))}
    </div>
  );
};

const PieTooltip = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0];
  return (
    <div className="bg-white dark:bg-[#0D1117] border border-gray-200 dark:border-white/5 rounded-xl shadow-xl px-4 py-3">
      <p className="font-semibold text-gray-900 dark:text-[#F9FAFB] mb-1">{data.name}</p>
      <p className="text-sm text-gray-700 dark:text-[#9CA3AF]">
        Amount: <span className="font-semibold">Rs. {data.value?.toLocaleString()}</span>
      </p>
      <p className="text-sm text-gray-700 dark:text-[#9CA3AF]">
        Percentage: <span className="font-semibold">{data.payload.percentage}%</span>
      </p>
    </div>
  );
};

const AnalyticsHub = ({ auth }) => {
  const { formatCurrency } = useCurrency();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab') || 'overview';
  const [activeTab, setActiveTab] = useState(tabFromUrl);
  const defaultCustomRange = useMemo(() => getPresetDateBounds("week"), []);
  const [timeScope, setTimeScope] = useLocalStorage("sft_analyticshub_timeScope", "month");
  const [customDateRange, setCustomDateRange] = useState(defaultCustomRange);
  const [customRangeDraft, setCustomRangeDraft] = useState(defaultCustomRange);
  const [showCustomRangePanel, setShowCustomRangePanel] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const {
    data: transactions = [],
    isLoading: loading,
  } = useTransactions({ enabled: !auth?.isGuest });

  useEffect(() => {
    setActiveTab(tabFromUrl);
  }, [tabFromUrl]);

  /* ================= DATE BASE ================= */

  const today = new Date();
  const thisMonth = today.getMonth();
  const thisYear = today.getFullYear();

  const selectedRangeLabel = useMemo(() => {
    if (timeScope === "custom") {
      return getDateRangeLabel("custom", customDateRange);
    }

    if (timeScope === "month") {
      return getDateRangeLabel("thisMonth");
    }

    if (timeScope === "year") {
      return getDateRangeLabel("thisYear");
    }

    if (timeScope === "all") {
      return getDateRangeLabel("pastYear");
    }

    return getDateRangeLabel("week");
  }, [customDateRange, timeScope]);

  const handleTimeScopeChange = useCallback((nextScope) => {
    setTimeScope(nextScope);
    if (nextScope === "custom") {
      setCustomRangeDraft(customDateRange);
      setShowCustomRangePanel(true);
      return;
    }
    setShowCustomRangePanel(false);
  }, [customDateRange, setTimeScope]);

  const handleCustomDateDraftChange = useCallback((field, value) => {
    const parsed = parseDateInputValue(value, field === "endDate");
    if (!parsed) {
      return;
    }

    setCustomRangeDraft((prev) => ({
      ...prev,
      [field]: parsed,
    }));
  }, []);

  const handleApplyCustomRange = useCallback(() => {
    const startDate = toStartOfDay(customRangeDraft.startDate);
    const endDate = toEndOfDay(customRangeDraft.endDate);

    if (startDate > endDate) {
      return;
    }

    setCustomDateRange({ startDate, endDate });
    setTimeScope("custom");
    setShowCustomRangePanel(false);
  }, [customRangeDraft.startDate, customRangeDraft.endDate, setTimeScope]);

  const handleCancelCustomRange = useCallback(() => {
    setCustomRangeDraft(customDateRange);
    setShowCustomRangePanel(false);
  }, [customDateRange]);

  const handleQuickCustomPreset = useCallback((presetValue) => {
    setCustomRangeDraft(getPresetDateBounds(presetValue));
  }, []);

  /* ================= TIME SCOPE FILTERING ================= */

  const scopedTransactions = useMemo(() => {
    const now = new Date();
    const { startDate: customStart, endDate: customEnd } = getRangeBounds("custom", customDateRange);
    
    if (timeScope === "week") {
      const weekAgo = new Date(now);
      weekAgo.setDate(now.getDate() - 7);
      return transactions.filter(t => new Date(t.date) >= weekAgo);
    } else if (timeScope === "month") {
      return transactions.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
      });
    } else if (timeScope === "year") {
      return transactions.filter(t => new Date(t.date).getFullYear() === thisYear);
    } else if (timeScope === "all") {
      const start = new Date(now);
      start.setDate(now.getDate() - 365);
      return transactions.filter((t) => {
        const txDate = new Date(t.date);
        return !Number.isNaN(txDate.getTime()) && txDate >= start && txDate <= now;
      });
    } else if (timeScope === "custom") {
      return transactions.filter((t) => {
        const txDate = new Date(t.date);
        return !Number.isNaN(txDate.getTime()) && txDate >= customStart && txDate <= customEnd;
      });
    } else {
      return transactions;
    }
  }, [transactions, timeScope, thisMonth, thisYear, customDateRange]);

  /* ================= BASIC CALCULATIONS ================= */

  const totalIncome = useMemo(() => 
    scopedTransactions
      .filter(t => t.type === "income")
      .reduce((sum, t) => sum + Number(t.amount || 0), 0),
    [scopedTransactions]
  );

  const totalExpense = useMemo(() =>
    scopedTransactions
      .filter(t => t.type === "expense")
      .reduce((sum, t) => sum + Number(t.amount || 0), 0),
    [scopedTransactions]
  );

  const netSavings = useMemo(() => totalIncome - totalExpense, [totalIncome, totalExpense]);

  /* ================= TREND DATA (DYNAMIC BASED ON TIME SCOPE) ================= */

  const trendTitle = useMemo(() => {
    switch(timeScope) {
      case 'week': return 'Weekly Financial Trend';
      case 'month': return 'Monthly Financial Trend';
      case 'year': return 'Yearly Financial Trend';
      case 'all': return 'Past Year Financial Trend';
      case 'custom': return 'Custom Range Financial Trend';
      default: return 'Financial Trend';
    }
  }, [timeScope]);

  const monthlyTrend = useMemo(() => {
    const now = new Date();
    const trendData = {};
    const periods = [];
    
    if (timeScope === 'week') {
      // Daily data for past 7 days
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(now.getDate() - i);
        const dateKey = date.toISOString().split('T')[0];
        const label = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        
        periods.push(dateKey);
        trendData[dateKey] = { label, income: 0, expense: 0, savings: 0 };
      }
      
      scopedTransactions.forEach(t => {
        const dateKey = new Date(t.date).toISOString().split('T')[0];
        if (trendData[dateKey]) {
          const amount = Number(t.amount || 0);
          if (t.type === 'income') trendData[dateKey].income += amount;
          else if (t.type === 'expense') trendData[dateKey].expense += amount;
        }
      });
    } else if (timeScope === 'month') {
      // Daily data for current month
      const year = now.getFullYear();
      const month = now.getMonth();
      const today = now.getDate();
      
      for (let day = 1; day <= today; day++) {
        const date = new Date(year, month, day);
        const dateKey = date.toISOString().split('T')[0];
        const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        periods.push(dateKey);
        trendData[dateKey] = { label, income: 0, expense: 0, savings: 0 };
      }
      
      scopedTransactions.forEach(t => {
        const dateKey = new Date(t.date).toISOString().split('T')[0];
        if (trendData[dateKey]) {
          const amount = Number(t.amount || 0);
          if (t.type === 'income') trendData[dateKey].income += amount;
          else if (t.type === 'expense') trendData[dateKey].expense += amount;
        }
      });
    } else if (timeScope === 'year') {
      // Monthly data for current year - show all 12 months
      const year = now.getFullYear();
      
      // Show all 12 months for complete yearly view
      for (let month = 0; month < 12; month++) {
        const date = new Date(year, month, 1);
        const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
        const label = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        
        periods.push(monthKey);
        trendData[monthKey] = { label, income: 0, expense: 0, savings: 0 };
      }
      
      // Only populate data for past/current months
      scopedTransactions.forEach(t => {
        const date = new Date(t.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (trendData[monthKey]) {
          const amount = Number(t.amount || 0);
          if (t.type === 'income') trendData[monthKey].income += amount;
          else if (t.type === 'expense') trendData[monthKey].expense += amount;
        }
      });
    } else if (timeScope === 'all') {
      // Past year: last 12 months monthly data
      for (let i = 11; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const label = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        
        periods.push(monthKey);
        trendData[monthKey] = { label, income: 0, expense: 0, savings: 0 };
      }
      
      scopedTransactions.forEach(t => {
        const date = new Date(t.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (trendData[monthKey]) {
          const amount = Number(t.amount || 0);
          if (t.type === 'income') trendData[monthKey].income += amount;
          else if (t.type === 'expense') trendData[monthKey].expense += amount;
        }
      });
    } else {
      const { startDate, endDate } = getRangeBounds('custom', customDateRange);
      const dayMs = 1000 * 60 * 60 * 24;
      const daySpan = Math.max(1, Math.ceil((endDate - startDate) / dayMs) + 1);

      if (daySpan <= 62) {
        for (let i = 0; i < daySpan; i++) {
          const date = new Date(startDate);
          date.setDate(startDate.getDate() + i);
          const dateKey = date.toISOString().split('T')[0];
          const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          periods.push(dateKey);
          trendData[dateKey] = { label, income: 0, expense: 0, savings: 0 };
        }

        scopedTransactions.forEach((t) => {
          const dateKey = new Date(t.date).toISOString().split('T')[0];
          if (trendData[dateKey]) {
            const amount = Number(t.amount || 0);
            if (t.type === 'income') trendData[dateKey].income += amount;
            else if (t.type === 'expense') trendData[dateKey].expense += amount;
          }
        });
      } else {
        const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
        const limit = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

        while (cursor <= limit) {
          const monthKey = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
          const label = cursor.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
          periods.push(monthKey);
          trendData[monthKey] = { label, income: 0, expense: 0, savings: 0 };
          cursor.setMonth(cursor.getMonth() + 1);
        }

        scopedTransactions.forEach((t) => {
          const date = new Date(t.date);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          if (trendData[monthKey]) {
            const amount = Number(t.amount || 0);
            if (t.type === 'income') trendData[monthKey].income += amount;
            else if (t.type === 'expense') trendData[monthKey].expense += amount;
          }
        });
      }
    }
    
    return periods.map(key => {
      const data = trendData[key];
      data.savings = data.income - data.expense;
      return data;
    });
  }, [scopedTransactions, timeScope, customDateRange]);

  /* ================= CATEGORY BREAKDOWN ================= */

  const expenseByCategory = useMemo(() => {
    const categoryMap = {};
    
    scopedTransactions
      .filter(t => t.type === "expense")
      .forEach(t => {
        const cat = t.category || "Other";
        categoryMap[cat] = (categoryMap[cat] || 0) + Number(t.amount || 0);
      });

    const total = Object.values(categoryMap).reduce((sum, val) => sum + val, 0);

    return Object.entries(categoryMap)
      .map(([category, amount]) => ({
        name: category,
        value: amount,
        percentage: total > 0 ? ((amount / total) * 100).toFixed(1) : 0
      }))
      .sort((a, b) => b.value - a.value);
  }, [scopedTransactions]);

  const incomeByCategory = useMemo(() => {
    const categoryMap = {};
    
    scopedTransactions
      .filter(t => t.type === "income")
      .forEach(t => {
        const cat = t.category || "Other";
        categoryMap[cat] = (categoryMap[cat] || 0) + Number(t.amount || 0);
      });

    const total = Object.values(categoryMap).reduce((sum, val) => sum + val, 0);

    return Object.entries(categoryMap)
      .map(([category, amount]) => ({
        name: category,
        value: amount,
        percentage: total > 0 ? ((amount / total) * 100).toFixed(1) : 0
      }))
      .sort((a, b) => b.value - a.value);
  }, [scopedTransactions]);

  /* ================= TOP CATEGORIES ================= */

  const topExpenseCategories = useMemo(() => expenseByCategory.slice(0, 5), [expenseByCategory]);
  const topIncomeCategories = useMemo(() => incomeByCategory.slice(0, 5), [incomeByCategory]);

  /* ================= PATTERN DATA (DYNAMIC BASED ON TIME SCOPE) ================= */

  const patternTitle = useMemo(() => {
    switch(timeScope) {
      case 'week': return 'Daily Transaction Analysis';
      case 'month': return 'Weekly Transaction Analysis';
      case 'year': return 'Monthly Transaction Analysis';
      case 'all': return 'Monthly Transaction Analysis';
      case 'custom': return 'Custom Transaction Analysis';
      default: return 'Transaction Pattern Analysis';
    }
  }, [timeScope]);

  const dailyPattern = useMemo(() => {
    const now = new Date();
    
    if (timeScope === 'week') {
      // Show last 7 days
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(now.getDate() - i);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        days.push({ 
          day: `${dayName} ${date.getDate()}`,
          label: dayName,
          dateKey: date.toISOString().split('T')[0],
          income: 0, 
          expense: 0, 
          count: 0 
        });
      }
      
      scopedTransactions.forEach(t => {
        const dateKey = new Date(t.date).toISOString().split('T')[0];
        const dayData = days.find(d => d.dateKey === dateKey);
        if (dayData) {
          const amount = Number(t.amount || 0);
          if (t.type === 'income') dayData.income += amount;
          else if (t.type === 'expense') dayData.expense += amount;
          dayData.count++;
        }
      });
      
      return days;
    } else if (timeScope === 'month') {
      // Show weeks of current month
      const today = now.getDate();
      
      const weeks = [
        { day: 'Week 1', label: 'Days 1-7', start: 1, end: 7, income: 0, expense: 0, count: 0 },
        { day: 'Week 2', label: 'Days 8-14', start: 8, end: 14, income: 0, expense: 0, count: 0 },
        { day: 'Week 3', label: 'Days 15-21', start: 15, end: 21, income: 0, expense: 0, count: 0 },
        { day: 'Week 4', label: 'Days 22-28', start: 22, end: 28, income: 0, expense: 0, count: 0 },
        { day: 'Week 5', label: 'Days 29+', start: 29, end: 31, income: 0, expense: 0, count: 0 }
      ];
      
      scopedTransactions.forEach(t => {
        const date = new Date(t.date);
        const day = date.getDate();
        const weekData = weeks.find(w => day >= w.start && day <= w.end);
        if (weekData) {
          const amount = Number(t.amount || 0);
          if (t.type === 'income') weekData.income += amount;
          else if (t.type === 'expense') weekData.expense += amount;
          weekData.count++;
        }
      });
      
      // Only return weeks that have passed or current week
      return weeks.filter(w => w.start <= today);
    } else if (timeScope === 'year') {
      // Show 12 months of current year
      const year = now.getFullYear();
      
      const months = [];
      for (let month = 0; month < 12; month++) {
        const date = new Date(year, month, 1);
        months.push({
          day: date.toLocaleDateString('en-US', { month: 'short' }),
          monthKey: `${year}-${String(month + 1).padStart(2, '0')}`,
          income: 0,
          expense: 0,
          count: 0
        });
      }
      
      scopedTransactions.forEach(t => {
        const date = new Date(t.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthData = months.find(m => m.monthKey === monthKey);
        if (monthData) {
          const amount = Number(t.amount || 0);
          if (t.type === 'income') monthData.income += amount;
          else if (t.type === 'expense') monthData.expense += amount;
          monthData.count++;
        }
      });
      
      return months;
    } else if (timeScope === 'all') {
      // Past year: Show last 12 months
      const months = [];
      for (let i = 11; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        months.push({
          day: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
          monthKey,
          income: 0,
          expense: 0,
          count: 0
        });
      }
      
      scopedTransactions.forEach(t => {
        const date = new Date(t.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthData = months.find(m => m.monthKey === monthKey);
        if (monthData) {
          const amount = Number(t.amount || 0);
          if (t.type === 'income') monthData.income += amount;
          else if (t.type === 'expense') monthData.expense += amount;
          monthData.count++;
        }
      });
      
      return months;
    } else {
      const { startDate, endDate } = getRangeBounds('custom', customDateRange);
      const dayMs = 1000 * 60 * 60 * 24;
      const daySpan = Math.max(1, Math.ceil((endDate - startDate) / dayMs) + 1);

      if (daySpan <= 45) {
        const days = [];
        for (let i = 0; i < daySpan; i++) {
          const date = new Date(startDate);
          date.setDate(startDate.getDate() + i);
          days.push({
            day: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            dateKey: date.toISOString().split('T')[0],
            income: 0,
            expense: 0,
            count: 0,
          });
        }

        scopedTransactions.forEach((t) => {
          const dateKey = new Date(t.date).toISOString().split('T')[0];
          const dayData = days.find((d) => d.dateKey === dateKey);
          if (dayData) {
            const amount = Number(t.amount || 0);
            if (t.type === 'income') dayData.income += amount;
            else if (t.type === 'expense') dayData.expense += amount;
            dayData.count++;
          }
        });

        return days;
      }

      const months = [];
      const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
      const limit = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

      while (cursor <= limit) {
        const monthKey = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
        months.push({
          day: cursor.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
          monthKey,
          income: 0,
          expense: 0,
          count: 0,
        });
        cursor.setMonth(cursor.getMonth() + 1);
      }

      scopedTransactions.forEach((t) => {
        const date = new Date(t.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthData = months.find((m) => m.monthKey === monthKey);
        if (monthData) {
          const amount = Number(t.amount || 0);
          if (t.type === 'income') monthData.income += amount;
          else if (t.type === 'expense') monthData.expense += amount;
          monthData.count++;
        }
      });

      return months;
    }
  }, [scopedTransactions, timeScope, customDateRange]);

  /* ================= CHART COLORS ================= */

  const EXPENSE_COLORS = [
    '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
    '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9'
  ];

  const INCOME_COLORS = [
    '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6',
    '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899'
  ];

  /* ================= TABS CONFIGURATION ================= */

  const tabs = [
    {
      id: 'overview',
      label: 'Overview',
      icon: BarChart3,
      description: 'Complete financial analytics dashboard'
    },
    {
      id: 'trend',
      label: 'Financial Trend',
      icon: TrendingUp,
      description: '6-month income, expense & savings analysis'
    },
    {
      id: 'expenses',
      label: 'Expense Analysis',
      icon: TrendingDown,
      description: 'Deep dive into spending patterns'
    },
    {
      id: 'income',
      label: 'Income Analysis',
      icon: DollarSign,
      description: 'Income sources breakdown'
    },
    {
      id: 'patterns',
      label: 'Spending Patterns',
      icon: Calendar,
      description: 'Weekly spending behavior analysis'
    }
  ];

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  };

  /* ================= RENDER CONTENT ================= */

  const renderInsightCard = (title, content, iconComponent) => (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-[rgba(13,17,23,0.92)] dark:to-[rgba(13,17,23,0.92)] rounded-2xl p-6 border border-blue-200 dark:border-white/5">
      <div className="flex items-start gap-3">
        <div className="bg-blue-100 dark:bg-[#3B82F6]/15 p-2 rounded-lg border border-blue-200 dark:border-[#3B82F6]/25">
          {React.createElement(iconComponent, { className: "w-5 h-5 text-blue-600 dark:text-blue-400" })}
        </div>
        <div>
          <h4 className="font-semibold text-gray-900 dark:text-[#F9FAFB] mb-1">{title}</h4>
          <p className="text-sm text-gray-700 dark:text-[#9CA3AF]">{content}</p>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            {/* Charts Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              {/* Monthly Trend */}
              <div className="bg-white dark:bg-[#0D1117] rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-white/5">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-[#F9FAFB] mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  {trendTitle}
                </h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={120}>
                    <AreaChart data={monthlyTrend}>
                      <defs>
                        <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.6}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.6}/>
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#161B22" opacity={1} />
                      <XAxis dataKey="label" stroke="#6b7280" />
                      <YAxis stroke="#6b7280" />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Area type="monotone" dataKey="income" stroke="#10b981" fillOpacity={1} fill="url(#colorIncome)" name="Income" />
                      <Area type="monotone" dataKey="expense" stroke="#ef4444" fillOpacity={1} fill="url(#colorExpense)" name="Expense" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Expense Pie */}
              <div className="bg-white dark:bg-[#0D1117] rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-white/5">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-[#F9FAFB] mb-4 flex items-center gap-2">
                  <PieChartIcon className="w-5 h-5 text-red-600" />
                  Expense Distribution
                </h3>
                {expenseByCategory.length === 0 ? (
                  <div className="h-80 flex items-center justify-center">
                    <p className="text-gray-500">No expense data available</p>
                  </div>
                ) : (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={120}>
                      <PieChart>
                        <Pie
                          data={expenseByCategory}
                          cx="50%"
                          cy="45%"
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                          strokeWidth={2}
                          stroke="#fff"
                        >
                          {expenseByCategory.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={EXPENSE_COLORS[index % EXPENSE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<PieTooltip />} />
                        <Legend 
                          verticalAlign="bottom" 
                          height={36}
                          wrapperStyle={{ fontSize: '12px' }}
                          formatter={(value, entry) => `${value} (${entry.payload.percentage}%)`}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'trend':
        return (
          <div className="space-y-6">
            {/* Description */}
            <div className="bg-gradient-to-br from-emerald-600 via-teal-700 to-cyan-700 rounded-2xl p-5 md:p-6 text-white shadow-xl">
              <div className="flex items-start gap-4">
                <div className="bg-white/10 backdrop-blur-sm p-3 rounded-xl">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold mb-2">{trendTitle} Analysis</h3>
                  <p className="text-emerald-100 leading-relaxed mb-4">
                    {timeScope === 'week' && 'This trend analysis tracks your daily financial activity over the past week, revealing short-term patterns in income and spending. Perfect for monitoring recent financial behavior and making quick adjustments.'}
                    {timeScope === 'month' && 'This trend analysis tracks your daily financial activity throughout the current month, showing how income and expenses fluctuate day by day. Ideal for understanding your monthly cash flow patterns.'}
                    {timeScope === 'year' && 'This trend analysis tracks your monthly financial trajectory throughout the current year, revealing seasonal patterns in income generation and spending behavior. Excellent for annual financial planning and goal tracking.'}
                    {timeScope === 'all' && 'This comprehensive trend analysis tracks your financial trajectory over the past year, revealing long-term patterns in income generation, spending behavior, and savings accumulation. The multi-dimensional area chart provides a clear visual representation of cash flow dynamics.'}
                    {timeScope === 'custom' && `This trend analysis is focused on your selected custom range (${selectedRangeLabel}), helping you inspect specific periods in detail.`}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="bg-white/10 rounded-lg p-3">
                      <p className="text-xs text-emerald-200 mb-1">Income Trend</p>
                      <p className="text-sm font-semibold">Green area shows earnings over time</p>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3">
                      <p className="text-xs text-emerald-200 mb-1">Expense Trend</p>
                      <p className="text-sm font-semibold">Red area indicates spending patterns</p>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3">
                      <p className="text-xs text-emerald-200 mb-1">Gap Analysis</p>
                      <p className="text-sm font-semibold">Distance between lines shows savings</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Insights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderInsightCard(
                "What to Look For",
                "Consistent upward trend in income indicates financial growth. Widening gap between income and expenses suggests improving savings rate. Watch for sudden spikes or drops that may need attention.",
                Lightbulb
              )}
              {renderInsightCard(
                "Actionable Insights",
                "If expenses are trending close to income, consider budget optimization. If income shows volatility, explore ways to create more stable revenue streams. Use this data to set realistic financial goals.",
                Target
              )}
            </div>

            {/* Chart */}
            <div className="bg-white dark:bg-[#0D1117] rounded-2xl p-6 shadow-xl border border-gray-200 dark:border-white/5">
              <div className="h-[380px] md:h-[420px]">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={120}>
                  <AreaChart data={monthlyTrend}>
                    <defs>
                      <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.6}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.6}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorSavings" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.6}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#161B22" opacity={1} />
                    <XAxis dataKey="label" stroke="#6b7280" style={{ fontSize: '12px' }} />
                    <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '13px', paddingTop: '20px' }} />
                    <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorIncome)" name="Income" />
                    <Area type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorExpense)" name="Expense" />
                    <Area type="monotone" dataKey="savings" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorSavings)" name="Savings" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-5 border border-green-200 dark:border-green-800">
                <p className="text-sm text-green-700 dark:text-green-400 font-medium mb-1">Average Monthly Income</p>
                <p className="text-xl font-bold text-green-900 dark:text-green-300">
                  {formatCurrency(monthlyTrend.reduce((sum, m) => sum + m.income, 0) / 6)}
                </p>
              </div>
              <div className="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 rounded-xl p-5 border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-700 dark:text-red-400 font-medium mb-1">Average Monthly Expenses</p>
                <p className="text-xl font-bold text-red-900 dark:text-red-300">
                  {formatCurrency(monthlyTrend.reduce((sum, m) => sum + m.expense, 0) / 6)}
                </p>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl p-5 border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-700 dark:text-blue-400 font-medium mb-1">Average Monthly Savings</p>
                <p className="text-xl font-bold text-blue-900 dark:text-blue-300">
                  {formatCurrency(monthlyTrend.reduce((sum, m) => sum + m.savings, 0) / 6)}
                </p>
              </div>
            </div>
          </div>
        );

      case 'expenses':
        return (
          <div className="space-y-6">
            {/* Description */}
            <div className="bg-gradient-to-br from-rose-600 via-red-700 to-pink-700 rounded-2xl p-5 md:p-6 text-white shadow-xl">
              <div className="flex items-start gap-4">
                <div className="bg-white/10 backdrop-blur-sm p-3 rounded-xl">
                  <TrendingDown className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold mb-2">Expense Distribution Analysis</h3>
                  <p className="text-rose-100 leading-relaxed mb-4">
                    Understanding where your money goes is fundamental to financial wellness. This comprehensive expense breakdown 
                    categorizes your spending into distinct segments, revealing consumption patterns and highlighting areas where 
                    you can optimize. The pie chart visualization makes it easy to identify major expense categories at a glance, 
                    while percentage distributions help you understand spending priorities.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-white/10 rounded-lg p-3">
                      <p className="text-xs text-rose-200 mb-1">Category Breakdown</p>
                      <p className="text-sm font-semibold">Each slice represents spending in different areas of your life</p>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3">
                      <p className="text-xs text-rose-200 mb-1">Optimization Opportunity</p>
                      <p className="text-sm font-semibold">Identify largest slices for potential savings opportunities</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Insights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {renderInsightCard(
                "50/30/20 Rule",
                "Ideally, 50% should go to needs, 30% to wants, and 20% to savings. Compare your distribution to this benchmark to assess financial health.",
                Info
              )}
              {renderInsightCard(
                "Red Flags",
                "If any single category exceeds 40% of total expenses (except housing), consider rebalancing. Multiple small categories may indicate lack of budgeting focus.",
                Lightbulb
              )}
              {renderInsightCard(
                "Take Action",
                "Target the top 2-3 expense categories for optimization. Even small reductions in major categories can significantly boost savings.",
                Target
              )}
            </div>

            {/* Chart and Top Categories */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              {/* Pie Chart */}
              <div className="bg-white dark:bg-[#0D1117] rounded-2xl p-6 shadow-xl border border-gray-200 dark:border-white/5">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-[#F9FAFB] mb-4">Expense Distribution</h3>
                {expenseByCategory.length === 0 ? (
                  <div className="h-80 flex items-center justify-center">
                    <p className="text-gray-500">No expense data available</p>
                  </div>
                ) : (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={120}>
                      <PieChart>
                        <Pie
                          data={expenseByCategory}
                          cx="50%"
                          cy="45%"
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                          strokeWidth={2}
                          stroke="#fff"
                        >
                          {expenseByCategory.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={EXPENSE_COLORS[index % EXPENSE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<PieTooltip />} />
                        <Legend 
                          verticalAlign="bottom" 
                          height={36}
                          wrapperStyle={{ fontSize: '12px' }}
                          formatter={(value, entry) => `${value} (${entry.payload.percentage}%)`}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Top Categories */}
              <div className="bg-white dark:bg-[#0D1117] rounded-2xl p-6 shadow-xl border border-gray-200 dark:border-white/5">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-[#F9FAFB] mb-4">Top Expense Categories</h3>
                <div className="space-y-4">
                  {topExpenseCategories.length === 0 ? (
                    <p className="text-gray-500">No expense data available</p>
                  ) : (
                    topExpenseCategories.map((cat, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700 dark:text-[#9CA3AF]">{cat.name}</span>
                          <div className="text-right">
                            <div className="text-sm font-bold text-gray-900 dark:text-[#F9FAFB]">{formatCurrency(cat.value)}</div>
                            <div className="text-xs text-gray-500">{cat.percentage}%</div>
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-[#161B22] rounded-full h-2 overflow-hidden">
                          <div
                            className="h-2 rounded-full transition-all duration-500"
                            style={{
                              width: `${cat.percentage}%`,
                              backgroundColor: EXPENSE_COLORS[index],
                              boxShadow: `0 0 10px ${EXPENSE_COLORS[index]}60`
                            }}
                          ></div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      case 'income':
        return (
          <div className="space-y-6">
            {/* Description */}
            <div className="bg-gradient-to-br from-emerald-600 via-green-700 to-teal-700 rounded-2xl p-5 md:p-6 text-white shadow-xl">
              <div className="flex items-start gap-4">
                <div className="bg-white/10 backdrop-blur-sm p-3 rounded-xl">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold mb-2">Income Sources Analysis</h3>
                  <p className="text-emerald-100 leading-relaxed mb-4">
                    A healthy financial portfolio includes diverse income streams. This analysis breaks down your earnings by 
                    source, helping you understand income stability and dependency. Whether salary, freelance work, investments, 
                    or passive income, each source contributes uniquely to your financial security. Diversification reduces risk 
                    and creates opportunities for financial growth.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-white/10 rounded-lg p-3">
                      <p className="text-xs text-emerald-200 mb-1">Primary vs Secondary</p>
                      <p className="text-sm font-semibold">Identify your main income source and supplementary earnings</p>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3">
                      <p className="text-xs text-emerald-200 mb-1">Growth Opportunities</p>
                      <p className="text-sm font-semibold">Smaller slices represent areas for potential income expansion</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Insights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {renderInsightCard(
                "Diversification Benefits",
                "Multiple income sources provide financial resilience. If one stream is disrupted, others continue supporting you. Aim for at least 2-3 distinct income categories.",
                Info
              )}
              {renderInsightCard(
                "Risk Assessment",
                "If one category exceeds 80% of total income, you're highly dependent on that source. Consider developing alternative revenue streams to reduce financial risk.",
                Lightbulb
              )}
              {renderInsightCard(
                "Growth Strategy",
                "Focus on scaling your most profitable income sources while exploring new opportunities. Even small side income can significantly boost financial security over time.",
                Target
              )}
            </div>

            {/* Chart and Top Sources */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              {/* Pie Chart */}
              <div className="bg-white dark:bg-[#0D1117] rounded-2xl p-6 shadow-xl border border-gray-200 dark:border-white/5">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-[#F9FAFB] mb-4">Income Distribution</h3>
                {incomeByCategory.length === 0 ? (
                  <div className="h-80 flex items-center justify-center">
                    <p className="text-gray-500">No income data available</p>
                  </div>
                ) : (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={120}>
                      <PieChart>
                        <Pie
                          data={incomeByCategory}
                          cx="50%"
                          cy="45%"
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                          strokeWidth={2}
                          stroke="#fff"
                        >
                          {incomeByCategory.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={INCOME_COLORS[index % INCOME_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<PieTooltip />} />
                        <Legend 
                          verticalAlign="bottom" 
                          height={36}
                          wrapperStyle={{ fontSize: '12px' }}
                          formatter={(value, entry) => `${value} (${entry.payload.percentage}%)`}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Top Income Sources */}
              <div className="bg-white dark:bg-[#0D1117] rounded-2xl p-6 shadow-xl border border-gray-200 dark:border-white/5">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-[#F9FAFB] mb-4">Top Income Sources</h3>
                <div className="space-y-4">
                  {topIncomeCategories.length === 0 ? (
                    <p className="text-gray-500">No income data available</p>
                  ) : (
                    topIncomeCategories.map((cat, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700 dark:text-[#9CA3AF]">{cat.name}</span>
                          <div className="text-right">
                            <div className="text-sm font-bold text-gray-900 dark:text-[#F9FAFB]">{formatCurrency(cat.value)}</div>
                            <div className="text-xs text-gray-500">{cat.percentage}%</div>
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-[#161B22] rounded-full h-2 overflow-hidden">
                          <div
                            className="h-2 rounded-full transition-all duration-500"
                            style={{
                              width: `${cat.percentage}%`,
                              backgroundColor: INCOME_COLORS[index],
                              boxShadow: `0 0 10px ${INCOME_COLORS[index]}60`
                            }}
                          ></div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      case 'patterns':
        return (
          <div className="space-y-6">
            {/* Description */}
            <div className="bg-gradient-to-br from-indigo-600 via-purple-700 to-blue-700 rounded-2xl p-5 md:p-6 text-white shadow-xl">
              <div className="flex items-start gap-4">
                <div className="bg-white/10 backdrop-blur-sm p-3 rounded-xl">
                  <Calendar className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold mb-2">{patternTitle} Analysis</h3>
                  <p className="text-indigo-100 leading-relaxed mb-4">
                    {timeScope === 'week' && 'Track your daily financial activities over the past week. This detailed view reveals how your spending and income fluctuate day by day, helping you identify specific dates with unusual activity and understand your short-term financial behavior patterns.'}
                    {timeScope === 'month' && 'Your financial behavior varies throughout the month. This weekly breakdown reveals spending patterns across different periods of the month, helping you identify high-spend weeks and opportunities for better budget control throughout the billing cycle.'}
                    {timeScope === 'year' && 'Your financial behavior varies across different months of the year. This monthly analysis reveals seasonal spending patterns, helping you identify high-expense periods, plan for recurring annual costs, and understand how your finances evolve throughout the year.'}
                    {timeScope === 'all' && 'This comprehensive temporal analysis reveals long-term spending patterns over the past year, helping you identify seasonal trends, peak spending periods, and opportunities for better budget control across extended timeframes.'}
                    {timeScope === 'custom' && `This temporal analysis is focused on your selected custom range (${selectedRangeLabel}), helping you inspect behavior in a specific period.`}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="bg-white/10 rounded-lg p-3">
                      <p className="text-xs text-indigo-200 mb-1">
                        {timeScope === 'week' ? 'Daily Breakdown' : timeScope === 'month' ? 'Weekly Breakdown' : 'Monthly Breakdown'}
                      </p>
                      <p className="text-sm font-semibold">
                        {timeScope === 'week' ? 'Compare spending patterns across each day' : timeScope === 'month' ? 'Compare spending patterns across weeks' : 'Compare spending patterns across months'}
                      </p>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3">
                      <p className="text-xs text-indigo-200 mb-1">
                        {timeScope === 'week' ? 'Peak Days' : timeScope === 'month' ? 'Peak Weeks' : 'Peak Months'}
                      </p>
                      <p className="text-sm font-semibold">
                        {timeScope === 'week' ? 'Identify which days see highest activity' : timeScope === 'month' ? 'Identify which weeks see highest activity' : 'Identify which months see highest activity'}
                      </p>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3">
                      <p className="text-xs text-indigo-200 mb-1">Behavioral Insights</p>
                      <p className="text-sm font-semibold">
                        {timeScope === 'week' ? 'Understand daily spending habits' : timeScope === 'month' ? 'Understand weekly spending cycles' : 'Understand seasonal spending trends'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Insights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderInsightCard(
                "Pattern Recognition",
                timeScope === 'week' 
                  ? "Daily patterns reveal immediate spending habits. Weekend spending often increases due to leisure activities, while weekdays may show routine expenses. Track these micro-patterns for better daily budgeting."
                  : timeScope === 'month'
                  ? "Weekly patterns show spending cycles throughout the month. The first week often has bill payments, while later weeks may show variable discretionary spending. Understanding these cycles helps with cash flow management."
                  : "Monthly patterns reveal seasonal spending trends. Holiday months, vacation periods, and annual expenses create predictable peaks. Use these insights for yearly financial planning and saving strategies.",
                Lightbulb
              )}
              {renderInsightCard(
                "Optimization Strategy",
                timeScope === 'week'
                  ? "If certain days consistently show high spending, be mindful and plan purchases. Consider spreading large expenses across lower-spend days to maintain balanced daily cash flow."
                  : timeScope === 'month'
                  ? "If certain weeks consistently show high spending, plan ahead with budgets and spending limits. Consider scheduling major purchases during historically lower-spend weeks to maintain balance."
                  : "If certain months consistently show high spending, prepare by increasing savings in advance. Schedule major purchases or expenses strategically to avoid compounding costs during peak months.",
                Target
              )}
            </div>

            {/* Chart */}
            <div className="bg-white dark:bg-[#0D1117] rounded-2xl p-6 shadow-xl border border-gray-200 dark:border-white/5">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-[#F9FAFB] mb-6">{patternTitle}</h3>
              <div className="h-[380px] md:h-[420px]">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={120}>
                  <BarChart data={dailyPattern}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#161B22" opacity={1} />
                    <XAxis dataKey="day" stroke="#6b7280" style={{ fontSize: '12px' }} />
                    <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '13px', paddingTop: '20px' }} />
                    <Bar dataKey="income" fill="#10b981" radius={[8, 8, 0, 0]} name="Income" />
                    <Bar dataKey="expense" fill="#ef4444" radius={[8, 8, 0, 0]} name="Expense" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Day Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {dailyPattern.map((day, index) => (
                <div key={index} className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
                  <p className="text-sm font-bold text-purple-900 dark:text-purple-300 mb-2">{day.day}</p>
                  <p className="text-xs text-purple-700 dark:text-purple-400">Transactions: {day.count}</p>
                  <p className="text-xs text-purple-700 dark:text-purple-400">Net: {formatCurrency(day.income - day.expense)}</p>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const exportPDF = useCallback(() => {
    try {
      const doc = new jsPDF();
      const timestamp = new Date().toLocaleString();
      
      // Header
      doc.setFontSize(20);
      doc.setTextColor(59, 130, 246); // Blue-600
      doc.text("Financial Analytics Report", 14, 22);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Generated on: ${timestamp}`, 14, 30);
      doc.text(`Range: ${selectedRangeLabel}`, 14, 35);
      
      // Summary Stats
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text("Financial Summary", 14, 50);
      
      autoTable(doc, {
        startY: 55,
        head: [['Metric', 'Value']],
        body: [
          ['Total Income', formatCurrency(totalIncome)],
          ['Total Expenses', formatCurrency(totalExpense)],
          ['Net Savings', formatCurrency(netSavings)],
          ['Transaction Count', scopedTransactions.length.toString()]
        ],
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] }
      });
      
      // Transactions Table
      doc.text("Transaction Details", 14, (doc).lastAutoTable.finalY + 15);
      
      const tableData = scopedTransactions.map(tx => [
        new Date(tx.date).toLocaleDateString(),
        tx.category,
        tx.note || "-",
        tx.type.charAt(0).toUpperCase() + tx.type.slice(1),
        formatCurrency(tx.amount)
      ]);
      
      autoTable(doc, {
        startY: (doc).lastAutoTable.finalY + 20,
        head: [['Date', 'Category', 'Note', 'Type', 'Amount']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [71, 85, 105] } // Slate-600
      });
      
      doc.save(`Financial_Analytics_${timeScope}_${new Date().getTime()}.pdf`);
      setShowExportMenu(false);
    } catch (error) {
      console.error("PDF Export Error:", error);
      alert("Failed to export PDF. Please try again.");
    }
  }, [scopedTransactions, totalIncome, totalExpense, netSavings, selectedRangeLabel, formatCurrency, timeScope]);

  const exportCSV = useCallback(() => {
    try {
      if (scopedTransactions.length === 0) {
        alert("No data available to export.");
        return;
      }

      const headers = ["Date", "Category", "Note", "Type", "Amount", "Currency"];
      const rows = scopedTransactions.map(tx => [
        new Date(tx.date).toISOString().split('T')[0],
        tx.category,
        `"${(tx.note || "").replace(/"/g, '""')}"`,
        tx.type,
        tx.amount,
        "LKR" // Default or from context
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map(row => row.join(","))
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Analytics_Data_${new Date().getTime()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setShowExportMenu(false);
    } catch (error) {
      console.error("CSV Export Error:", error);
    }
  }, [scopedTransactions]);

  const exportExcel = useCallback(() => {
    try {
      if (scopedTransactions.length === 0) {
        alert("No data available to export.");
        return;
      }

      const data = scopedTransactions.map(tx => ({
        Date: new Date(tx.date).toLocaleDateString(),
        Category: tx.category,
        Note: tx.note || "",
        Type: tx.type,
        Amount: tx.amount
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Transactions");
      
      // Add Summary Sheet
      const summaryData = [
        ["Financial Analytics Summary"],
        ["Generated on", new Date().toLocaleString()],
        ["Range", selectedRangeLabel],
        [],
        ["Metric", "Value"],
        ["Total Income", totalIncome],
        ["Total Expenses", totalExpense],
        ["Net Savings", netSavings]
      ];
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

      XLSX.writeFile(wb, `Financial_Report_${new Date().getTime()}.xlsx`);
      setShowExportMenu(false);
    } catch (error) {
      console.error("Excel Export Error:", error);
    }
  }, [scopedTransactions, totalIncome, totalExpense, netSavings, selectedRangeLabel]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (auth?.isGuest) {
    return <GuestRestricted featureName="Analytics" />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <SystemPageHeader
        tagline="FINANCIAL INTELLIGENCE"
        title="Analytics"
        subtitle="Deep insights and comprehensive analysis of your financial data."
        actions={(
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5">
            <Calendar className="w-4 h-4 text-slate-300" />
            <div className="relative">
              <select
                value={timeScope}
                onChange={(e) => handleTimeScopeChange(e.target.value)}
                className="min-w-[140px] bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer"
              >
                {DATE_RANGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value === "thisMonth" ? "month" : option.value === "thisYear" ? "year" : option.value === "pastYear" ? "all" : option.value} className="text-gray-900">
                    {option.label}
                  </option>
                ))}
              </select>
              {timeScope === "custom" && showCustomRangePanel && (
                <CompactDateModal draft={customRangeDraft} onDraftChange={handleCustomDateDraftChange} onApply={handleApplyCustomRange} onCancel={handleCancelCustomRange} onPreset={handleQuickCustomPreset} />
              )}
            </div>
            {timeScope === "custom" ? (
              <span
                onClick={() => setShowCustomRangePanel((prev) => !prev)}
                className="text-[11px] text-blue-400 hover:text-blue-300 whitespace-nowrap cursor-pointer hover:underline font-semibold"
                title="Click to edit custom range"
              >
                {selectedRangeLabel}
              </span>
            ) : (
              <span className="text-[11px] text-slate-400 whitespace-nowrap">{selectedRangeLabel}</span>
            )}
            {timeScope === "custom" && (
              <button
                type="button"
                onClick={() => setShowCustomRangePanel((prev) => !prev)}
                className="flex items-center justify-center p-1 rounded bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 text-blue-300 transition-all cursor-pointer"
                title="Edit custom date range"
              >
                <span className="text-[9px] font-bold px-1">Edit</span>
              </button>
            )}
          </div>
          <div className="relative">
            <button onClick={() => setShowExportMenu(!showExportMenu)} className="flex items-center gap-2 px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all">
              <Download className="w-4 h-4" />
              Export
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showExportMenu ? "rotate-180" : ""}`} />
            </button>
            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-dark-surface-primary rounded-xl shadow-xl border border-light-border-default dark:border-dark-border-strong overflow-hidden z-50">
                <button onClick={exportPDF} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 dark:hover:bg-blue-500/10 text-light-text-primary dark:text-dark-text-primary transition-colors"><FileText className="w-4 h-4 text-red-500" /><div className="text-xs font-medium">Export as PDF</div></button>
                <button onClick={exportCSV} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 dark:hover:bg-blue-500/10 text-light-text-primary dark:text-dark-text-primary transition-colors border-t border-light-border-default dark:border-dark-border-default"><FileSpreadsheet className="w-4 h-4 text-green-500" /><div className="text-xs font-medium">Export as CSV</div></button>
                <button onClick={exportExcel} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 dark:hover:bg-blue-500/10 text-light-text-primary dark:text-dark-text-primary transition-colors border-t border-light-border-default dark:border-dark-border-default"><FileDown className="w-4 h-4 text-blue-500" /><div className="text-xs font-medium">Export as Excel</div></button>
              </div>
            )}
          </div>
        </div>
      )}
      />

        {/* Analytics Navigation */}
        <div className="rounded-2xl border border-light-border-default dark:border-white/5 bg-white dark:bg-[#0D1117] shadow-premium dark:shadow-card-dark p-2">
          <div className="flex overflow-x-auto no-scrollbar gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`group flex min-w-max items-center gap-2 rounded-xl border px-4 py-2.5 transition-all ${
                    isActive
                      ? 'border-[#3B82F6] bg-blue-50 text-[#3B82F6] dark:border-[#3B82F6] dark:bg-[#3B82F6]/10 dark:text-[#3B82F6]'
                      : 'border-transparent bg-transparent text-gray-600 hover:border-gray-200 hover:bg-gray-50 dark:text-[#9CA3AF] dark:hover:border-white/5 dark:hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium whitespace-nowrap">{tab.label}</span>
                  <span className="relative flex items-center justify-center">
                    <Info className="w-3.5 h-3.5 text-current/70" />
                    <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 hidden w-56 -translate-x-1/2 rounded-lg border border-light-border-default dark:border-white/5 bg-white dark:bg-[#0D1117] px-3 py-2 text-left text-[11px] font-normal text-gray-700 dark:text-[#9CA3AF] shadow-xl group-hover:block">
                      {tab.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="h-[96px] rounded-2xl border border-light-border-default dark:border-white/5 bg-white dark:bg-[#0D1117] p-4 shadow-premium dark:shadow-card-dark transition-all group">
            <div className="flex h-full items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#10B981] shadow-lg group-hover:scale-105 transition-transform">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#10B981] dark:text-[#10B981]">Earned</p>
                <p className="dashboard-figure-glow truncate text-xl font-bold text-[#10B981] dark:text-[#F9FAFB]">{formatCurrency(totalIncome)}</p>
                <p className="text-[11px] text-[#10B981]/70 dark:text-[#9CA3AF]">Total earned</p>
              </div>
            </div>
          </div>

          <div className="h-[96px] rounded-2xl border border-light-border-default dark:border-white/5 bg-white dark:bg-[#0D1117] p-4 shadow-premium dark:shadow-card-dark transition-all group">
            <div className="flex h-full items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#EF4444] shadow-lg group-hover:scale-105 transition-transform">
                <TrendingDown className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#EF4444] dark:text-[#EF4444]">Spent</p>
                <p className="dashboard-figure-glow truncate text-xl font-bold text-[#EF4444] dark:text-[#F9FAFB]">{formatCurrency(totalExpense)}</p>
                <p className="text-[11px] text-[#EF4444]/70 dark:text-[#9CA3AF]">Total spent</p>
              </div>
            </div>
          </div>

          <div className="h-[96px] rounded-2xl border border-light-border-default dark:border-white/5 bg-white dark:bg-[#0D1117] p-4 shadow-premium dark:shadow-card-dark transition-all group">
            <div className="flex h-full items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#3B82F6] shadow-lg group-hover:scale-105 transition-transform">
                <Wallet className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#3B82F6] dark:text-[#3B82F6]">Savings</p>
                <p className="dashboard-figure-glow truncate text-xl font-bold text-[#3B82F6] dark:text-[#F9FAFB]">{formatCurrency(netSavings)}</p>
                <p className="text-[11px] text-[#3B82F6]/70 dark:text-[#9CA3AF]">Net savings</p>
              </div>
            </div>
          </div>

          <div className="h-[96px] rounded-2xl border border-light-border-default dark:border-white/5 bg-white dark:bg-[#0D1117] p-4 shadow-premium dark:shadow-card-dark transition-all group">
            <div className="flex h-full items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#8B5CF6] shadow-lg group-hover:scale-105 transition-transform">
                <Activity className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#8B5CF6] dark:text-[#8B5CF6]">Transactions</p>
                <p className="dashboard-figure-glow truncate text-xl font-bold text-[#8B5CF6] dark:text-[#F9FAFB]">{scopedTransactions.length}</p>
                <p className="text-[11px] text-[#8B5CF6]/70 dark:text-[#9CA3AF]">Recorded entries</p>
              </div>
            </div>
          </div>
        </div>

      {/* Content Area */}
      {renderContent()}
    </div>
  );
};

export default AnalyticsHub;
