import React, { useState, useMemo } from "react";
import { useLocalStorage } from "../hooks/useLocalStorage";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import GuestRestricted from "../components/GuestRestricted";
import CompactDateModal from "../components/CompactDateModal";
import { useTransactions } from "../hooks/useTransactions";
import { 
  FileDown, 
  FileText, 
  FileSpreadsheet, 
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  BarChart3,
  Download,
  Filter,
  ChevronDown
} from "lucide-react";
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import {
  getPresetDateBounds,
  getRangeBounds,
  getDateRangeLabel,
  parseDateInputValue,
  toStartOfDay,
  toEndOfDay,
} from "../utils/dateRangeFilter";
import SystemPageHeader from "../components/layout/SystemPageHeader";

const Reports = ({ auth }) => {
  const { data: transactions = [], isLoading: loading } = useTransactions({
    enabled: !auth?.isGuest,
  });
  const defaultCustomRange = useMemo(() => getPresetDateBounds("week"), []);
  const [timePeriod, setTimePeriod] = useLocalStorage("sft_reports_timePeriod", "thisMonth");
  const [customDateRange, setCustomDateRange] = useState(defaultCustomRange);
  const [customRangeDraft, setCustomRangeDraft] = useState(defaultCustomRange);
  const [showCustomRangePanel, setShowCustomRangePanel] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [currency] = useState(() => localStorage.getItem("currency") || "LKR");

  /* ================= TIME PERIOD CALCULATIONS ================= */

  const selectedRangeLabel = useMemo(
    () => getDateRangeLabel(timePeriod, customDateRange),
    [customDateRange, timePeriod]
  );

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
    if (!parsed) return;
    setCustomRangeDraft((prev) => ({ ...prev, [field]: parsed }));
  };

  const handleApplyCustomRange = () => {
    const start = toStartOfDay(customRangeDraft.startDate);
    const end = toEndOfDay(customRangeDraft.endDate);
    if (start > end) return;
    setCustomDateRange({ startDate: start, endDate: end });
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

  const { startDate, endDate } = useMemo(() => {
    return getRangeBounds(timePeriod, customDateRange);
  }, [timePeriod, customDateRange]);

  /* ================= FILTER TRANSACTIONS ================= */

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const transDate = new Date(t.date);
      const isDateValid = transDate >= startDate && transDate <= endDate;
      
      const category = String(t?.category || "").toLowerCase();
      const isWalletOnly = t?.scope === "wallet" || category.startsWith("wallet_transfer") || t?.isTransfer;
      
      return isDateValid && !isWalletOnly;
    });
  }, [transactions, startDate, endDate]);

