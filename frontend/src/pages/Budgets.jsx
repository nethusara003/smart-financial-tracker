import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  ChevronDown,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Download,
  Flame,
  Gauge,
  FileSpreadsheet,
  FileText,
  LineChart,
  Pencil,
  RefreshCw,
  Save,
  ShieldAlert,
  Wallet,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import GuestRestricted from "../components/GuestRestricted";
import { CurrencyInput, useToast } from "../components/ui";
import { CURRENCIES, useCurrency } from "../context/CurrencyContext";
import SystemPageHeader from "../components/layout/SystemPageHeader";
import { fetchWithAuth } from "../services/apiClient";
import {
  useAdaptiveBudgetAnalysis,
  useAdaptiveBudgetSettings,
  useAdaptiveBudgetStatus,
  useUpdateAdaptiveBudgetSettings,
} from "../hooks/useAdaptiveBudget";
import {
  formatDateInputValue,
  parseDateInputValue,
  toStartOfDay,
} from "../utils/dateRangeFilter";

const STATUS_STYLE = {
  SAFE: {
    container: "bg-success-50 dark:bg-success-900/20 border-success-200 dark:border-success-500/30",
    text: "text-success-700 dark:text-success-300",
    icon: CheckCircle2,
    title: "Stable",
  },
  WARNING: {
    container: "bg-warning-50 dark:bg-warning-900/20 border-warning-200 dark:border-warning-500/30",
    text: "text-warning-700 dark:text-warning-300",
    icon: AlertTriangle,
    title: "Overspending Detected",
  },
  CRISIS: {
    container: "bg-danger-50 dark:bg-danger-900/20 border-danger-200 dark:border-danger-500/30",
    text: "text-danger-700 dark:text-danger-300",
    icon: ShieldAlert,
    title: "Survival Mode",
  },
};

const ADAPTIVE_PROFILE_STORAGE_KEY = "adaptive_budget_profiles_v1";
const MAX_SAVED_ADAPTIVE_PROFILES = 8;
const OTHER_EXPENSE_CATEGORY = "other expense";
const NON_ACTIONABLE_BUDGET_CATEGORIES = new Set([
  "monthly budget",
  "transfer",
  "transfer sent",
  "transfer received",
  "wallet topup",
  "wallet_topup",
  "wallet deposit",
  "wallet_deposit",
  "wallet withdrawal",
  "wallet_withdrawal",
  "wallet transfer sent",
  "wallet transfer received",
  "wallet_transfer_sent",
  "wallet_transfer_received",
  "wallet transfer reversal in",
  "wallet transfer reversal out",
  "wallet_transfer_reversal_in",
  "wallet_transfer_reversal_out",
]);
const NON_ACTIONABLE_BUDGET_CATEGORY_KEYWORDS = [
  "wallet",
  "transfer",
  "topup",
  "top-up",
  "deposit",
  "withdrawal",
  "reversal",
];
const EXPENSE_START_MODE_OPTIONS = [
  {
    value: "start_from_now",
    label: "Start from now (zero baseline)",
    description: "Ignore earlier expenses in the selected period and start tracking from this save.",
  },
  {
    value: "include_existing",
    label: "Include expenses in selected period",
    description: "Use all expenses already recorded inside the selected budget date range.",
  },
];