/* ================= FINANCIAL CALCULATIONS ================= */

  const income = useMemo(() => {
    return filteredTransactions
      .filter((t) => t.type === "income")
      .reduce((s, t) => s + Number(t.amount || 0), 0);
  }, [filteredTransactions]);

  const expense = useMemo(() => {
    return filteredTransactions
      .filter((t) => t.type === "expense")
      .reduce((s, t) => s + Number(t.amount || 0), 0);
  }, [filteredTransactions]);

  const balance = useMemo(() => income - expense, [income, expense]);
  const savingsRate = useMemo(() => income > 0 ? ((balance / income) * 100).toFixed(1) : 0, [income, balance]);
  
  const transactionCount = useMemo(() => filteredTransactions.length, [filteredTransactions]);
  const avgTransactionSize = useMemo(() => 
    transactionCount > 0 ? (income + expense) / transactionCount : 0, 
    [transactionCount, income, expense]
  );
  const avgDailySpending = useMemo(() => 
    expense / Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))),
    [expense, endDate, startDate]
  );

  /* ================= CURRENCY FORMATTING ================= */
  
  const getCurrencySymbol = (curr) => {
    const symbols = {
      'LKR': 'Rs.',
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'INR': '₹',
      'AUD': 'A$',
      'CAD': 'C$',
      'SGD': 'S$',
      'JPY': '¥',
      'CNY': '¥'
    };
    return symbols[curr] || 'Rs.';
  };

  const formatAmount = (amount) => {
    return `${getCurrencySymbol(currency)} ${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  /* ================= CATEGORY ANALYSIS ================= */

  const categoryData = useMemo(() => {
    const categoryTotals = {};
    filteredTransactions
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        const key = t.category || "Other";
        categoryTotals[key] = (categoryTotals[key] || 0) + Number(t.amount || 0);
      });

    return Object.entries(categoryTotals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredTransactions]);

  const topCategory = useMemo(() => categoryData[0], [categoryData]);
  const topCategoryPercent = useMemo(() => 
    topCategory && expense > 0 ? ((topCategory.value / expense) * 100).toFixed(1) : 0,
    [topCategory, expense]
  );

  /* ================= MONTHLY BREAKDOWN ================= */
  
  const monthlyBreakdown = useMemo(() => {
    const months = {};
    filteredTransactions.forEach((t) => {
      const date = new Date(t.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!months[monthKey]) {
        months[monthKey] = { income: 0, expense: 0, month: date.toLocaleString('default', { month: 'short', year: 'numeric' }) };
      }
      
      if (t.type === 'income') {
        months[monthKey].income += Number(t.amount || 0);
      } else {
        months[monthKey].expense += Number(t.amount || 0);
      }
    });
    
    return Object.values(months).sort((a, b) => a.month.localeCompare(b.month));
  }, [filteredTransactions]);

  /* ================= STATUS & INSIGHTS ================= */

  let status = "Excellent";
  if (income === 0 || expense > income || savingsRate < 5) {
    status = "Critical";
  } else if (savingsRate < 10) {
    status = "Warning";
  } else if (savingsRate < 20) {
    status = "Good";
  }

  const insights = [];

  if (income === 0 && expense === 0) {
    insights.push({
      icon: "📭",
      text: "No transactions have been recorded for this period yet.",
      type: "info"
    });
  }

  if (income > 0 || expense > 0) {
    if (expense > income) {
      insights.push({
        icon: "⚠️",
        text: `Expenses exceeded income by ${formatAmount(expense - income)}`,
        type: "warning"
      });
    } else if (balance > 0) {
      insights.push({
        icon: "✅",
        text: `You saved ${formatAmount(balance)} this period`,
        type: "success"
      });
    }

    if (savingsRate < 10 && income > 0) {
      insights.push({
        icon: "⚠️",
        text: "Savings rate is critically low. Aim for at least 20%.",
        type: "warning"
      });
    } else if (savingsRate >= 30) {
      insights.push({
        icon: "🎉",
        text: `Excellent savings rate of ${savingsRate}%!`,
        type: "success"
      });
    }

    if (topCategoryPercent > 50) {
      insights.push({
        icon: "📊",
        text: `${topCategory.name} accounts for ${topCategoryPercent}% of total expenses.`,
        type: "info"
      });
    }

    if (avgDailySpending > 0) {
      insights.push({
        icon: "💰",
        text: `Average daily spending: ${formatAmount(avgDailySpending)}`,
        type: "info"
      });
    }
  }

  if (insights.length === 0 && (income > 0 || expense > 0)) {
    insights.push({
      icon: "✅",
      text: "Your finances are well balanced this period.",
      type: "success"
    });
  }

  /* ================= TIME PERIOD LABEL ================= */
  
  const getTimePeriodLabel = () => {
    if (timePeriod === "custom") {
      return "Custom Range";
    }
    return selectedRangeLabel;
  };


  /* ================= EXPORT FUNCTIONS ================= */

  const exportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header with branding
    doc.setFillColor(59, 130, 246); // Blue gradient start
    doc.rect(0, 0, pageWidth, 35, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont(undefined, 'bold');
    doc.text("Smart Financial Tracker", pageWidth / 2, 15, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    doc.text(`Financial Report - ${getTimePeriodLabel()}`, pageWidth / 2, 25, { align: 'center' });
    
    // Report metadata
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 32);
    doc.text(`Period: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`, pageWidth - 14, 32, { align: 'right' });

    // Executive Summary Section
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text("Executive Summary", 14, 48);
    
    // Summary boxes
    const summaryY = 58;
    const boxWidth = (pageWidth - 38) / 4;
    
    // Income box
    doc.setFillColor(34, 197, 94);
    doc.roundedRect(14, summaryY, boxWidth, 20, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text("Total Income", 14 + boxWidth / 2, summaryY + 6, { align: 'center' });
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(formatAmount(income), 14 + boxWidth / 2, summaryY + 15, { align: 'center' });
    
    // Expense box
    doc.setFillColor(239, 68, 68);
    doc.roundedRect(24 + boxWidth, summaryY, boxWidth, 20, 2, 2, 'F');
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.text("Total Expenses", 24 + boxWidth + boxWidth / 2, summaryY + 6, { align: 'center' });
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(formatAmount(expense), 24 + boxWidth + boxWidth / 2, summaryY + 15, { align: 'center' });
    
    // Net Balance box
    doc.setFillColor(balance >= 0 ? 34 : 239, balance >= 0 ? 197 : 68, balance >= 0 ? 94 : 68);
    doc.roundedRect(34 + boxWidth * 2, summaryY, boxWidth, 20, 2, 2, 'F');
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.text("Net Balance", 34 + boxWidth * 2 + boxWidth / 2, summaryY + 6, { align: 'center' });
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(formatAmount(balance), 34 + boxWidth * 2 + boxWidth / 2, summaryY + 15, { align: 'center' });
    
    // Savings Rate box
    const rateColor = savingsRate >= 20 ? [34, 197, 94] : savingsRate >= 10 ? [251, 191, 36] : [239, 68, 68];
    doc.setFillColor(...rateColor);
    doc.roundedRect(44 + boxWidth * 3, summaryY, boxWidth, 20, 2, 2, 'F');
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.text("Savings Rate", 44 + boxWidth * 3 + boxWidth / 2, summaryY + 6, { align: 'center' });
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(`${savingsRate}%`, 44 + boxWidth * 3 + boxWidth / 2, summaryY + 15, { align: 'center' });

    // Key Metrics Section
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(14);
    doc.text("Key Metrics", 14, 92);
    
    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    let metricsY = 100;
    
    doc.text(`• Financial Status: ${status}`, 16, metricsY);
    doc.text(`• Total Transactions: ${transactionCount}`, 16, metricsY + 6);
    doc.text(`• Average Transaction Size: ${formatAmount(avgTransactionSize)}`, 16, metricsY + 12);
    doc.text(`• Average Daily Spending: ${formatAmount(avgDailySpending)}`, 16, metricsY + 18);
    if (topCategory) {
      doc.text(`• Top Spending Category: ${topCategory.name} (${topCategoryPercent}%)`, 16, metricsY + 24);
    }

    // Key Insights Section
    doc.setFont(undefined, 'bold');
    doc.setFontSize(14);
    doc.text("Key Insights", 14, 138);
    
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    insights.forEach((insight, idx) => {
      doc.text(`${insight.icon} ${insight.text}`, 16, 146 + idx * 6);
    });

    // Category Breakdown Table
    if (categoryData.length > 0) {
      autoTable(doc, {
        startY: 168,
        head: [['Category', 'Amount', 'Percentage', 'Transactions']],
        body: categoryData.map((cat) => {
          const catTransactions = filteredTransactions.filter(t => t.category === cat.name && t.type === 'expense');
          return [
            cat.name,
            formatAmount(cat.value),
            `${((cat.value / expense) * 100).toFixed(1)}%`,
            catTransactions.length.toString()
          ];
        }),
        headStyles: { 
          fillColor: [59, 130, 246],
          textColor: 255,
          fontStyle: 'bold',
          halign: 'center'
        },
        styles: { 
          fontSize: 9,
          cellPadding: 3
        },
        alternateRowStyles: {
          fillColor: [245, 247, 250]
        },
        // jsPDF autoTable API requires 'left' and 'right' properties (not CSS logical properties)
        margin: { left: 14, right: 14 }
      });
    }

    // Transaction Details Table
    const tableStartY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 15 : 220;
    
    if (tableStartY < 270) {
      doc.setFont(undefined, 'bold');
      doc.setFontSize(14);
      doc.text("Transaction Details", 14, tableStartY);
    } else {
      doc.addPage();
      doc.setFont(undefined, 'bold');
      doc.setFontSize(14);
      doc.text("Transaction Details", 14, 20);
    }

    autoTable(doc, {
      startY: tableStartY < 270 ? tableStartY + 5 : 25,
      head: [['Date', 'Type', 'Category', 'Amount', 'Note']],
      body: filteredTransactions
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .map((t) => [
          new Date(t.date).toLocaleDateString(),
          t.type.charAt(0).toUpperCase() + t.type.slice(1),
          t.category || "-",
          formatAmount(t.amount),
          (t.note || "-").substring(0, 30)
        ]),
      headStyles: { 
        fillColor: [59, 130, 246],
        textColor: 255,
        fontStyle: 'bold'
      },
      styles: { 
        fontSize: 8,
        cellPadding: 2
      },
      alternateRowStyles: {
        fillColor: [245, 247, 250]
      },
      // jsPDF autoTable API requires 'cellWidth' property (not CSS logical properties)
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 20 },
        2: { cellWidth: 30 },
        3: { cellWidth: 30, halign: 'right' },
        4: { cellWidth: 'auto' }
      },
      // jsPDF autoTable API requires 'left' and 'right' properties (not CSS logical properties)
      margin: { left: 14, right: 14 }
    });

    // Footer
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `Page ${i} of ${totalPages}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
      doc.text(
        '© Smart Financial Tracker',
        14,
        doc.internal.pageSize.getHeight() - 10
      );
      doc.text(
        'Confidential',
        pageWidth - 14,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'right' }
      );
    }

    doc.save(`Financial-Report-${getTimePeriodLabel().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`);
    setShowExportMenu(false);
  };

  const exportCSV = () => {
    const headers = ['Date', 'Type', 'Category', 'Amount', 'Note', 'Currency'];
    
    const rows = filteredTransactions.map(t => [
      new Date(t.date).toLocaleDateString(),
      t.type,
      t.category || '',
      t.amount,
      (t.note || '').replace(/,/g, ';'),
      currency
    ]);

    // Add summary section
    const summaryRows = [
      [],
      ['FINANCIAL SUMMARY'],
      ['Period', `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`],
      ['Total Income', income],
      ['Total Expenses', expense],
      ['Net Balance', balance],
      ['Savings Rate', `${savingsRate}%`],
      ['Status', status],
      ['Total Transactions', transactionCount],
      [],
      ['TRANSACTION DETAILS'],
      headers,
      ...rows
    ];

    const csvContent = summaryRows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Financial-Report-${getTimePeriodLabel().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    setShowExportMenu(false);
  };

  const exportExcel = () => {
    // Create Excel-compatible HTML table
    const htmlContent = `
      <html xmlns:x="urn:schemas-microsoft-com:office:excel">
        <head>
          <xml>
            <x:ExcelWorkbook>
              <x:ExcelWorksheets>
                <x:ExcelWorksheet>
                  <x:Name>Financial Report</x:Name>
                  <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
                </x:ExcelWorksheet>
              </x:ExcelWorksheets>
            </x:ExcelWorkbook>
          </xml>
          <style>
            .header { background-color: #3b82f6; color: white; font-weight: bold; }
            .summary { background-color: #f3f4f6; font-weight: bold; }
            .income { color: #22c55e; }
            .expense { color: #ef4444; }
          </style>
        </head>
        <body>
          <h1>Smart Financial Tracker - Financial Report</h1>
          <h2>${getTimePeriodLabel()}</h2>
          <p>Period: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}</p>
          <p>Generated: ${new Date().toLocaleString()}</p>
          
          <h3>Executive Summary</h3>
          <table border="1">
            <tr class="header">
              <th>Metric</th>
              <th>Value</th>
            </tr>
            <tr><td>Total Income</td><td class="income">${formatAmount(income)}</td></tr>
            <tr><td>Total Expenses</td><td class="expense">${formatAmount(expense)}</td></tr>
            <tr><td>Net Balance</td><td>${formatAmount(balance)}</td></tr>
            <tr><td>Savings Rate</td><td>${savingsRate}%</td></tr>
            <tr><td>Status</td><td>${status}</td></tr>
            <tr><td>Total Transactions</td><td>${transactionCount}</td></tr>
          </table>
          
          <h3>Category Breakdown</h3>
          <table border="1">
            <tr class="header">
              <th>Category</th>
              <th>Amount</th>
              <th>Percentage</th>
            </tr>
            ${categoryData.map(cat => `
              <tr>
                <td>${cat.name}</td>
                <td>${formatAmount(cat.value)}</td>
                <td>${((cat.value / expense) * 100).toFixed(1)}%</td>
              </tr>
            `).join('')}
          </table>
          
          <h3>All Transactions</h3>
          <table border="1">
            <tr class="header">
              <th>Date</th>
              <th>Type</th>
              <th>Category</th>
              <th>Amount</th>
              <th>Note</th>
            </tr>
            ${filteredTransactions.map(t => `
              <tr>
                <td>${new Date(t.date).toLocaleDateString()}</td>
                <td>${t.type}</td>
                <td>${t.category || '-'}</td>
                <td class="${t.type}">${formatAmount(t.amount)}</td>
                <td>${t.note || '-'}</td>
              </tr>
            `).join('')}
          </table>
        </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Financial-Report-${getTimePeriodLabel().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.xls`;
    link.click();
    setShowExportMenu(false);
  };

  const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#6366f1', '#84cc16'];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-500 mb-4"></div>
          <p className="text-light-text-secondary dark:text-dark-text-secondary">Loading financial reports...</p>
        </div>
      </div>
    );
  }

  // Block guest users
  if (auth?.isGuest) {
    return <GuestRestricted featureName="Reports & Exports" />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <SystemPageHeader
        tagline="DETERMINISTIC REPORTING"
        title="Financial Reports"
        subtitle={`Comprehensive analysis and insights • ${getTimePeriodLabel()}`}
        actions={(
          <>
            <div className="flex flex-wrap items-center gap-2 rounded-full border border-light-border-default dark:border-white/5 bg-light-surface-primary dark:bg-white/5 px-3 py-2">
              <Calendar className="w-4 h-4 text-light-text-secondary dark:text-slate-300" />
              <div className="relative">
                <select
                  value={timePeriod}
                  onChange={(event) => handleTimePeriodChange(event.target.value)}
                  className="min-w-[150px] bg-transparent px-2.5 py-1.5 text-[11px] font-semibold text-light-text-primary dark:text-white focus:outline-none"
                >
                  <option value="week">Last 7 Days</option>
                  <option value="thisMonth">This Month</option>
                  <option value="thisYear">This Year</option>
                  <option value="pastYear">Past Year</option>
                  <option value="custom">Custom Range</option>
                </select>
              </div>

              {showCustomRangePanel && (
                <div className="absolute top-16 right-4 z-[60]">
                  <CompactDateModal
                    draft={customRangeDraft}
                    onDraftChange={handleCustomDateDraftChange}
                    onApply={handleApplyCustomRange}
                    onCancel={handleCancelCustomRange}
                    onQuickPreset={handleQuickCustomPreset}
                  />
                </div>
              )}
              {timePeriod === "custom" && !showCustomRangePanel && (
                <button
                  onClick={() => setShowCustomRangePanel((prev) => !prev)}
                  className="flex items-center justify-center p-1 rounded bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 text-blue-300 transition-all cursor-pointer"
                  title="Edit custom date range"
                >
                  <span className="text-[9px] font-bold px-1">Edit</span>
                </button>
              )}
            </div>

            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="inline-flex items-center gap-2 rounded-full border border-light-border-default dark:border-white/10 bg-light-surface-primary dark:bg-white/5 px-4 py-2 text-sm font-semibold text-light-text-primary dark:text-white transition hover:bg-light-bg-accent dark:hover:border-white/20 dark:hover:bg-white/10"
              >
                <Download className="w-5 h-5" />
                Export Report
                <ChevronDown className={`w-4 h-4 transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
              </button>

              {showExportMenu && (
                <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-light-border-default dark:border-white/5 bg-light-surface-secondary dark:bg-[#0D1117] z-50">
                  <button
                    onClick={exportPDF}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-light-text-primary dark:text-white transition-colors hover:bg-light-bg-accent dark:hover:bg-white/5"
                  >
                    <FileText className="w-5 h-5 text-red-500" />
                    <div>
                      <div className="font-medium">Export as PDF</div>
                          <div className="text-xs text-light-text-tertiary dark:text-[#9CA3AF]">Premium formatted report</div>
                    </div>
                  </button>

                  <button
                    onClick={exportCSV}
                    className="flex w-full items-center gap-3 border-t border-light-border-subtle dark:border-white/5 px-4 py-3 text-left text-light-text-primary dark:text-white transition-colors hover:bg-light-bg-accent dark:hover:bg-white/5"
                  >
                    <FileSpreadsheet className="w-5 h-5 text-green-500" />
                    <div>
                      <div className="font-medium">Export as CSV</div>
                          <div className="text-xs text-light-text-tertiary dark:text-[#9CA3AF]">Spreadsheet compatible</div>
                    </div>
                  </button>

                  <button
                    onClick={exportExcel}
                    className="flex w-full items-center gap-3 border-t border-light-border-subtle dark:border-white/5 px-4 py-3 text-left text-light-text-primary dark:text-white transition-colors hover:bg-light-bg-accent dark:hover:bg-white/5"
                  >
                    <FileDown className="w-5 h-5 text-blue-500" />
                    <div>
                      <div className="font-medium">Export as Excel</div>
                          <div className="text-xs text-light-text-tertiary dark:text-[#9CA3AF]">Microsoft Excel format</div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      />

      {/* KPI Strip */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="h-[96px] rounded-2xl border border-light-border-default dark:border-white/5 bg-white dark:bg-dark-surface-primary p-4 shadow-premium dark:shadow-card-dark transition-all group">
          <div className="flex h-full items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-500 dark:bg-success-500 shadow-lg group-hover:scale-105 transition-transform">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-green-600 dark:text-success-300">Income</p>
              <p className="dashboard-figure-glow truncate text-xl font-bold text-green-700 dark:text-[#F9FAFB]">{formatAmount(income)}</p>
              <p className="text-[11px] text-green-600/70 dark:text-[#9CA3AF]">{filteredTransactions.filter((t) => t.type === 'income').length} transactions</p>
            </div>
          </div>
        </div>

        <div className="h-[96px] rounded-2xl border border-light-border-default dark:border-white/5 bg-white dark:bg-dark-surface-primary p-4 shadow-premium dark:shadow-card-dark transition-all group">
          <div className="flex h-full items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500 dark:bg-danger-500 shadow-lg group-hover:scale-105 transition-transform">
              <TrendingDown className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-red-600 dark:text-danger-300">Expenses</p>
              <p className="dashboard-figure-glow truncate text-xl font-bold text-red-700 dark:text-[#F9FAFB]">{formatAmount(expense)}</p>
              <p className="text-[11px] text-red-600/70 dark:text-[#9CA3AF]">{filteredTransactions.filter((t) => t.type === 'expense').length} transactions</p>
            </div>
          </div>
        </div>

        <div className="h-[96px] rounded-2xl border border-light-border-default dark:border-white/5 bg-white dark:bg-dark-surface-primary p-4 shadow-premium dark:shadow-card-dark transition-all group">
          <div className="flex h-full items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500 dark:bg-blue-500 shadow-lg group-hover:scale-105 transition-transform">
              <DollarSign className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-blue-600 dark:text-blue-300">Balance</p>
              <p className="dashboard-figure-glow truncate text-xl font-bold text-blue-700 dark:text-[#F9FAFB]">{formatAmount(balance)}</p>
              <p className="text-[11px] text-blue-600/70 dark:text-[#9CA3AF]">{balance >= 0 ? 'Positive cash flow' : 'Negative cash flow'}</p>
            </div>
          </div>
        </div>

        <div className="h-[96px] rounded-2xl border border-light-border-default dark:border-white/5 bg-white dark:bg-dark-surface-primary p-4 shadow-premium dark:shadow-card-dark transition-all group">
          <div className="flex h-full items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500 dark:bg-violet-500 shadow-lg group-hover:scale-105 transition-transform">
              <PieChart className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-violet-600 dark:text-violet-300">Savings Rate</p>
              <p className="dashboard-figure-glow truncate text-xl font-bold text-violet-700 dark:text-[#F9FAFB]">{savingsRate}%</p>
              <p className="text-[11px] text-violet-600/70 dark:text-[#9CA3AF]">Target: 20% minimum</p>
            </div>
          </div>
        </div>
      </div>

      {/* Key Insights */}
      <div className="bg-gradient-to-br from-white to-blue-50/30 dark:from-dark-surface-primary dark:to-dark-surface-secondary p-5 rounded-2xl border border-blue-100 dark:border-blue-500/20 shadow-premium dark:shadow-card-dark">
        <h3 className="text-lg font-bold text-light-text-primary dark:text-dark-text-primary mb-4 flex items-center gap-2">
          <span className="p-2 bg-blue-100 dark:bg-blue-500/20 rounded-lg">💡</span>
          Key Insights & Recommendations
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {insights.map((insight, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-xl border ${
                insight.type === 'success'
                  ? 'bg-green-50 dark:bg-success-900/20 border-green-200 dark:border-success-500/30'
                  : insight.type === 'warning'
                  ? 'bg-yellow-50 dark:bg-warning-900/20 border-yellow-200 dark:border-warning-500/30'
                  : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-500/30'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{insight.icon}</span>
                <p className={`text-sm ${
                  insight.type === 'success'
                    ? 'text-green-700 dark:text-success-300'
                    : insight.type === 'warning'
                    ? 'text-yellow-700 dark:text-warning-300'
                    : 'text-blue-700 dark:text-blue-300'
                }`}>
                  {insight.text}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-dark-surface-primary p-5 rounded-2xl border border-light-border-default dark:border-dark-border-strong shadow-premium dark:shadow-card-dark">
          <h4 className="text-lg font-bold text-light-text-primary dark:text-dark-text-primary mb-4">Financial Metrics</h4>
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-light-border-default dark:border-dark-border-default">
              <span className="text-sm text-light-text-secondary dark:text-dark-text-secondary">Total Transactions</span>
              <span className="font-semibold text-light-text-primary dark:text-dark-text-primary">{transactionCount}</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-light-border-default dark:border-dark-border-default">
              <span className="text-sm text-light-text-secondary dark:text-dark-text-secondary">Avg Transaction Size</span>
              <span className="font-semibold text-light-text-primary dark:text-dark-text-primary">{formatAmount(avgTransactionSize)}</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-light-border-default dark:border-dark-border-default">
              <span className="text-sm text-light-text-secondary dark:text-dark-text-secondary">Avg Daily Spending</span>
              <span className="font-semibold text-light-text-primary dark:text-dark-text-primary">{formatAmount(avgDailySpending)}</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-light-border-default dark:border-dark-border-default">
              <span className="text-sm text-light-text-secondary dark:text-dark-text-secondary">Income Transactions</span>
              <span className="font-semibold text-green-600 dark:text-success-400">
                {filteredTransactions.filter(t => t.type === 'income').length}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-light-text-secondary dark:text-dark-text-secondary">Expense Transactions</span>
              <span className="font-semibold text-red-600 dark:text-danger-400">
                {filteredTransactions.filter(t => t.type === 'expense').length}
              </span>
            </div>
          </div>
        </div>

        {/* Category Breakdown Pie Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-dark-surface-primary p-5 rounded-2xl border border-light-border-default dark:border-dark-border-strong shadow-premium dark:shadow-card-dark">
          <h4 className="text-lg font-bold text-light-text-primary dark:text-dark-text-primary mb-4">Spending by Category</h4>
          {categoryData.length > 0 ? (
            <div className="h-56 md:h-64">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={120}>
                <RechartsPie>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatAmount(value)} />
                  <Legend />
                </RechartsPie>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-light-text-secondary dark:text-dark-text-secondary">
              No expense data available for this period
            </div>
          )}
        </div>
      </div>

      {/* Monthly Trend Chart */}
      {monthlyBreakdown.length > 1 && (
        <div className="bg-white dark:bg-dark-surface-primary p-5 rounded-2xl border border-light-border-default dark:border-dark-border-strong shadow-premium dark:shadow-card-dark">
          <h4 className="text-lg font-bold text-light-text-primary dark:text-dark-text-primary mb-4">Income vs Expenses Trend</h4>
          <div className="h-72 md:h-80">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={120}>
              <BarChart data={monthlyBreakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
                <XAxis 
                  dataKey="month" 
                  stroke="#6b7280" 
                  className="dark:stroke-gray-400"
                  tick={{ fill: '#6b7280' }}
                />
                <YAxis 
                  stroke="#6b7280" 
                  className="dark:stroke-gray-400"
                  tick={{ fill: '#6b7280' }}
                  tickFormatter={(value) => `${getCurrencySymbol(currency)} ${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  formatter={(value) => formatAmount(value)}
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Bar dataKey="income" fill="#22c55e" name="Income" radius={[8, 8, 0, 0]} />
                <Bar dataKey="expense" fill="#ef4444" name="Expenses" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Category Details Table */}
      {categoryData.length > 0 && (
        <div className="bg-white dark:bg-dark-surface-primary p-6 rounded-2xl border border-light-border-default dark:border-dark-border-strong shadow-premium dark:shadow-card-dark">
          <h4 className="text-lg font-bold text-light-text-primary dark:text-dark-text-primary mb-4">Category Breakdown</h4>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-blue-200 dark:border-blue-500/30">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-light-text-primary dark:text-dark-text-primary">Category</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-light-text-primary dark:text-dark-text-primary">Amount</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-light-text-primary dark:text-dark-text-primary">% of Total</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-light-text-primary dark:text-dark-text-primary">Transactions</th>
                  <th className="py-3 px-4"></th>
                </tr>
              </thead>
              <tbody>
                {categoryData.map((cat, index) => {
                  const catTransactions = filteredTransactions.filter(t => t.category === cat.name && t.type === 'expense');
                  const percentage = ((cat.value / expense) * 100).toFixed(1);
                  return (
                    <tr 
                      key={cat.name} 
                      className="border-b border-light-border-default dark:border-dark-border-default hover:bg-blue-50 dark:hover:bg-blue-500/5 transition-colors"
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          ></div>
                          <span className="font-medium text-light-text-primary dark:text-dark-text-primary">{cat.name}</span>
                        </div>
                      </td>
                      <td className="text-right py-4 px-4 font-semibold text-light-text-primary dark:text-dark-text-primary">
                        {formatAmount(cat.value)}
                      </td>
                      <td className="text-right py-4 px-4">
                        <span className="px-3 py-1 bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium">
                          {percentage}%
                        </span>
                      </td>
                      <td className="text-right py-4 px-4 text-light-text-secondary dark:text-dark-text-secondary">
                        {catTransactions.length}
                      </td>
                      <td className="py-4 px-4">
                        <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 h-2 rounded-full transition-all"
                            style={{ inlineSize: `${Math.min(percentage, 100)}%` }}
                          ></div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-blue-200 dark:border-blue-500/30 font-bold">
                  <td className="py-4 px-4 text-light-text-primary dark:text-dark-text-primary">Total</td>
                  <td className="text-right py-4 px-4 text-light-text-primary dark:text-dark-text-primary">{formatAmount(expense)}</td>
                  <td className="text-right py-4 px-4">
                    <span className="px-3 py-1 bg-blue-200 dark:bg-blue-500/30 text-blue-800 dark:text-blue-200 rounded-full text-sm font-bold">
                      100%
                    </span>
                  </td>
                  <td className="text-right py-4 px-4 text-light-text-primary dark:text-dark-text-primary">
                    {filteredTransactions.filter(t => t.type === 'expense').length}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Transaction Details Table */}
      <div className="bg-white dark:bg-dark-surface-primary p-6 rounded-2xl border border-light-border-default dark:border-dark-border-strong shadow-premium dark:shadow-card-dark">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-bold text-light-text-primary dark:text-dark-text-primary">Transaction History</h4>
          <span className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
            {filteredTransactions.length} transactions
          </span>
        </div>
        
        {filteredTransactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-blue-200 dark:border-blue-500/30">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-light-text-primary dark:text-dark-text-primary">Date</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-light-text-primary dark:text-dark-text-primary">Type</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-light-text-primary dark:text-dark-text-primary">Category</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-light-text-primary dark:text-dark-text-primary">Amount</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-light-text-primary dark:text-dark-text-primary">Note</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions
                  .sort((a, b) => new Date(b.date) - new Date(a.date))
                  .slice(0, 50)
                  .map((transaction, index) => (
                    <tr 
                      key={transaction._id || index} 
                      className="border-b border-light-border-default dark:border-dark-border-default hover:bg-blue-50 dark:hover:bg-blue-500/5 transition-colors"
                    >
                      <td className="py-3 px-4 text-sm text-light-text-secondary dark:text-dark-text-secondary">
                        {new Date(transaction.date).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          transaction.type === 'income'
                            ? 'bg-green-100 dark:bg-success-900/30 text-green-700 dark:text-success-300'
                            : 'bg-red-100 dark:bg-danger-900/30 text-red-700 dark:text-danger-300'
                        }`}>
                          {transaction.type === 'income' ? '↑ Income' : '↓ Expense'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm font-medium text-light-text-primary dark:text-dark-text-primary">
                        {transaction.category || '-'}
                      </td>
                      <td className={`py-3 px-4 text-sm font-bold text-right ${
                        transaction.type === 'income'
                          ? 'text-green-600 dark:text-success-400'
                          : 'text-red-600 dark:text-danger-400'
                      }`}>
                        {transaction.type === 'income' ? '+' : '-'} {formatAmount(transaction.amount)}
                      </td>
                      <td className="py-3 px-4 text-sm text-light-text-secondary dark:text-dark-text-secondary max-w-xs truncate">
                        {transaction.note || '-'}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
            {filteredTransactions.length > 50 && (
              <div className="mt-4 text-center text-sm text-light-text-secondary dark:text-dark-text-secondary">
                Showing 50 of {filteredTransactions.length} transactions. Export full report for complete data.
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📊</div>
            <p className="text-light-text-secondary dark:text-dark-text-secondary">No transactions found for this period</p>
            <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mt-2">
              Try selecting a different time period
            </p>
          </div>
        )}
      </div>

      {/* Summary Footer */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 p-6 rounded-2xl text-white shadow-premium dark:shadow-glow-blue">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h4 className="text-lg font-bold mb-1">Report Summary</h4>
            <p className="text-sm opacity-90">
              Period: {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}
            </p>
          </div>
          <div className="flex gap-6 text-center">
            <div>
              <p className="text-sm opacity-90">Net Change</p>
              <p className="text-2xl font-bold">{formatAmount(balance)}</p>
            </div>
            <div>
              <p className="text-sm opacity-90">Total Transactions</p>
              <p className="text-2xl font-bold">{transactionCount}</p>
            </div>
            <div>
              <p className="text-sm opacity-90">Status</p>
              <p className="text-2xl font-bold">{status}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