function safeDecodePathSegment(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function getBudgetPlanPath(planId) {
  return `/budgets/${encodeURIComponent(planId)}`;
}

function normalizeBudgetCategoryName(value) {
  return String(value || "").trim().toLowerCase();
}

function isNonActionableBudgetCategory(value) {
  const normalized = normalizeBudgetCategoryName(value);
  return (
    NON_ACTIONABLE_BUDGET_CATEGORIES.has(normalized) ||
    NON_ACTIONABLE_BUDGET_CATEGORY_KEYWORDS.some((keyword) => normalized.includes(keyword))
  );
}

function loadSavedAdaptiveProfiles() {
  try {
    const raw = localStorage.getItem(ADAPTIVE_PROFILE_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (item) =>
        item &&
        typeof item === "object" &&
        typeof item.id === "string" &&
        typeof item.currency === "string"
    );
  } catch {
    return [];
  }
}

function persistSavedAdaptiveProfiles(profiles) {
  try {
    localStorage.setItem(ADAPTIVE_PROFILE_STORAGE_KEY, JSON.stringify(profiles));
  } catch {
    // Ignore storage failures so budgeting flow remains usable.
  }
}

function createAdaptiveProfile({
  monthlySalary,
  savingsPercentage,
  currency,
  expenseStartMode,
  budgetPeriodDays,
  budgetPeriodStartDate,
  budgetPeriodEndDate,
}) {
  const now = new Date();
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: `Plan ${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
    monthlySalary: toNumber(monthlySalary),
    savingsPercentage: toPercent(savingsPercentage),
    currency,
    expenseStartMode: expenseStartMode || "include_existing",
    budgetPeriodDays: Number(budgetPeriodDays) || 30,
    budgetPeriodStartDate: budgetPeriodStartDate || null,
    budgetPeriodEndDate: budgetPeriodEndDate || null,
    savedAt: now.toISOString(),
  };
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toPercent(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return Math.max(0, Math.min(99.99, parsed));
}

function formatAmount(value, currencyCode) {
  const symbol = CURRENCIES[currencyCode]?.symbol || "";
  const formatted = toNumber(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${symbol} ${formatted}`.trim();
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toDateOrNull(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function resolveBudgetPeriodRange({ startDate, endDate, periodDays = 30 }) {
  const parsedStartDate = toDateOrNull(startDate);
  const parsedEndDate = toDateOrNull(endDate);
  const safePeriodDays = Math.max(1, Math.min(365, Math.round(Number(periodDays) || 30)));

  const fallbackStart = toStartOfDay(parsedStartDate || new Date());

  if (parsedStartDate && parsedEndDate) {
    const normalizedStart = toStartOfDay(parsedStartDate);
    const normalizedEnd = toStartOfDay(parsedEndDate);

    if (normalizedStart.getTime() <= normalizedEnd.getTime()) {
      const days = Math.floor((normalizedEnd.getTime() - normalizedStart.getTime()) / MS_PER_DAY) + 1;
      return {
        budgetPeriodStartDate: formatDateInputValue(normalizedStart),
        budgetPeriodEndDate: formatDateInputValue(normalizedEnd),
        budgetPeriodDays: String(Math.max(1, Math.min(365, days))),
      };
    }
  }

  const fallbackEnd = new Date(fallbackStart.getTime() + (safePeriodDays - 1) * MS_PER_DAY);

  return {
    budgetPeriodStartDate: formatDateInputValue(fallbackStart),
    budgetPeriodEndDate: formatDateInputValue(fallbackEnd),
    budgetPeriodDays: String(safePeriodDays),
  };
}

function computeSpendPacing(remainingAmount, periodEnd) {
  const remaining = Math.max(0, toNumber(remainingAmount));
  const endDate = toDateOrNull(periodEnd);

  if (!endDate || remaining <= 0) {
    return {
      daysRemaining: 0,
      dailyTarget: 0,
      weeklyTarget: 0,
    };
  }

  const now = new Date();
  const millisRemaining = endDate.getTime() - now.getTime();
  const daysRemaining = Math.max(1, Math.ceil(millisRemaining / MS_PER_DAY));
  const dailyTarget = remaining / daysRemaining;
  const weeklyTarget = Math.min(remaining, dailyTarget * 7);

  return {
    daysRemaining,
    dailyTarget,
    weeklyTarget,
  };
}

async function parseApiMessage(response, fallbackMessage) {
  const payload = await response.json().catch(() => null);
  return payload?.message || fallbackMessage;
}

function normalizeStatus(statusPayload) {
  if (!statusPayload || typeof statusPayload !== "object") {
    return null;
  }

  return {
    ...statusPayload,
    status: statusPayload.status || "SAFE",
    mode: statusPayload.mode || statusPayload.status || "SAFE",
    recommendations: Array.isArray(statusPayload.recommendations)
      ? statusPayload.recommendations
      : [],
    actions: Array.isArray(statusPayload.actions) ? statusPayload.actions : [],
    allowedCategories: Array.isArray(statusPayload.allowedCategories)
      ? statusPayload.allowedCategories
      : [],
    blockedCategories: Array.isArray(statusPayload.blockedCategories)
      ? statusPayload.blockedCategories
      : [],
  };
}

function hasConfiguredAdaptiveBudget(profile) {
  const monthlySalary = Number(profile?.monthlySalary);
  const savingsPercentage = Number(profile?.savingsPercentage);

  return (
    Number.isFinite(monthlySalary) &&
    monthlySalary > 0 &&
    Number.isFinite(savingsPercentage) &&
    savingsPercentage >= 0 &&
    savingsPercentage < 100
  );
}

export default function Budgets({ auth }) {
  const toast = useToast();
  const { currentCurrency, changeCurrency } = useCurrency();
  const navigate = useNavigate();
  const { planId: rawPlanId } = useParams();
  const planId =
    typeof rawPlanId === "string" && rawPlanId.length > 0
      ? safeDecodePathSegment(rawPlanId)
      : null;
  const isPlanRoute = Boolean(planId);
  const [showDashboardMetrics, setShowDashboardMetrics] = useState(false);
  const [suppressAutoShowMetrics, setSuppressAutoShowMetrics] = useState(false);

  const isGuest = Boolean(auth?.isGuest);

  const {
    data: budgetProfile,
    isLoading: isProfileLoading,
  } = useAdaptiveBudgetSettings({ enabled: !isGuest });

  const {
    data: statusData,
    isLoading: isStatusLoading,
    isFetching: isStatusFetching,
    refetch: refetchStatus,
    error: statusError,
  } = useAdaptiveBudgetStatus({ enabled: !isGuest && (isPlanRoute || showDashboardMetrics) });

  const normalizedStatus = !isPlanRoute && !showDashboardMetrics ? null : normalizeStatus(statusData);

  const {
    data: analysisData,
    isLoading: isAnalysisLoading,
    isFetching: isAnalysisFetching,
    refetch: refetchAnalysis,
  } = useAdaptiveBudgetAnalysis({
    enabled: !isGuest && (isPlanRoute || showDashboardMetrics) && Boolean(normalizedStatus?.usableBudget),
  });

  const updateSettingsMutation = useUpdateAdaptiveBudgetSettings();

  const profileForm = useMemo(
    () => {
      const budgetRange = resolveBudgetPeriodRange({
        startDate: budgetProfile?.budgetPeriodStartDate,
        endDate: budgetProfile?.budgetPeriodEndDate,
        periodDays: budgetProfile?.budgetPeriodDays,
      });

      return {
        monthlySalary:
          budgetProfile?.monthlySalary === null || budgetProfile?.monthlySalary === undefined
            ? ""
            : String(budgetProfile?.monthlySalary),
        savingsPercentage: String(budgetProfile?.savingsPercentage ?? 20),
        currency: budgetProfile?.currency || currentCurrency || "LKR",
        expenseStartMode: budgetProfile?.expenseStartMode || "include_existing",
        budgetPeriodDays: budgetRange.budgetPeriodDays,
        budgetPeriodStartDate: budgetRange.budgetPeriodStartDate,
        budgetPeriodEndDate: budgetRange.budgetPeriodEndDate,
      };
    },
    [budgetProfile, currentCurrency]
  );

  const inactiveMainForm = useMemo(
    () => {
      const budgetRange = resolveBudgetPeriodRange({
        startDate: new Date(),
        periodDays: 30,
      });

      return {
        monthlySalary: "",
        savingsPercentage: "",
        currency: currentCurrency || "LKR",
        expenseStartMode: "include_existing",
        budgetPeriodDays: budgetRange.budgetPeriodDays,
        budgetPeriodStartDate: budgetRange.budgetPeriodStartDate,
        budgetPeriodEndDate: budgetRange.budgetPeriodEndDate,
      };
    },
    [currentCurrency]
  );

  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showSavedProfiles, setShowSavedProfiles] = useState(false);
  const [savedProfiles, setSavedProfiles] = useState(() => loadSavedAdaptiveProfiles());
  const [categoryBudgets, setCategoryBudgets] = useState([]);
  const [isCategoryBudgetsLoading, setIsCategoryBudgetsLoading] = useState(false);
  const [isSyncingProfessionalPlan, setIsSyncingProfessionalPlan] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [isEditBudgetModalVisible, setIsEditBudgetModalVisible] = useState(false);
  const [editBudgetLimitValue, setEditBudgetLimitValue] = useState("");
  const [editBudgetError, setEditBudgetError] = useState("");
  const [needsFundingSourceSelection, setNeedsFundingSourceSelection] = useState(false);
  const [requiredFundingAmount, setRequiredFundingAmount] = useState(0);
  const [selectedFundingCategoryId, setSelectedFundingCategoryId] = useState("");
  const [isUpdatingBudgetLimit, setIsUpdatingBudgetLimit] = useState(false);

  const shouldShowProfessionalPlan = isPlanRoute || showDashboardMetrics;

  const activeSavedProfile = useMemo(() => {
    if (!isPlanRoute) {
      return null;
    }

    return savedProfiles.find((profile) => profile.id === planId) || null;
  }, [isPlanRoute, planId, savedProfiles]);

  const activeProfileForm = useMemo(() => {
    if (!activeSavedProfile) {
      return null;
    }

    const budgetRange = resolveBudgetPeriodRange({
      startDate: activeSavedProfile.budgetPeriodStartDate,
      endDate: activeSavedProfile.budgetPeriodEndDate,
      periodDays: activeSavedProfile.budgetPeriodDays,
    });

    return {
      monthlySalary:
        activeSavedProfile.monthlySalary === null || activeSavedProfile.monthlySalary === undefined
          ? ""
          : String(activeSavedProfile.monthlySalary),
      savingsPercentage: String(activeSavedProfile.savingsPercentage ?? 20),
      currency: activeSavedProfile.currency || currentCurrency || "LKR",
      expenseStartMode: activeSavedProfile.expenseStartMode || "include_existing",
      budgetPeriodDays: budgetRange.budgetPeriodDays,
      budgetPeriodStartDate: budgetRange.budgetPeriodStartDate,
      budgetPeriodEndDate: budgetRange.budgetPeriodEndDate,
    };
  }, [activeSavedProfile, currentCurrency]);



  useEffect(() => {
    if (isPlanRoute || showDashboardMetrics || suppressAutoShowMetrics) {
      return;
    }

    if (hasConfiguredAdaptiveBudget(budgetProfile)) {
      setShowDashboardMetrics(true);
    }
  }, [budgetProfile, isPlanRoute, showDashboardMetrics, suppressAutoShowMetrics]);

  const [draftForm, setDraftForm] = useState(null);
  const mainFormBase = showDashboardMetrics ? profileForm : inactiveMainForm;
  const form = draftForm ?? activeProfileForm ?? mainFormBase;

  const updateFormField = (field, value) => {
    setDraftForm((previous) => ({
      ...(previous ?? form),
      [field]: value,
    }));
  };

  const updateBudgetPeriodDates = useCallback((nextStartDate, nextEndDate) => {
    setDraftForm((previous) => {
      const base = previous ?? form;
      const resolvedStartDate = nextStartDate || base.budgetPeriodStartDate || "";
      const resolvedEndDate = nextEndDate || base.budgetPeriodEndDate || "";
      const next = {
        ...base,
        budgetPeriodStartDate: resolvedStartDate,
        budgetPeriodEndDate: resolvedEndDate,
      };

      const parsedStart = parseDateInputValue(resolvedStartDate, false);
      const parsedEnd = parseDateInputValue(resolvedEndDate, false);

      if (!parsedStart || !parsedEnd) {
        return next;
      }

      const normalizedStart = toStartOfDay(parsedStart);
      const normalizedEnd = toStartOfDay(parsedEnd);
      if (normalizedStart.getTime() > normalizedEnd.getTime()) {
        return next;
      }

      const days = Math.floor((normalizedEnd.getTime() - normalizedStart.getTime()) / MS_PER_DAY) + 1;
      next.budgetPeriodDays = String(Math.max(1, Math.min(365, days)));
      return next;
    });
  }, [form]);

  const handleBudgetPeriodDaysInputChange = useCallback((rawValue) => {
    setDraftForm((previous) => {
      const base = previous ?? form;
      const next = {
        ...base,
        budgetPeriodDays: rawValue,
      };

      const parsedDays = Number(rawValue);
      if (!Number.isFinite(parsedDays) || !Number.isInteger(parsedDays) || parsedDays < 1 || parsedDays > 365) {
        return next;
      }

      const parsedStartDate = parseDateInputValue(base.budgetPeriodStartDate, false);
      const normalizedStartDate = toStartOfDay(parsedStartDate || new Date());
      const normalizedEndDate = new Date(normalizedStartDate.getTime() + (parsedDays - 1) * MS_PER_DAY);

      next.budgetPeriodStartDate = formatDateInputValue(normalizedStartDate);
      next.budgetPeriodEndDate = formatDateInputValue(normalizedEndDate);
      return next;
    });
  }, [form]);

  const selectedCurrency = form.currency || normalizedStatus?.currency || currentCurrency || "LKR";
  const selectedExpenseStartMode = form.expenseStartMode || "include_existing";
  const selectedBudgetPeriodDays = Number(form.budgetPeriodDays) || 30;

  const salaryPreview = toNumber(form.monthlySalary);
  const savingsPreview = toPercent(form.savingsPercentage);
  const savingsAmountPreview = salaryPreview * (savingsPreview / 100);
  const usableBudgetPreview = Math.max(0, salaryPreview - savingsAmountPreview);

  const statusKey = normalizedStatus?.status || "SAFE";
  const statusStyle = STATUS_STYLE[statusKey] || STATUS_STYLE.SAFE;
  const StatusIcon = statusStyle.icon;

  const categoryBreakdown = analysisData?.categoryBreakdown || [];
  const historyInsights = analysisData?.historyInsights || {};
  const topSpendingCategories = historyInsights.topSpendingCategories || [];

  const updateSavedProfiles = (updater) => {
    setSavedProfiles((previous) => {
      const next = typeof updater === "function" ? updater(previous) : updater;
      persistSavedAdaptiveProfiles(next);
      return next;
    });
  };

  const fetchRawCategoryBudgets = useCallback(async () => {
    const response = await fetchWithAuth("/budgets/with-spending");

    if (!response.ok) {
      throw new Error(await parseApiMessage(response, "Failed to load category budgets"));
    }

    const payload = await response.json();
    return Array.isArray(payload?.budgets) ? payload.budgets : [];
  }, []);

  const fetchCategoryBudgets = useCallback(async () => {
    const budgets = await fetchRawCategoryBudgets();
    return budgets.filter((entry) => !isNonActionableBudgetCategory(entry?.category));
  }, [fetchRawCategoryBudgets]);

  const removeNonActionableCategoryBudgets = useCallback(async () => {
    const budgets = await fetchRawCategoryBudgets();
    const staleBudgets = budgets.filter((entry) => isNonActionableBudgetCategory(entry?.category) && entry?._id);

    if (staleBudgets.length === 0) {
      return;
    }

    await Promise.allSettled(
      staleBudgets.map((entry) =>
        fetchWithAuth(`/budgets/${entry._id}`, {
          method: "DELETE",
        })
      )
    );
  }, [fetchRawCategoryBudgets]);

  const loadCategoryBudgets = useCallback(async () => {
    try {
      setIsCategoryBudgetsLoading(true);
      const budgets = await fetchCategoryBudgets();
      setCategoryBudgets(budgets);
      return budgets;
    } catch (error) {
      toast.error(error?.message || "Failed to load category budgets");
      return [];
    } finally {
      setIsCategoryBudgetsLoading(false);
    }
  }, [fetchCategoryBudgets, toast]);

  const openBudgetEditor = useCallback((budget) => {
    setEditingBudget(budget);
    setEditBudgetLimitValue(String(Math.round(Number(budget?.limit) || 0)));
    setEditBudgetError("");
    setNeedsFundingSourceSelection(false);
    setRequiredFundingAmount(0);
    setSelectedFundingCategoryId("");
  }, []);

  const closeBudgetEditor = useCallback(() => {
    if (isUpdatingBudgetLimit) {
      return;
    }

    setEditingBudget(null);
    setEditBudgetLimitValue("");
    setEditBudgetError("");
    setNeedsFundingSourceSelection(false);
    setRequiredFundingAmount(0);
    setSelectedFundingCategoryId("");
  }, [isUpdatingBudgetLimit]);

  const fundingSourceOptions = useMemo(() => {
    if (!editingBudget?._id) {
      return [];
    }

    return categoryBudgets.filter((entry) => {
      if (!entry?._id || entry._id === editingBudget._id) {
        return false;
      }

      if (normalizeBudgetCategoryName(entry.category) === OTHER_EXPENSE_CATEGORY) {
        return false;
      }

      return Number(entry.limit) > 0;
    });
  }, [categoryBudgets, editingBudget]);

  useEffect(() => {
    if (!editingBudget) {
      setIsEditBudgetModalVisible(false);
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      setIsEditBudgetModalVisible(true);
    });

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        closeBudgetEditor();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeBudgetEditor, editingBudget]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("category")) {
      setShowDashboardMetrics(true);
    }
  }, []);

  useEffect(() => {
    if (categoryBudgets.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const categoryQuery = params.get("category");
    if (categoryQuery) {
      const targetCategory = normalizeBudgetCategoryName(categoryQuery);
      const foundBudget = categoryBudgets.find(
        (b) => normalizeBudgetCategoryName(b.category) === targetCategory
      );
      if (foundBudget) {
        // Open the editor modal automatically
        openBudgetEditor(foundBudget);

        // Smooth scroll to the target table row after a short timeout to let the DOM stabilize
        setTimeout(() => {
          const element = document.getElementById(`budget-row-${targetCategory}`);
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "center" });
            
            // Add a brief highlighted visual pulse to the row
            element.classList.add("bg-blue-50/50", "dark:bg-blue-500/10");
            setTimeout(() => {
              element.classList.remove("bg-blue-50/50", "dark:bg-blue-500/10");
            }, 3000);
          }
        }, 500);

        // Clean up the URL search params so a page refresh doesn't trigger the modal again
        navigate("/budgets", { replace: true });
      }
    }
  }, [categoryBudgets, openBudgetEditor, navigate]);

  const handleUpdateCategoryBudget = useCallback(async () => {
    if (!editingBudget?._id) {
      return;
    }

    const nextLimitRaw = Number(editBudgetLimitValue);
    if (!Number.isFinite(nextLimitRaw) || nextLimitRaw < 0) {
      setEditBudgetError("Enter a valid amount (0 or higher)");
      toast.error("Enter a valid amount (0 or higher)");
      return;
    }

    const nextLimit = Math.round(nextLimitRaw);
    const currentLimit = Math.round(Number(editingBudget.limit) || 0);

    if (nextLimit === currentLimit) {
      closeBudgetEditor();
      return;
    }

    const isEditingOtherExpense =
      normalizeBudgetCategoryName(editingBudget.category) === OTHER_EXPENSE_CATEGORY;

    const delta = nextLimit - currentLimit;
    let otherExpenseBudget = null;
    let nextOtherExpenseLimit = null;
    let deductionSourceBudget = null;
    let nextDeductionSourceLimit = null;

    if (!isEditingOtherExpense && delta !== 0) {
      otherExpenseBudget = categoryBudgets.find(
        (entry) => normalizeBudgetCategoryName(entry?.category) === OTHER_EXPENSE_CATEGORY
      );

      if (!otherExpenseBudget?._id) {
        setEditBudgetError("Cannot rebalance this change because 'Other Expense' is missing.");
        toast.error("Cannot rebalance this change because 'Other Expense' is missing.");
        return;
      }

      if (delta > 0) {
        const otherExpenseLimit = Math.round(Number(otherExpenseBudget.limit) || 0);
        const availableFromOtherExpense = Math.max(0, otherExpenseLimit);
        const shortfall = Math.max(0, delta - availableFromOtherExpense);
        nextOtherExpenseLimit = Math.max(0, otherExpenseLimit - delta);

        if (shortfall > 0) {
          setNeedsFundingSourceSelection(true);
          setRequiredFundingAmount(shortfall);

          if (!selectedFundingCategoryId) {
            setEditBudgetError("Other Expense has insufficient funds. Select a category to deduct the remaining amount.");
            return;
          }

          deductionSourceBudget = categoryBudgets.find((entry) => entry?._id === selectedFundingCategoryId);
          if (!deductionSourceBudget?._id) {
            setEditBudgetError("Select a valid category to provide additional funds.");
            return;
          }

          if (normalizeBudgetCategoryName(deductionSourceBudget.category) === OTHER_EXPENSE_CATEGORY) {
            setEditBudgetError("Choose a category other than Other Expense.");
            return;
          }

          nextDeductionSourceLimit = Math.round(Number(deductionSourceBudget.limit) || 0) - shortfall;
          if (nextDeductionSourceLimit < 0) {
            setEditBudgetError("Selected category does not have enough funds for this adjustment.");
            return;
          }
        } else {
          setNeedsFundingSourceSelection(false);
          setRequiredFundingAmount(0);
          setSelectedFundingCategoryId("");
        }
      } else {
        nextOtherExpenseLimit = Math.round((Number(otherExpenseBudget.limit) || 0) - delta);
        setNeedsFundingSourceSelection(false);
        setRequiredFundingAmount(0);
        setSelectedFundingCategoryId("");
      }
    }

    setEditBudgetError("");
    setIsUpdatingBudgetLimit(true);
    try {
      const requests = [
        fetchWithAuth(`/budgets/${editingBudget._id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            limit: nextLimit,
            active: true,
          }),
        }),
      ];

      if (otherExpenseBudget && otherExpenseBudget._id !== editingBudget._id) {
        requests.push(
          fetchWithAuth(`/budgets/${otherExpenseBudget._id}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              limit: nextOtherExpenseLimit,
              active: true,
            }),
          })
        );
      }

      if (deductionSourceBudget && deductionSourceBudget._id !== editingBudget._id) {
        requests.push(
          fetchWithAuth(`/budgets/${deductionSourceBudget._id}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              limit: nextDeductionSourceLimit,
              active: true,
            }),
          })
        );
      }

      const responses = await Promise.all(requests);
      for (const response of responses) {
        if (!response.ok) {
          throw new Error(await parseApiMessage(response, "Failed to update budget category"));
        }
      }

      await loadCategoryBudgets();
      setEditingBudget(null);
      setEditBudgetLimitValue("");
      setEditBudgetError("");
      setNeedsFundingSourceSelection(false);
      setRequiredFundingAmount(0);
      setSelectedFundingCategoryId("");
      toast.success("Category budget updated");
    } catch (error) {
      setEditBudgetError(error?.message || "Failed to update category budget");
      toast.error(error?.message || "Failed to update category budget");
    } finally {
      setIsUpdatingBudgetLimit(false);
    }
  }, [
    categoryBudgets,
    closeBudgetEditor,
    editBudgetLimitValue,
    editingBudget,
    loadCategoryBudgets,
    selectedFundingCategoryId,
    toast,
  ]);

  const syncProfessionalCategoryBudgets = useCallback(
    async ({ monthlySalary, savingsPercentage, expenseStartMode = "include_existing", silent = false }) => {
      const usableBudget = Math.max(0, monthlySalary - monthlySalary * (savingsPercentage / 100));

      if (usableBudget <= 0) {
        if (!silent) {
          toast.error("Usable budget is 0. Increase salary or reduce savings percentage.");
        }
        return;
      }

      try {
        setIsSyncingProfessionalPlan(true);
        await removeNonActionableCategoryBudgets();

        const recommendationResponse = await fetchWithAuth("/budgets/generate-from-income", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            monthlyIncome: usableBudget,
            maxLookbackMonths: 3,
          }),
        });

        if (!recommendationResponse.ok) {
          throw new Error(
            await parseApiMessage(recommendationResponse, "Failed to generate smart budget recommendations")
          );
        }

        const recommendationPayload = await recommendationResponse.json();
        const recommendations = Array.isArray(recommendationPayload?.recommendations)
          ? recommendationPayload.recommendations
          : [];

        const actionableRecommendations = recommendations
          .filter(
            (entry) =>
              Number(entry?.recommendedAmount) > 0 &&
              typeof entry?.category === "string" &&
              !isNonActionableBudgetCategory(entry.category) &&
              normalizeBudgetCategoryName(entry.category) !== OTHER_EXPENSE_CATEGORY
          )
          .slice(0, 10);

        // Rebalancing Allocation Math
        let allocatedSum = 0;
        const tempRecommendations = actionableRecommendations.map((entry) => {
          const limit = Math.max(10, Math.round(Number(entry.recommendedAmount)));
          allocatedSum += limit;
          return { ...entry, limit };
        });

        let finalRecommendations = [];
        let otherExpenseLimit = 0;

        if (allocatedSum > usableBudget) {
          const scaleFactor = usableBudget / allocatedSum;
          let runningSum = 0;
          finalRecommendations = tempRecommendations.map((entry, index) => {
            let limit = Math.max(10, Math.round(entry.limit * scaleFactor));
            if (index === tempRecommendations.length - 1) {
              limit = Math.max(10, Math.round(usableBudget - runningSum));
            }
            runningSum += limit;
            return { ...entry, limit };
          });
          otherExpenseLimit = Math.max(0, Math.round(usableBudget - runningSum));
        } else {
          finalRecommendations = tempRecommendations;
          otherExpenseLimit = Math.round(usableBudget - allocatedSum);
        }

        const existingBudgets = await fetchCategoryBudgets();
        const existingBudgetMap = new Map(
          existingBudgets.map((entry) => [
            `${String(entry.category || "").trim().toLowerCase()}|${String(entry.period || "monthly")}`,
            entry,
          ])
        );

        // Build list of operations to run in parallel
        const updatePromises = finalRecommendations.map(async (entry) => {
          const key = `${entry.category.trim().toLowerCase()}|monthly`;
          const existing = existingBudgetMap.get(key);

          if (existing?._id) {
            await fetchWithAuth(`/budgets/${existing._id}`, {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                limit: entry.limit,
                alertThreshold: 85,
                active: true,
                expenseStartMode,
              }),
            });
            return;
          }

          await fetchWithAuth("/budgets", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              category: entry.category,
              limit: entry.limit,
              period: "monthly",
              alertThreshold: 85,
              color: entry.type === "essential" ? "blue" : "cyan",
              expenseStartMode,
            }),
          });
        });

        // Add 'other expense' operation to capture leftover buffer
        const otherExpenseKey = `${OTHER_EXPENSE_CATEGORY}|monthly`;
        const existingOtherExpense = existingBudgetMap.get(otherExpenseKey);

        updatePromises.push((async () => {
          if (existingOtherExpense?._id) {
            await fetchWithAuth(`/budgets/${existingOtherExpense._id}`, {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                limit: otherExpenseLimit,
                alertThreshold: 85,
                active: true,
                expenseStartMode,
              }),
            });
            return;
          }

          await fetchWithAuth("/budgets", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              category: OTHER_EXPENSE_CATEGORY,
              limit: otherExpenseLimit,
              period: "monthly",
              alertThreshold: 85,
              color: "cyan",
              expenseStartMode,
            }),
          });
        })());

        await Promise.all(updatePromises);

        await loadCategoryBudgets();

        if (!silent) {
          toast.success("Professional category budgets synced with your spending data");
        }
      } catch (error) {
        if (!silent) {
          toast.error(error?.message || "Failed to sync professional category budgets");
        }
      } finally {
        setIsSyncingProfessionalPlan(false);
      }
    },
    [fetchCategoryBudgets, loadCategoryBudgets, removeNonActionableCategoryBudgets, toast]
  );

  useEffect(() => {
    if (!shouldShowProfessionalPlan || isGuest) {
      setCategoryBudgets([]);
      return;
    }

    let disposed = false;

    const initializeCategoryBudgets = async () => {
      setIsCategoryBudgetsLoading(true);
      try {
        await removeNonActionableCategoryBudgets();
        const budgets = await fetchCategoryBudgets();
        if (!disposed) {
          setCategoryBudgets(budgets);
        }
      } catch {
        if (!disposed) {
          setCategoryBudgets([]);
        }
      } finally {
        if (!disposed) {
          setIsCategoryBudgetsLoading(false);
        }
      }
    };

    initializeCategoryBudgets();

    return () => {
      disposed = true;
    };
  }, [fetchCategoryBudgets, isGuest, removeNonActionableCategoryBudgets, shouldShowProfessionalPlan]);

  const spentPercentage = useMemo(() => {
    const usable = toNumber(normalizedStatus?.usableBudget);
    const spent = toNumber(normalizedStatus?.spent);

    if (usable <= 0) {
      return 0;
    }

    return Math.min(100, (spent / usable) * 100);
  }, [normalizedStatus]);

  const expenseWindowLabel = useMemo(() => {
    if (!normalizedStatus) {
      return "";
    }

    if (normalizedStatus.expenseStartMode !== "start_from_now") {
      return "Expense window: includes all expenses recorded in the current period.";
    }

    const start = toDateOrNull(normalizedStatus.expenseStartDate);
    if (!start) {
      return "Expense window: started from now (zero baseline).";
    }

    return `Expense window: started ${start.toLocaleDateString()} ${start.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}.`;
  }, [normalizedStatus]);

  const runwayForecast = useMemo(() => {
    if (!normalizedStatus) {
      return {
        currentDailySpend: 0,
        projectedMonthSpend: 0,
        projectedEndBalance: 0,
        runwayDays: 0,
      };
    }

    const now = new Date();
    const currentDay = now.getDate();
    const totalDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const spent = toNumber(normalizedStatus.spent);
    const usableBudget = toNumber(normalizedStatus.usableBudget);
    const remaining = toNumber(normalizedStatus.remaining);
    const currentDailySpend = spent / Math.max(1, currentDay);
    const projectedMonthSpend = currentDailySpend * totalDays;
    const projectedEndBalance = usableBudget - projectedMonthSpend;
    const runwayDays = currentDailySpend > 0 ? remaining / currentDailySpend : 0;

    return {
      currentDailySpend,
      projectedMonthSpend,
      projectedEndBalance,
      runwayDays,
    };
  }, [normalizedStatus]);

  const handleRefresh = async () => {
    if (isPlanRoute) {
      if (shouldShowProfessionalPlan) {
        await loadCategoryBudgets();
      }
      return;
    }

    const tasks = [refetchStatus(), refetchAnalysis()];
    if (shouldShowProfessionalPlan) {
      tasks.push(loadCategoryBudgets());
    }

    await Promise.all(tasks);
  };

  const saveSettings = async ({ createAnother = false } = {}) => {
    const monthlySalary = toNumber(form.monthlySalary);
    const savingsPercentage = toPercent(form.savingsPercentage);
    const parsedBudgetPeriodStartDate = parseDateInputValue(form.budgetPeriodStartDate, false);
    const parsedBudgetPeriodEndDate = parseDateInputValue(form.budgetPeriodEndDate, false);

    if (!Number.isFinite(monthlySalary) || monthlySalary <= 0) {
      toast.error("Monthly salary must be greater than 0");
      return;
    }

    if (!Number.isFinite(savingsPercentage) || savingsPercentage < 0 || savingsPercentage >= 100) {
      toast.error("Savings percentage must be between 0 and less than 100");
      return;
    }

    if (!parsedBudgetPeriodStartDate || !parsedBudgetPeriodEndDate) {
      toast.error("Select both budget period start and end dates");
      return;
    }

    const normalizedBudgetPeriodStartDate = toStartOfDay(parsedBudgetPeriodStartDate);
    const normalizedBudgetPeriodEndDate = toStartOfDay(parsedBudgetPeriodEndDate);

    if (normalizedBudgetPeriodStartDate.getTime() > normalizedBudgetPeriodEndDate.getTime()) {
      toast.error("Budget period start date must be before or equal to end date");
      return;
    }

    const budgetPeriodDays =
      Math.floor((normalizedBudgetPeriodEndDate.getTime() - normalizedBudgetPeriodStartDate.getTime()) / MS_PER_DAY) + 1;

    if (budgetPeriodDays < 1 || budgetPeriodDays > 365) {
      toast.error("Budget period range must be between 1 and 365 days");
      return;
    }

    const budgetPeriodStartDate = formatDateInputValue(normalizedBudgetPeriodStartDate);
    const budgetPeriodEndDate = formatDateInputValue(normalizedBudgetPeriodEndDate);

    try {
      await updateSettingsMutation.mutateAsync({
        monthlySalary,
        savingsPercentage,
        currency: form.currency,
        expenseStartMode: selectedExpenseStartMode,
        budgetPeriodDays,
        budgetPeriodStartDate,
        budgetPeriodEndDate,
      });

      changeCurrency(form.currency);

      if (isPlanRoute && planId && !createAnother) {
        updateSavedProfiles((previous) =>
          previous.map((profile) =>
            profile.id === planId
              ? {
                  ...profile,
                  monthlySalary,
                  savingsPercentage,
                  currency: form.currency,
                  expenseStartMode: selectedExpenseStartMode,
                  budgetPeriodDays,
                  budgetPeriodStartDate,
                  budgetPeriodEndDate,
                  savedAt: new Date().toISOString(),
                }
              : profile
          )
        );

        void syncProfessionalCategoryBudgets({
          monthlySalary,
          savingsPercentage,
          expenseStartMode: selectedExpenseStartMode,
          silent: true,
        });

        toast.success("Budget updated successfully");
        return;
      }

      if (createAnother) {
        const profile = createAdaptiveProfile({
          monthlySalary,
          savingsPercentage,
          currency: form.currency,
          expenseStartMode: selectedExpenseStartMode,
          budgetPeriodDays,
          budgetPeriodStartDate,
          budgetPeriodEndDate,
        });

        updateSavedProfiles((previous) => [profile, ...previous].slice(0, MAX_SAVED_ADAPTIVE_PROFILES));
        setShowSavedProfiles(true);
        setDraftForm({ ...inactiveMainForm });
        setShowDashboardMetrics(false);
        setSuppressAutoShowMetrics(true);

        if (isPlanRoute) {
          navigate("/budgets");
        }

        toast.success("Budget saved. Previous budget is kept in Saved Plans.");
      } else {
        if (!isPlanRoute) {
          setSuppressAutoShowMetrics(false);
          setShowDashboardMetrics(true);
        }
        void syncProfessionalCategoryBudgets({
          monthlySalary,
          savingsPercentage,
          expenseStartMode: selectedExpenseStartMode,
          silent: true,
        });
        toast.success("Adaptive budget settings saved");
      }
    } catch (error) {
      toast.error(error?.message || "Failed to save adaptive budget settings");
    }
  };

  const handleSaveSettings = async (event) => {
    event.preventDefault();
    await saveSettings();
  };

  const handleSaveAndCreateAnother = async () => {
    await saveSettings({ createAnother: true });
  };

  const handleOpenSavedProfile = (profile) => {
    setSuppressAutoShowMetrics(false);
    setDraftForm(null);
    navigate(getBudgetPlanPath(profile.id));
  };

  const handleDeleteSavedProfile = (profileId) => {
    updateSavedProfiles((previous) => previous.filter((profile) => profile.id !== profileId));

    if (isPlanRoute && planId === profileId) {
      setSuppressAutoShowMetrics(true);
      setDraftForm({ ...inactiveMainForm });
      setShowDashboardMetrics(false);
      navigate("/budgets");
      toast.success("Saved plan removed");
    }
  };

  const handleBackToBudgets = () => {
    setSuppressAutoShowMetrics(true);
    setDraftForm({ ...inactiveMainForm });
    setShowDashboardMetrics(false);
    navigate("/budgets");
  };

  const exportBudgetPdf = () => {
    if (!normalizedStatus) {
      toast.error("Budget status is not ready to export yet");
      return;
    }

    const doc = new jsPDF();
    const generatedAt = new Date().toLocaleString();

    doc.setFontSize(18);
    doc.text("Adaptive Budget Report", 14, 18);
    doc.setFontSize(11);
    doc.text(`Generated: ${generatedAt}`, 14, 26);

    autoTable(doc, {
      startY: 32,
      head: [["Metric", "Value"]],
      body: [
        ["Status", normalizedStatus.status],
        ["Remaining Budget", formatAmount(normalizedStatus.remaining, selectedCurrency)],
        ["Daily Limit", formatAmount(normalizedStatus.dailyLimit, selectedCurrency)],
        ["Weekly Limit", formatAmount(normalizedStatus.weeklyLimit, selectedCurrency)],
        ["Spent", formatAmount(normalizedStatus.spent, selectedCurrency)],
        ["Expected Spend", formatAmount(normalizedStatus.expectedSpend, selectedCurrency)],
        ["Budget Used", `${spentPercentage.toFixed(1)}%`],
      ],
      theme: "grid",
      styles: { fontSize: 10 },
      headStyles: { fillColor: [37, 99, 235] },
      margin: { left: 14, right: 14 },
    });

    if (categoryBreakdown.length > 0) {
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 10,
        head: [["Category", "Type", "Current Month", "Avg Monthly", "Leak"]],
        body: categoryBreakdown.map((item) => [
          item.category,
          item.type,
          formatAmount(item.currentMonthSpent, selectedCurrency),
          formatAmount(item.averageMonthly, selectedCurrency),
          item.isLeak ? "Yes" : "No",
        ]),
        theme: "grid",
        styles: { fontSize: 9 },
        headStyles: { fillColor: [30, 41, 59] },
        margin: { left: 14, right: 14 },
      });
    }

    doc.save(`budget-report-${new Date().toISOString().split("T")[0]}.pdf`);
    setShowExportMenu(false);
  };

  const exportBudgetCsv = () => {
    if (!normalizedStatus) {
      toast.error("Budget status is not ready to export yet");
      return;
    }

    const rows = [
      ["Metric", "Value"],
      ["Status", normalizedStatus.status],
      ["Remaining Budget", formatAmount(normalizedStatus.remaining, selectedCurrency)],
      ["Daily Limit", formatAmount(normalizedStatus.dailyLimit, selectedCurrency)],
      ["Weekly Limit", formatAmount(normalizedStatus.weeklyLimit, selectedCurrency)],
      ["Spent", formatAmount(normalizedStatus.spent, selectedCurrency)],
      ["Expected Spend", formatAmount(normalizedStatus.expectedSpend, selectedCurrency)],
      ["Budget Used", `${spentPercentage.toFixed(1)}%`],
      [],
      ["Category", "Type", "Current Month", "Avg Monthly", "Leak"],
      ...categoryBreakdown.map((item) => [
        item.category,
        item.type,
        item.currentMonthSpent,
        item.averageMonthly,
        item.isLeak ? "Yes" : "No",
      ]),
    ];

    const csv = rows
      .map((row) => row.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `budget-report-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    setShowExportMenu(false);
  };

  if (isGuest) {
    return <GuestRestricted featureName="Adaptive Budgeting" />;
  }

  if (isPlanRoute && !activeSavedProfile) {
    return (
      <div className="rounded-2xl border border-light-border-default dark:border-dark-border-default bg-light-surface-secondary dark:bg-dark-surface-primary p-6 shadow-premium dark:shadow-card-dark">
        <p className="text-base font-semibold text-light-text-primary dark:text-dark-text-primary">This saved budget could not be found.</p>
        <button
          type="button"
          onClick={handleBackToBudgets}
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-light-border-default dark:border-dark-border-default px-3 py-2 text-sm font-semibold text-light-text-primary transition hover:bg-light-bg-accent dark:text-dark-text-primary dark:hover:bg-dark-surface-secondary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to All Budgets
        </button>
      </div>
    );
  }

  if (isProfileLoading && isStatusLoading && !normalizedStatus) {
    return (
      <div className="flex min-h-[480px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          <p className="mt-3 text-light-text-secondary dark:text-dark-text-secondary">Loading adaptive budget engine...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <SystemPageHeader
        tagline="DETERMINISTIC BUDGET CONTROL"
        title="Adaptive Budget System"
        subtitle={isPlanRoute
          ? "Editing a saved budget plan. Update values and save changes instantly."
          : "Savings is locked. Budget risk is tracked in real-time. Crisis controls activate automatically."}
        actions={(
          <>
            {isPlanRoute && (
              <button
                type="button"
                onClick={handleBackToBudgets}
                className="inline-flex items-center gap-2 rounded-full border border-light-border-default dark:border-white/10 bg-light-surface-primary dark:bg-white/5 px-4 py-2 text-sm font-semibold text-light-text-primary dark:text-white transition hover:bg-light-bg-accent dark:hover:border-white/20 dark:hover:bg-white/10"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
            )}

            {!isPlanRoute && showDashboardMetrics && (
              <>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowExportMenu((previous) => !previous)}
                    className="inline-flex items-center gap-2 rounded-full border border-light-border-default dark:border-white/10 bg-light-surface-primary dark:bg-white/5 px-4 py-2 text-sm font-semibold text-light-text-primary dark:text-white transition hover:bg-light-bg-accent dark:hover:border-white/20 dark:hover:bg-white/10"
                  >
                    <Download className="h-4 w-4" />
                    Export Budget
                    <ChevronDown className={`h-4 w-4 transition-transform ${showExportMenu ? "rotate-180" : ""}`} />
                  </button>

                  {showExportMenu && (
                    <div className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-light-border-default dark:border-white/5 bg-light-surface-secondary dark:bg-[#0D1117]">
                      <button
                        type="button"
                        onClick={exportBudgetPdf}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left text-light-text-primary dark:text-white transition-colors hover:bg-light-bg-accent dark:hover:bg-white/5"
                      >
                        <FileText className="h-5 w-5 text-red-500" />
                        <div>
                          <p className="font-medium">Export as PDF</p>
                          <p className="text-xs text-[#9CA3AF]">Formatted budget summary</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={exportBudgetCsv}
                        className="flex w-full items-center gap-3 border-t border-light-border-subtle dark:border-white/5 px-4 py-3 text-left text-light-text-primary dark:text-white transition-colors hover:bg-light-bg-accent dark:hover:bg-white/5"
                      >
                        <FileSpreadsheet className="h-5 w-5 text-green-500" />
                        <div>
                          <p className="font-medium">Export as CSV</p>
                          <p className="text-xs text-[#9CA3AF]">Spreadsheet compatible</p>
                        </div>
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleRefresh}
                  data-testid="budget-refresh-status-button"
                  className="inline-flex items-center gap-2 rounded-full border border-light-border-default dark:border-white/10 bg-light-surface-primary dark:bg-white/5 px-4 py-2 text-sm font-semibold text-light-text-primary dark:text-white transition hover:bg-light-bg-accent dark:hover:border-white/20 dark:hover:bg-white/10"
                >
                  <RefreshCw className={`h-4 w-4 ${(isStatusFetching || isAnalysisFetching) ? "animate-spin" : ""}`} />
                  Refresh Status
                </button>
              </>
            )}
          </>
        )}
      />

      <section className="rounded-2xl border border-light-border-default dark:border-dark-border-strong bg-light-surface-secondary dark:bg-dark-surface-primary p-6 shadow-premium dark:shadow-card-dark">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CircleDollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-semibold text-light-text-primary dark:text-dark-text-primary">
              {isPlanRoute ? "Edit Saved Budget" : "Budget Configuration"}
            </h2>
          </div>

          {isPlanRoute && activeSavedProfile && (
            <p className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary">
              {activeSavedProfile.name}
            </p>
          )}
        </div>

        <form onSubmit={handleSaveSettings} className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-light-text-secondary dark:text-dark-text-secondary">Monthly Salary</span>
            <CurrencyInput
              data-testid="budget-monthly-salary-input"
              name="monthlySalary"
              value={form.monthlySalary ?? ""}
              onChange={(event) => updateFormField("monthlySalary", event.target.value)}
              className="w-full rounded-xl border border-light-border-default dark:border-dark-border-default bg-light-surface-primary dark:bg-dark-surface-secondary px-3 py-2 text-sm text-light-text-primary dark:text-dark-text-primary focus:border-blue-500 focus:outline-none"
              placeholder="Enter salary"
            />
          </label>

          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-light-text-secondary dark:text-dark-text-secondary">Savings %</span>
            <input
              type="number"
              data-testid="budget-savings-percentage-input"
              min="0"
              max="99.99"
              step="0.01"
              value={form.savingsPercentage ?? ""}
              onChange={(event) => updateFormField("savingsPercentage", event.target.value)}
              className="w-full rounded-xl border border-light-border-default dark:border-dark-border-default bg-light-surface-primary dark:bg-dark-surface-secondary px-3 py-2 text-sm text-light-text-primary dark:text-dark-text-primary focus:border-blue-500 focus:outline-none"
            />
          </label>

          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-light-text-secondary dark:text-dark-text-secondary">Currency</span>
            <select
              value={form.currency ?? "LKR"}
              onChange={(event) => updateFormField("currency", event.target.value)}
              className="w-full rounded-xl border border-light-border-default dark:border-dark-border-default bg-light-surface-primary dark:bg-dark-surface-secondary px-3 py-2 text-sm text-light-text-primary dark:text-dark-text-primary focus:border-blue-500 focus:outline-none"
            >
              {Object.keys(CURRENCIES).map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-light-text-secondary dark:text-dark-text-secondary">Budget Period (Days)</span>
            <input
              type="number"
              data-testid="budget-period-days-input"
              min="1"
              max="365"
              step="1"
              value={form.budgetPeriodDays ?? "30"}
              onChange={(event) => handleBudgetPeriodDaysInputChange(event.target.value)}
              className="w-full rounded-xl border border-light-border-default dark:border-dark-border-default bg-light-surface-primary dark:bg-dark-surface-secondary px-3 py-2 text-sm text-light-text-primary dark:text-dark-text-primary focus:border-blue-500 focus:outline-none"
              placeholder="e.g. 30"
            />
          </label>

          <div className="flex items-end">
            <div className="w-full space-y-2">
              <button
                type="submit"
                data-testid="budget-save-settings-button"
                disabled={updateSettingsMutation.isPending}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {isPlanRoute ? "Save Changes" : "Save Settings"}
              </button>

              <button
                type="button"
                onClick={handleSaveAndCreateAnother}
                disabled={updateSettingsMutation.isPending}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-light-border-default dark:border-dark-border-default bg-light-surface-primary dark:bg-dark-surface-secondary px-4 py-2.5 text-sm font-semibold text-light-text-primary dark:text-dark-text-primary transition hover:bg-light-bg-accent dark:hover:bg-dark-surface-primary disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPlanRoute ? "Save as New Plan" : "Save and Create Another"}
              </button>
            </div>
          </div>
        </form>

        <div className="mt-4 rounded-xl border border-light-border-default dark:border-dark-border-default bg-light-surface-primary dark:bg-dark-surface-secondary p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-light-text-secondary dark:text-dark-text-secondary">
                Budget Period Range
              </p>
              <p className="mt-1 text-xs text-light-text-secondary dark:text-dark-text-secondary">
                Pick the exact start and end dates for your budget window. Only expenses inside this range are considered.
              </p>
            </div>
            <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-light-text-secondary dark:text-dark-text-secondary">
              From
              <input
                type="date"
                value={form.budgetPeriodStartDate || ""}
                onChange={(event) => updateBudgetPeriodDates(event.target.value, form.budgetPeriodEndDate || "")}
                className="mt-1 w-full rounded-lg border border-light-border-default dark:border-dark-border-default bg-light-surface-secondary dark:bg-dark-surface-primary px-2.5 py-1.5 text-sm text-light-text-primary dark:text-dark-text-primary"
              />
            </label>
            <label className="text-[11px] font-semibold uppercase tracking-wide text-light-text-secondary dark:text-dark-text-secondary">
              To
              <input
                type="date"
                value={form.budgetPeriodEndDate || ""}
                onChange={(event) => updateBudgetPeriodDates(form.budgetPeriodStartDate || "", event.target.value)}
                className="mt-1 w-full rounded-lg border border-light-border-default dark:border-dark-border-default bg-light-surface-secondary dark:bg-dark-surface-primary px-2.5 py-1.5 text-sm text-light-text-primary dark:text-dark-text-primary"
              />
            </label>
          </div>

          <p className="mt-3 text-xs text-light-text-secondary dark:text-dark-text-secondary">
            Active budget period length: <span className="font-semibold text-light-text-primary dark:text-dark-text-primary">{selectedBudgetPeriodDays} day(s)</span>
          </p>
        </div>

        <div className="mt-4 rounded-xl border border-light-border-default dark:border-dark-border-default bg-light-surface-primary dark:bg-dark-surface-secondary p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-light-text-secondary dark:text-dark-text-secondary">
            New Budget Expense Start
          </p>
          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
            {EXPENSE_START_MODE_OPTIONS.map((option) => {
              const isActive = selectedExpenseStartMode === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => updateFormField("expenseStartMode", option.value)}
                  className={`rounded-xl border px-3 py-3 text-left transition ${
                    isActive
                      ? "border-blue-500 bg-blue-50/80 dark:border-blue-400 dark:bg-blue-500/15"
                      : "border-light-border-default bg-light-surface-secondary hover:bg-light-bg-accent dark:border-dark-border-default dark:bg-dark-surface-primary dark:hover:bg-dark-surface-secondary"
                  }`}
                >
                  <p className="text-sm font-semibold text-light-text-primary dark:text-dark-text-primary">{option.label}</p>
                  <p className="mt-1 text-xs text-light-text-secondary dark:text-dark-text-secondary">{option.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-light-border-default dark:border-dark-border-default bg-light-surface-primary dark:bg-dark-surface-secondary p-3">
            <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">Preview Savings Amount</p>
            <p className="mt-1 text-lg font-semibold text-light-text-primary dark:text-dark-text-primary">
              {formatAmount(savingsAmountPreview, selectedCurrency)}
            </p>
          </div>
          <div className="rounded-xl border border-light-border-default dark:border-dark-border-default bg-light-surface-primary dark:bg-dark-surface-secondary p-3">
            <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">Preview Usable Budget</p>
            <p className="mt-1 text-lg font-semibold text-light-text-primary dark:text-dark-text-primary">
              {formatAmount(usableBudgetPreview, selectedCurrency)}
            </p>
          </div>
          <div className="rounded-xl border border-light-border-default dark:border-dark-border-default bg-light-surface-primary dark:bg-dark-surface-secondary p-3">
            <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">Savings Lock Rule</p>
            <p className="mt-1 text-sm font-semibold text-light-text-primary dark:text-dark-text-primary">Locked and never spendable</p>
          </div>
        </div>

        {!isPlanRoute && (
        <div className="mt-4 rounded-xl border border-light-border-default dark:border-dark-border-default bg-light-surface-primary dark:bg-dark-surface-secondary p-3">
          <button
            type="button"
            onClick={() => setShowSavedProfiles((previous) => !previous)}
            className="flex w-full items-center justify-between text-left"
          >
            <span className="text-sm font-semibold text-light-text-primary dark:text-dark-text-primary">
              Saved Plans ({savedProfiles.length})
            </span>
            <ChevronDown className={`h-4 w-4 text-light-text-secondary transition-transform dark:text-dark-text-secondary ${showSavedProfiles ? "rotate-180" : ""}`} />
          </button>

          {showSavedProfiles && (
            <div className="mt-3 space-y-2">
              {savedProfiles.length === 0 && (
                <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                  No saved plans yet. Use Save and Create Another to keep this budget and start a new one.
                </p>
              )}

              {savedProfiles.map((profile) => (
                <div
                  key={profile.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleOpenSavedProfile(profile)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handleOpenSavedProfile(profile);
                    }
                  }}
                  className="flex cursor-pointer flex-wrap items-center justify-between gap-2 rounded-lg border border-light-border-default px-3 py-2 transition hover:bg-light-bg-accent/60 dark:border-dark-border-default dark:hover:bg-dark-surface-primary"
                >
                  <div>
                    <p className="text-sm font-medium text-light-text-primary dark:text-dark-text-primary">{profile.name}</p>
                    <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                      {formatAmount(profile.monthlySalary, profile.currency)} | {profile.savingsPercentage}% savings | {Number(profile.budgetPeriodDays) || 30} day period | {profile.budgetPeriodStartDate && profile.budgetPeriodEndDate ? `${profile.budgetPeriodStartDate} to ${profile.budgetPeriodEndDate}` : "Range not set"} | {profile.currency}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleOpenSavedProfile(profile);
                      }}
                      className="rounded-md border border-light-border-default dark:border-dark-border-default px-2.5 py-1.5 text-xs font-semibold text-light-text-primary transition hover:bg-light-bg-accent dark:text-dark-text-primary dark:hover:bg-dark-surface-primary"
                    >
                      Open
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleDeleteSavedProfile(profile.id);
                      }}
                      className="rounded-md border border-danger-200 px-2.5 py-1.5 text-xs font-semibold text-danger-700 transition hover:bg-danger-50 dark:border-danger-500/40 dark:text-danger-300 dark:hover:bg-danger-500/10"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        )}
      </section>

      {shouldShowProfessionalPlan && (
        <section className={`rounded-2xl border border-light-border-default dark:border-dark-border-strong bg-light-surface-secondary dark:bg-dark-surface-primary p-6 shadow-premium dark:shadow-card-dark transition ${editingBudget ? "blur-[2px]" : ""}`}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-light-text-primary dark:text-dark-text-primary">Professional Budget Plan</h2>
            <button
              type="button"
              onClick={() => {
                const monthlySalary = toNumber(form.monthlySalary);
                const savingsPercentage = toPercent(form.savingsPercentage);

                if (!Number.isFinite(monthlySalary) || monthlySalary <= 0) {
                  toast.error("Add monthly salary to generate your professional category plan");
                  return;
                }

                void syncProfessionalCategoryBudgets({
                  monthlySalary,
                  savingsPercentage,
                  expenseStartMode: selectedExpenseStartMode,
                });
              }}
              disabled={isSyncingProfessionalPlan}
              className="inline-flex items-center gap-2 rounded-xl border border-light-border-default dark:border-dark-border-default bg-light-surface-primary dark:bg-dark-surface-secondary px-3 py-2 text-sm font-semibold text-light-text-primary transition hover:bg-light-bg-accent dark:text-dark-text-primary dark:hover:bg-dark-surface-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSyncingProfessionalPlan ? "Syncing plan..." : "Regenerate Smart Plan"}
            </button>
          </div>

          {isCategoryBudgetsLoading ? (
            <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">Loading category budgets...</p>
          ) : categoryBudgets.length === 0 ? (
            <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
              No category budgets yet. Save your budget settings to auto-generate a transaction-aware spending plan.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-light-border-default dark:border-dark-border-default">
                    <th className="px-3 py-2 text-left text-light-text-secondary dark:text-dark-text-secondary">Category</th>
                    <th className="px-3 py-2 text-right text-light-text-secondary dark:text-dark-text-secondary">Budget</th>
                    <th className="px-3 py-2 text-right text-light-text-secondary dark:text-dark-text-secondary">Spent</th>
                    <th className="px-3 py-2 text-right text-light-text-secondary dark:text-dark-text-secondary">Remaining</th>
                    <th className="px-3 py-2 text-right text-light-text-secondary dark:text-dark-text-secondary">Daily Target</th>
                    <th className="px-3 py-2 text-right text-light-text-secondary dark:text-dark-text-secondary">Weekly Target</th>
                    <th className="px-3 py-2 text-right text-light-text-secondary dark:text-dark-text-secondary">Used</th>
                    <th className="px-3 py-2 text-right text-light-text-secondary dark:text-dark-text-secondary">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryBudgets.map((budget) => {
                    const usage = Math.max(0, Number(budget.percentage || 0));
                    const pacing = computeSpendPacing(budget.remaining, budget.periodEnd);
                    const usageClassName =
                      usage >= 100
                        ? "text-danger-600 dark:text-danger-400"
                        : usage >= 85
                        ? "text-warning-600 dark:text-warning-400"
                        : "text-success-600 dark:text-success-400";

                    return (
                      <tr
                        key={budget._id}
                        id={`budget-row-${normalizeBudgetCategoryName(budget.category)}`}
                        className="border-b border-light-border-subtle dark:border-dark-border-default/60 transition-colors duration-500"
                      >
                        <td className="px-3 py-2 font-medium text-light-text-primary dark:text-dark-text-primary">{budget.category}</td>
                        <td className="px-3 py-2 text-right text-light-text-primary dark:text-dark-text-primary">
                          {formatAmount(budget.limit, selectedCurrency)}
                        </td>
                        <td className="px-3 py-2 text-right text-light-text-primary dark:text-dark-text-primary">
                          {formatAmount(budget.spent, selectedCurrency)}
                        </td>
                        <td className="px-3 py-2 text-right text-light-text-primary dark:text-dark-text-primary">
                          {formatAmount(budget.remaining, selectedCurrency)}
                        </td>
                        <td className="px-3 py-2 text-right text-light-text-primary dark:text-dark-text-primary">
                          {formatAmount(pacing.dailyTarget, selectedCurrency)}
                        </td>
                        <td className="px-3 py-2 text-right text-light-text-primary dark:text-dark-text-primary">
                          {formatAmount(pacing.weeklyTarget, selectedCurrency)}
                        </td>
                        <td className={`px-3 py-2 text-right font-semibold ${usageClassName}`}>{usage.toFixed(0)}%</td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => openBudgetEditor(budget)}
                            className="inline-flex items-center gap-1 rounded-md border border-light-border-default dark:border-dark-border-default px-2 py-1 text-xs font-semibold text-light-text-primary transition hover:bg-light-bg-accent dark:text-dark-text-primary dark:hover:bg-dark-surface-primary"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {(isPlanRoute || showDashboardMetrics) && statusError && !normalizedStatus && (
        <section className="rounded-2xl border border-warning-300 dark:border-warning-500/30 bg-warning-50 dark:bg-warning-900/20 p-4">
          <p className="text-sm font-medium text-warning-800 dark:text-warning-200">{statusError.message}</p>
          <p className="mt-1 text-sm text-warning-700 dark:text-warning-300">
            Set monthly salary and savings percentage above to activate adaptive budgeting.
          </p>
        </section>
      )}

      {normalizedStatus && (
        <>
          <section className="grid grid-cols-1 gap-4 lg:grid-cols-4">
            <article className={`rounded-2xl border p-4 ${statusStyle.container}`}>
              <div className="flex items-center gap-2">
                <StatusIcon className={`h-5 w-5 ${statusStyle.text}`} />
                <p className={`text-sm font-semibold ${statusStyle.text}`}>{statusStyle.title}</p>
              </div>
              <p className="mt-2 text-2xl font-bold text-light-text-primary dark:text-dark-text-primary">{normalizedStatus.status}</p>
              <p className="mt-1 text-xs text-light-text-secondary dark:text-dark-text-secondary">
                {normalizedStatus.daysLeft} day(s) left in this {normalizedStatus.periodDays || selectedBudgetPeriodDays}-day period
              </p>
            </article>

            <article className="rounded-2xl border border-light-border-default dark:border-dark-border-strong bg-light-surface-secondary dark:bg-dark-surface-primary p-4">
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">Remaining</p>
              </div>
              <p className="mt-2 text-2xl font-bold text-light-text-primary dark:text-dark-text-primary">
                {formatAmount(normalizedStatus.remaining, selectedCurrency)}
              </p>
              <p className="mt-1 text-xs text-light-text-secondary dark:text-dark-text-secondary">
                From usable {formatAmount(normalizedStatus.usableBudget, selectedCurrency)}
              </p>
            </article>

            <article className="rounded-2xl border border-light-border-default dark:border-dark-border-strong bg-light-surface-secondary dark:bg-dark-surface-primary p-4">
              <div className="flex items-center gap-2">
                <Clock3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">Daily Limit</p>
              </div>
              <p className="mt-2 text-2xl font-bold text-light-text-primary dark:text-dark-text-primary">
                {formatAmount(normalizedStatus.dailyLimit, selectedCurrency)}
              </p>
              <p className="mt-1 text-xs text-light-text-secondary dark:text-dark-text-secondary">Strict cap for the remaining period</p>
            </article>

            <article className="rounded-2xl border border-light-border-default dark:border-dark-border-strong bg-light-surface-secondary dark:bg-dark-surface-primary p-4">
              <div className="flex items-center gap-2">
                <LineChart className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">Weekly Limit</p>
              </div>
              <p className="mt-2 text-2xl font-bold text-light-text-primary dark:text-dark-text-primary">
                {formatAmount(normalizedStatus.weeklyLimit, selectedCurrency)}
              </p>
              <p className="mt-1 text-xs text-light-text-secondary dark:text-dark-text-secondary">Recomputed after each refresh</p>
            </article>
          </section>

          <section className="rounded-2xl border border-light-border-default dark:border-dark-border-strong bg-light-surface-secondary dark:bg-dark-surface-primary p-6 shadow-premium dark:shadow-card-dark">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-light-text-primary dark:text-dark-text-primary">Budget Burn Curve</h2>
              <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                Spent {formatAmount(normalizedStatus.spent, selectedCurrency)} vs expected {formatAmount(normalizedStatus.expectedSpend, selectedCurrency)}
              </p>
            </div>

            <div className="h-3 w-full overflow-hidden rounded-full bg-light-bg-accent dark:bg-dark-surface-secondary">
              <div
                className={`h-full rounded-full ${normalizedStatus.status === "CRISIS" ? "bg-danger-500" : normalizedStatus.status === "WARNING" ? "bg-warning-500" : "bg-success-500"}`}
                style={{ width: `${spentPercentage}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-light-text-secondary dark:text-dark-text-secondary">{spentPercentage.toFixed(1)}% of usable budget consumed</p>
            <p className="mt-1 text-xs text-light-text-secondary dark:text-dark-text-secondary">{expenseWindowLabel}</p>
          </section>

          {normalizedStatus.mode === "CRISIS" && (
            <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <article className="rounded-2xl border border-danger-200 dark:border-danger-500/30 bg-danger-50 dark:bg-danger-900/20 p-4 lg:col-span-2">
                <div className="flex items-center gap-2">
                  <Flame className="h-5 w-5 text-danger-600 dark:text-danger-400" />
                  <h3 className="text-lg font-semibold text-danger-700 dark:text-danger-300">Crisis Actions</h3>
                </div>
                <ul className="mt-3 space-y-2 text-sm text-danger-800 dark:text-danger-200">
                  {normalizedStatus.actions.map((action) => (
                    <li key={action}>• {action}</li>
                  ))}
                </ul>
              </article>

              <article className="rounded-2xl border border-danger-200 dark:border-danger-500/30 bg-light-surface-secondary dark:bg-dark-surface-primary p-4">
                <h4 className="text-sm font-semibold text-light-text-primary dark:text-dark-text-primary">Blocked Categories</h4>
                <div className="mt-3 flex flex-wrap gap-2">
                  {normalizedStatus.blockedCategories.length === 0 && (
                    <span className="text-sm text-light-text-secondary dark:text-dark-text-secondary">None</span>
                  )}
                  {normalizedStatus.blockedCategories.map((category) => (
                    <span key={category} className="rounded-full bg-danger-100 px-2.5 py-1 text-xs font-medium text-danger-700 dark:bg-danger-500/20 dark:text-danger-300">
                      {category}
                    </span>
                  ))}
                </div>
                <h4 className="mt-4 text-sm font-semibold text-light-text-primary dark:text-dark-text-primary">Allowed Categories</h4>
                <div className="mt-2 flex flex-wrap gap-2">
                  {normalizedStatus.allowedCategories.length === 0 && (
                    <span className="text-sm text-light-text-secondary dark:text-dark-text-secondary">None</span>
                  )}
                  {normalizedStatus.allowedCategories.map((category) => (
                    <span key={category} className="rounded-full bg-success-100 px-2.5 py-1 text-xs font-medium text-success-700 dark:bg-success-500/20 dark:text-success-300">
                      {category}
                    </span>
                  ))}
                </div>
              </article>
            </section>
          )}

          {normalizedStatus.mode === "WARNING" && (
            <section className="rounded-2xl border border-warning-200 dark:border-warning-500/30 bg-warning-50 dark:bg-warning-900/20 p-4">
              <h3 className="text-lg font-semibold text-warning-800 dark:text-warning-200">Warning Recommendations</h3>
              <ul className="mt-3 space-y-2 text-sm text-warning-800 dark:text-warning-200">
                {normalizedStatus.recommendations.map((recommendation) => (
                  <li key={recommendation}>• {recommendation}</li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {(isPlanRoute || showDashboardMetrics) && (
      <section className="rounded-2xl border border-light-border-default dark:border-dark-border-strong bg-light-surface-secondary dark:bg-dark-surface-primary p-6 shadow-premium dark:shadow-card-dark">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-light-text-primary dark:text-dark-text-primary">Historical Analysis</h2>
          {(isAnalysisLoading || isAnalysisFetching) && (
            <span className="text-xs text-light-text-secondary dark:text-dark-text-secondary">Refreshing analysis...</span>
          )}
        </div>

        {categoryBreakdown.length === 0 ? (
          <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
            Add expense transactions to unlock category-level leak detection and survival budget optimization.
          </p>
        ) : (
          <div className="space-y-6">
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-light-border-default dark:border-dark-border-default">
                    <th className="px-3 py-2 text-left text-light-text-secondary dark:text-dark-text-secondary">Category</th>
                    <th className="px-3 py-2 text-left text-light-text-secondary dark:text-dark-text-secondary">Type</th>
                    <th className="px-3 py-2 text-right text-light-text-secondary dark:text-dark-text-secondary">Current Month</th>
                    <th className="px-3 py-2 text-right text-light-text-secondary dark:text-dark-text-secondary">Avg Monthly</th>
                    <th className="px-3 py-2 text-right text-light-text-secondary dark:text-dark-text-secondary">Leak</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryBreakdown.map((item) => (
                    <tr key={item.category} className="border-b border-light-border-subtle dark:border-dark-border-default/60">
                      <td className="px-3 py-2 font-medium text-light-text-primary dark:text-dark-text-primary">{item.category}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.type === "ESSENTIAL" ? "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300" : "bg-warning-100 text-warning-700 dark:bg-warning-500/20 dark:text-warning-300"}`}
                        >
                          {item.type}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right text-light-text-primary dark:text-dark-text-primary">{formatAmount(item.currentMonthSpent, selectedCurrency)}</td>
                      <td className="px-3 py-2 text-right text-light-text-primary dark:text-dark-text-primary">{formatAmount(item.averageMonthly, selectedCurrency)}</td>
                      <td className="px-3 py-2 text-right">
                        {item.isLeak ? (
                          <span className="text-danger-600 dark:text-danger-400">Yes</span>
                        ) : (
                          <span className="text-success-600 dark:text-success-400">No</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <article className="rounded-xl border border-light-border-default dark:border-dark-border-default bg-light-surface-primary dark:bg-dark-surface-secondary p-4">
                <h3 className="text-sm font-semibold text-light-text-primary dark:text-dark-text-primary">Average Monthly Spend</h3>
                <p className="mt-2 text-2xl font-bold text-light-text-primary dark:text-dark-text-primary">
                  {formatAmount(historyInsights.avgMonthlySpend || 0, selectedCurrency)}
                </p>
              </article>

              <article className="rounded-xl border border-light-border-default dark:border-dark-border-default bg-light-surface-primary dark:bg-dark-surface-secondary p-4 lg:col-span-2">
                <h3 className="text-sm font-semibold text-light-text-primary dark:text-dark-text-primary">Top Spending Categories</h3>
                <div className="mt-3 space-y-2">
                  {topSpendingCategories.length === 0 && (
                    <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">No history yet</p>
                  )}
                  {topSpendingCategories.map((item) => (
                    <div key={item.category} className="flex items-center justify-between text-sm">
                      <span className="text-light-text-primary dark:text-dark-text-primary">{item.category}</span>
                      <span className="font-semibold text-light-text-primary dark:text-dark-text-primary">{formatAmount(item.total, selectedCurrency)}</span>
                    </div>
                  ))}
                </div>
              </article>
            </div>

            <article className="rounded-xl border border-light-border-default dark:border-dark-border-default bg-light-surface-primary dark:bg-dark-surface-secondary p-4">
              <div className="flex items-center gap-2">
                <Gauge className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <h3 className="text-sm font-semibold text-light-text-primary dark:text-dark-text-primary">Spending Runway Forecast</h3>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-lg border border-light-border-default dark:border-dark-border-default bg-light-surface-secondary/80 dark:bg-dark-surface-primary/80 p-3">
                  <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">Current Daily Spend</p>
                  <p className="mt-1 text-base font-semibold text-light-text-primary dark:text-dark-text-primary">
                    {formatAmount(runwayForecast.currentDailySpend, selectedCurrency)}
                  </p>
                </div>

                <div className="rounded-lg border border-light-border-default dark:border-dark-border-default bg-light-surface-secondary/80 dark:bg-dark-surface-primary/80 p-3">
                  <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">Projected Month Spend</p>
                  <p className="mt-1 text-base font-semibold text-light-text-primary dark:text-dark-text-primary">
                    {formatAmount(runwayForecast.projectedMonthSpend, selectedCurrency)}
                  </p>
                </div>

                <div className="rounded-lg border border-light-border-default dark:border-dark-border-default bg-light-surface-secondary/80 dark:bg-dark-surface-primary/80 p-3">
                  <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">Projected End Balance</p>
                  <p className={`mt-1 text-base font-semibold ${runwayForecast.projectedEndBalance < 0 ? "text-danger-600 dark:text-danger-400" : "text-success-600 dark:text-success-400"}`}>
                    {formatAmount(runwayForecast.projectedEndBalance, selectedCurrency)}
                  </p>
                  <p className="mt-1 text-xs text-light-text-secondary dark:text-dark-text-secondary">
                    {runwayForecast.runwayDays > 0
                      ? `Runway: ${Math.max(0, runwayForecast.runwayDays).toFixed(1)} day(s) at current pace`
                      : "Runway data appears after spending activity"}
                  </p>
                </div>
              </div>
            </article>
          </div>
        )}
      </section>
      )}

      {editingBudget && typeof document !== "undefined" && createPortal(
        <div
          className={`modal-overlay fixed inset-0 z-[9999] flex items-center justify-center bg-black/45 px-4 transition-opacity duration-200 ease-out ${isEditBudgetModalVisible ? "opacity-100" : "opacity-0"}`}
          onMouseDown={closeBudgetEditor}
        >
          <div
            className={`modal-container w-full max-w-[400px] rounded-[14px] border border-slate-700 bg-[#111827] p-6 shadow-[0_20px_40px_rgba(0,0,0,0.4)] transition-all duration-200 ease-out ${isEditBudgetModalVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-light-text-primary dark:text-dark-text-primary">Edit Budget Amount</h3>
            <p className="mt-1 text-xs text-light-text-secondary dark:text-dark-text-secondary">{editingBudget.category}</p>

            <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-light-text-secondary dark:text-dark-text-secondary">
              New Amount
              <input
                type="number"
                min="0"
                step="1"
                value={editBudgetLimitValue}
                onChange={(event) => {
                  setEditBudgetLimitValue(event.target.value);
                  if (editBudgetError) {
                    setEditBudgetError("");
                  }
                }}
                className="mt-1.5 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/25"
              />
            </label>

            {needsFundingSourceSelection && normalizeBudgetCategoryName(editingBudget.category) !== OTHER_EXPENSE_CATEGORY && (
              <div className="mt-3 rounded-lg border border-warning-500/40 bg-warning-500/10 p-3">
                <p className="text-xs font-semibold text-warning-300">
                  Other Expense is not enough. Select a category to deduct {formatAmount(requiredFundingAmount, selectedCurrency)}.
                </p>

                <label className="mt-2 block text-[11px] font-semibold uppercase tracking-wide text-warning-200">
                  Deduct From Category
                  <select
                    value={selectedFundingCategoryId}
                    onChange={(event) => {
                      setSelectedFundingCategoryId(event.target.value);
                      if (editBudgetError) {
                        setEditBudgetError("");
                      }
                    }}
                    className="mt-1.5 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/25"
                  >
                    <option value="">Select category</option>
                    {fundingSourceOptions.map((entry) => (
                      <option key={entry._id} value={entry._id}>
                        {entry.category} ({formatAmount(entry.limit, selectedCurrency)})
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}

            {editBudgetError && (
              <p className="mt-2 text-xs font-medium text-danger-400">{editBudgetError}</p>
            )}

            <p className="mt-2 text-xs text-light-text-secondary dark:text-dark-text-secondary">
              {normalizeBudgetCategoryName(editingBudget.category) === OTHER_EXPENSE_CATEGORY
                ? "This directly updates Other Expense."
                : "Any increase/decrease here is automatically balanced against Other Expense."}
            </p>

            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeBudgetEditor}
                disabled={isUpdatingBudgetLimit}
                className="rounded-lg border border-light-border-default dark:border-dark-border-default px-3 py-1.5 text-xs font-semibold text-light-text-primary transition hover:bg-light-bg-accent disabled:cursor-not-allowed disabled:opacity-60 dark:text-dark-text-primary dark:hover:bg-dark-surface-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpdateCategoryBudget}
                disabled={isUpdatingBudgetLimit}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isUpdatingBudgetLimit ? "Updating..." : "Update"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
