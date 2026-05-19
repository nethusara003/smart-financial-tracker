import jwt from "jsonwebtoken";
import { generateGroqReply } from "../Services/groq.service.js";
import { getFullUserContext } from "../Services/context.service.js";
import { buildPrompt } from "../Services/promptBuilder.js";

const MAX_HISTORY_MESSAGES = 5;
const MAX_HISTORY_CONTENT_CHARS = 240;
const MAX_USER_MESSAGE_CHARS = 500;
const LIMIT_COOLDOWN_DEFAULT_MS = Number(process.env.AI_LIMIT_COOLDOWN_MS || 15000);
const LIMIT_COOLDOWN_MAX_MS = Number(process.env.AI_LIMIT_COOLDOWN_MAX_MS || 120000);
const sessionHistoryStore = new Map();
const sessionUsageStore = new Map();
const sessionLimitStore = new Map();
const FALLBACK_LIMIT_REPLY =
  "I could not process that full request because it exceeded the AI model limits. Please ask a shorter question or start a new chat, and I will help step by step.";

const EMPTY_USAGE = Object.freeze({
  promptTokens: 0,
  completionTokens: 0,
  totalTokens: 0,
});

const createEmptyUsage = () => ({
  promptTokens: 0,
  completionTokens: 0,
  totalTokens: 0,
});

const clampNumber = (value, min, max) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return min;
  }

  return Math.min(max, Math.max(min, numeric));
};

const formatMoney = (value, currency = "USD") => {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) {
    return "0";
  }

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return amount.toFixed(2);
  }
};

const formatPercent = (value) => {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric)) {
    return "0.0%";
  }

  return `${numeric.toFixed(1)}%`;
};

const parseRetryAfterHeaderMs = (retryAfterValue) => {
  if (!retryAfterValue) {
    return null;
  }

  const normalized = String(retryAfterValue).trim();
  if (!normalized) {
    return null;
  }

  const asSeconds = Number(normalized);
  if (Number.isFinite(asSeconds) && asSeconds > 0) {
    return asSeconds * 1000;
  }

  const asDate = Date.parse(normalized);
  if (!Number.isNaN(asDate) && asDate > Date.now()) {
    return asDate - Date.now();
  }

  return null;
};

const parseRetryAfterMessageMs = (message) => {
  const normalized = String(message || "").toLowerCase();

  const durationMatch = normalized.match(/(?:retry|try again)(?:\s+after|\s+in)?\s+(\d+)\s*(ms|milliseconds|s|sec|secs|seconds|m|min|mins|minutes)?/i);
  if (!durationMatch) {
    return null;
  }

  const amount = Number(durationMatch[1]);
  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  const unit = String(durationMatch[2] || "s").toLowerCase();
  if (unit.startsWith("ms")) {
    return amount;
  }

  if (unit.startsWith("m")) {
    return amount * 60 * 1000;
  }

  return amount * 1000;
};

const resolveRetryAfterMs = (error) => {
  const fromError = Number(error?.retryAfterMs);
  if (Number.isFinite(fromError) && fromError > 0) {
    return fromError;
  }

  const fromStatusHeader = parseRetryAfterHeaderMs(
    error?.response?.headers?.["retry-after"] ||
      error?.response?.headers?.["Retry-After"] ||
      error?.retryAfter
  );

  if (fromStatusHeader && fromStatusHeader > 0) {
    return fromStatusHeader;
  }

  const fromMessage = parseRetryAfterMessageMs(error?.message);
  if (fromMessage && fromMessage > 0) {
    return fromMessage;
  }

  return LIMIT_COOLDOWN_DEFAULT_MS;
};

const setSessionLimitCooldown = (sessionId, retryAfterMs, reason) => {
  const normalizedRetryMs = clampNumber(
    retryAfterMs,
    1000,
    Math.max(1000, LIMIT_COOLDOWN_MAX_MS)
  );

  if (!sessionId) {
    return {
      retryAfterMs: normalizedRetryMs,
      until: Date.now() + normalizedRetryMs,
    };
  }

  const until = Date.now() + normalizedRetryMs;
  const previous = sessionLimitStore.get(sessionId) || {
    triggerCount: 0,
  };

  const state = {
    until,
    retryAfterMs: normalizedRetryMs,
    triggerCount: previous.triggerCount + 1,
    reason: String(reason || "").slice(0, 200),
  };

  sessionLimitStore.set(sessionId, state);
  return state;
};

const getActiveSessionCooldownMs = (sessionId) => {
  if (!sessionId || !sessionLimitStore.has(sessionId)) {
    return 0;
  }

  const state = sessionLimitStore.get(sessionId);
  const remaining = Number(state?.until || 0) - Date.now();

  if (!Number.isFinite(remaining) || remaining <= 0) {
    sessionLimitStore.delete(sessionId);
    return 0;
  }

  return remaining;
};

const clearSessionLimitCooldown = (sessionId) => {
  if (sessionId) {
    sessionLimitStore.delete(sessionId);
  }
};

const getSpendingOverview = (context, message = "") => {
  const normalized = String(message).toLowerCase();

  if (normalized.includes("all time") || normalized.includes("all-time") || normalized.includes("throughout") || normalized.includes("whole time")) {
    const totalIncome = Number(context?.summary?.income || 0);
    const totalExpenses = Number(context?.summary?.expenses || 0);
    const totalSavings = Number(context?.summary?.savings || totalIncome - totalExpenses);
    return {
      income: totalIncome,
      expenses: totalExpenses,
      savings: totalSavings,
      periodLabel: "throughout all time",
    };
  }

  if (normalized.includes("this year") || normalized.includes("year alone") || normalized.includes("of the year") || normalized.includes("of this year")) {
    const yearlyIncome = Number(context?.yearlySummary?.income || 0);
    const yearlyExpenses = Number(context?.yearlySummary?.expenses || 0);
    const yearlySavings = Number(context?.yearlySummary?.savings || yearlyIncome - yearlyExpenses);
    return {
      income: yearlyIncome,
      expenses: yearlyExpenses,
      savings: yearlySavings,
      periodLabel: "this year alone",
    };
  }

  if (normalized.includes("7 days") || normalized.includes("week")) {
    const weeklyIncome = Number(context?.weeklySummary?.income || 0);
    const weeklyExpenses = Number(context?.weeklySummary?.expenses || 0);
    const weeklySavings = Number(context?.weeklySummary?.savings || weeklyIncome - weeklyExpenses);
    return {
      income: weeklyIncome,
      expenses: weeklyExpenses,
      savings: weeklySavings,
      periodLabel: "this week",
    };
  }

  // Default behavior
  const monthlyIncome = Number(context?.monthlySummary?.income || 0);
  const monthlyExpenses = Number(context?.monthlySummary?.expenses || 0);
  const monthlySavings = Number(
    context?.monthlySummary?.savings || monthlyIncome - monthlyExpenses
  );

  if (monthlyExpenses > 0 || monthlyIncome > 0) {
    return {
      income: monthlyIncome,
      expenses: monthlyExpenses,
      savings: monthlySavings,
      periodLabel: "this month",
    };
  }

  const totalIncome = Number(context?.summary?.income || 0);
  const totalExpenses = Number(context?.summary?.expenses || 0);
  const totalSavings = Number(context?.summary?.savings || totalIncome - totalExpenses);

  return {
    income: totalIncome,
    expenses: totalExpenses,
    savings: totalSavings,
    periodLabel: "in your available records",
  };
};

const getTimeframeLabel = (message) => {
  const normalized = String(message || "").toLowerCase();

  if (normalized.includes("last month")) {
    return "last month";
  }

  if (normalized.includes("this month")) {
    return "this month";
  }

  if (normalized.includes("recent") || normalized.includes("latest")) {
    return "recently";
  }

  return null;
};

const buildNaturalLeadIn = ({ message, intent }) => {
  const timeframe = getTimeframeLabel(message);

  if (intent === "expenses") {
    return timeframe ? `Looking at ${timeframe}, ` : "Looking at your spending, ";
  }

  if (intent === "summary") {
    return timeframe ? `Here’s a quick view of ${timeframe}: ` : "Here’s a quick view: ";
  }

  return timeframe ? `For ${timeframe}, ` : "";
};

const buildWorstSpendingHabitReply = (context, message = "") => {
  const currency = context?.preferences?.currency || "USD";
  const overview = getSpendingOverview(context, message);
  const topCategory = context?.transactions?.topSpendingCategories?.[0];

  if (!topCategory) {
    return "I can’t identify your worst spending habit yet because there isn’t enough expense history in your records.";
  }

  const topAmount = Number(topCategory?.amount || 0);
  const totalExpenses = Math.max(0, Number(overview.expenses || 0));
  const share = totalExpenses > 0 ? (topAmount / totalExpenses) * 100 : 0;

  const habits = [
    `Your worst spending habit is ${topCategory.category || "your top category"}, at ${formatMoney(topAmount, currency)} ${overview.periodLabel}. That’s about ${formatPercent(share)} of tracked spending.`,
    `Your biggest spending pattern is ${topCategory.category || "your top category"}, at ${formatMoney(topAmount, currency)} ${overview.periodLabel}. That’s about ${formatPercent(share)} of tracked spending.`,
    `The category that stands out most as your worst spending habit is ${topCategory.category || "your top category"} with ${formatMoney(topAmount, currency)} ${overview.periodLabel}. It makes up roughly ${formatPercent(share)} of your spending.`,
  ];
  const selected = habits[Math.abs(String(topCategory.category || "").length) % habits.length];

  return `${selected} In short, your worst spending habit is ${topCategory.category || "this category"}. A practical next step is to set a tighter cap for it and review the top 3 transactions in it.`;
};

const getDeterministicFinanceReply = ({ message, intent, context }) => {
  const normalized = String(message || "").toLowerCase();
  const currency = context?.preferences?.currency || "USD";
  const overview = getSpendingOverview(context, message);
  const topCategory = context?.transactions?.topSpendingCategories?.[0];
  const leadIn = buildNaturalLeadIn({ message, intent });

  const asksWorstHabit =
    /worst\s+spending\s+hab{1,2}it/.test(normalized) ||
    /biggest\s+expense/.test(normalized) ||
    /top\s+spending/.test(normalized) ||
    /overspending/.test(normalized);

  if (asksWorstHabit || intent === "expenses") {
    if (asksWorstHabit) {
      return `${leadIn}${buildWorstSpendingHabitReply(context, message)}`.trim();
    }

    if (/how\s+much.*spen|spent\s+.*month/.test(normalized)) {
      return `${leadIn}you spent ${formatMoney(overview.expenses, currency)} ${overview.periodLabel} and saved ${formatMoney(overview.savings, currency)}.`.trim();
    }
  }

  if (intent === "budgets" && /over\s+budget|budget/.test(normalized)) {
    const activeBudgets = Array.isArray(context?.budgets?.items)
      ? context.budgets.items
      : [];
    const overBudget = activeBudgets.filter(
      (budget) => Number(budget?.usage?.percent || 0) > 100
    );

    return `You have ${activeBudgets.length} active budgets and ${overBudget.length} currently over budget.`;
  }

  if (intent === "summary" && /summary|overview|report/.test(normalized)) {
    return `${leadIn}income ${formatMoney(overview.income, currency)}, expenses ${formatMoney(overview.expenses, currency)}, savings ${formatMoney(overview.savings, currency)}.${topCategory ? ` Top spend category is ${topCategory.category} (${formatMoney(topCategory.amount, currency)}).` : ""}`;
  }

  return null;
};

const buildDeterministicLimitReply = ({ intent, context, userMessage, cooldownMsRemaining }) => {
  const currency = context?.preferences?.currency || "USD";
  const overview = getSpendingOverview(context, userMessage);
  const topCategory = context?.transactions?.topSpendingCategories?.[0];
  const activeLoans = Number(context?.loans?.count || 0);
  const outstandingBalance = Number(context?.loans?.outstandingBalance || 0);
  const activeBudgets = Array.isArray(context?.budgets?.items)
    ? context.budgets.items
    : [];
  const overBudgetCount = activeBudgets.filter((budget) => Number(budget?.usage?.percent || 0) > 100).length;
  const goals = Array.isArray(context?.goals?.items) ? context.goals.items : [];
  const nearestGoal = goals[0];

  const cooldownLine =
    cooldownMsRemaining > 0
      ? `\n\nRetry window: about ${Math.ceil(cooldownMsRemaining / 1000)}s.`
      : "";

  if (intent === "expenses") {
    return `${FALLBACK_LIMIT_REPLY}${cooldownLine}\n\nQuick expenses snapshot: ${overview.periodLabel === "this month" ? "This month" : "In your available records"} you spent ${formatMoney(overview.expenses, currency)} and saved ${formatMoney(overview.savings, currency)}. Top spending category is ${topCategory?.category || "N/A"} at ${formatMoney(topCategory?.amount || 0, currency)}.`;
  }

  if (intent === "budgets") {
    return `${FALLBACK_LIMIT_REPLY}${cooldownLine}\n\nBudget snapshot: ${activeBudgets.length} active budgets tracked, with ${overBudgetCount} currently over limit. Ask for one category at a time for a tighter answer.`;
  }

  if (intent === "goals") {
    return `${FALLBACK_LIMIT_REPLY}${cooldownLine}\n\nGoals snapshot: ${goals.length} goals tracked. ${nearestGoal ? `Closest goal is ${nearestGoal.title || "your next goal"} at ${formatPercent(nearestGoal?.progress?.percentage)} complete.` : "No goals found yet."}`;
  }

  if (intent === "loans") {
    return `${FALLBACK_LIMIT_REPLY}${cooldownLine}\n\nLoan snapshot: ${activeLoans} active loans with outstanding balance ${formatMoney(outstandingBalance, currency)}.`;
  }

  if (intent === "summary") {
    return `${FALLBACK_LIMIT_REPLY}${cooldownLine}\n\nFinancial summary ${overview.periodLabel}: Income ${formatMoney(overview.income, currency)}, expenses ${formatMoney(overview.expenses, currency)}, savings ${formatMoney(overview.savings, currency)}.`;
  }

  return `${FALLBACK_LIMIT_REPLY}${cooldownLine}\n\nQuick summary ${overview.periodLabel}: Income ${formatMoney(overview.income, currency)}, expenses ${formatMoney(overview.expenses, currency)}, savings ${formatMoney(overview.savings, currency)}. Ask a shorter follow-up focused on one area.${userMessage ? ` Topic detected: "${String(userMessage).slice(0, 60)}".` : ""}`;
};

const INTENT_KEYWORDS = {
  summary: ["summary", "summery", "all time", "all-time", "overview", "report"],
  expenses: ["expense", "expenses", "spending", "overspending"],
  loans: ["loan", "loans", "emi", "interest", "outstanding"],
  budgets: ["budget", "budgets", "limit", "category budget"],
  goals: ["goal", "goals", "target", "progress", "deadline"],
};

const LIGHT_GREETING_MESSAGES = new Set([
  "hi",
  "hii",
  "hiii",
  "hello",
  "hey",
  "hey there",
  "hello there",
  "hi there",
  "good morning",
  "good afternoon",
  "good evening",
]);

const LIGHT_ACK_MESSAGES = new Set([
  "thanks",
  "thank you",
  "ok",
  "okay",
  "cool",
  "great",
  "nice",
]);

const normalizeUserId = (value) => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const getRequestUserId = (req, payloadUserId) => {
  const bodyUserId = normalizeUserId(payloadUserId);
  if (bodyUserId) {
    return bodyUserId;
  }

  const reqUserId = req?.user?._id || req?.user?.id;
  if (reqUserId) {
    return String(reqUserId);
  }

  const authHeader = req?.headers?.authorization;
  if (typeof authHeader !== "string" || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice(7).trim();
  if (!token || !process.env.JWT_SECRET) {
    return null;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const payload = decoded && typeof decoded === "object" ? decoded : null;
    const tokenUserId = payload?.id || payload?._id;

    return tokenUserId ? String(tokenUserId) : null;
  } catch {
    return null;
  }
};

const detectIntent = (message) => {
  const normalized = String(message || "").toLowerCase();

  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
    if (keywords.some((keyword) => normalized.includes(keyword))) {
      return intent;
    }
  }

  return "general";
};

const normalizeLightMessage = (message) => {
  return String(message || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const getLightweightReply = (message) => {
  const normalized = normalizeLightMessage(message);

  if (!normalized || normalized.length > 40) {
    return null;
  }

  if (LIGHT_GREETING_MESSAGES.has(normalized)) {
    return {
      intent: "greeting",
      reply: "Hi! How can I help with your finances today?",
    };
  }

  if (LIGHT_ACK_MESSAGES.has(normalized)) {
    return {
      intent: "general",
      reply: "Anytime. Tell me what you want to check next.",
    };
  }

  return null;
};

const normalizeHistory = (history) => {
  if (!Array.isArray(history)) {
    return [];
  }

  return history
    .filter((entry) => {
      if (!entry || typeof entry !== "object") {
        return false;
      }

      if (!("role" in entry) || !("content" in entry)) {
        return false;
      }

      return (
        (entry.role === "user" || entry.role === "assistant") &&
        typeof entry.content === "string" &&
        entry.content.trim().length > 0
      );
    })
    .map((entry) => ({
      role: entry.role,
      content: entry.content.trim().slice(0, MAX_HISTORY_CONTENT_CHARS),
    }));
};

const normalizeUserMessage = (message) => {
  const trimmed = String(message || "").trim();
  if (trimmed.length <= MAX_USER_MESSAGE_CHARS) {
    return trimmed;
  }

  return `${trimmed.slice(0, MAX_USER_MESSAGE_CHARS)}...`;
};

const getBaseHistory = ({ sessionId, history }) => {
  if (sessionId && sessionHistoryStore.has(sessionId)) {
    return sessionHistoryStore.get(sessionId).slice(-MAX_HISTORY_MESSAGES);
  }

  return normalizeHistory(history).slice(-MAX_HISTORY_MESSAGES);
};

const appendAndStoreHistory = ({ sessionId, baseHistory, userMessage, assistantReply }) => {
  const updatedHistory = [
    ...baseHistory,
    { role: "user", content: String(userMessage || "").slice(0, MAX_HISTORY_CONTENT_CHARS) },
    { role: "assistant", content: String(assistantReply || "").slice(0, MAX_HISTORY_CONTENT_CHARS) },
  ].slice(-MAX_HISTORY_MESSAGES);

  if (sessionId) {
    sessionHistoryStore.set(sessionId, updatedHistory);
  }

  return updatedHistory;
};

const isPromptLimitError = (error) => {
  const status = Number(error?.statusCode || 0);
  const message = String(error?.message || "").toLowerCase();

  if (status === 413 || status === 429) {
    return true;
  }

  return (
    message.includes("request too large") ||
    message.includes("tokens per minute") ||
    message.includes("model limits") ||
    message.includes("rate limit")
  );
};

const normalizeUsage = (usage) => {
  if (!usage || typeof usage !== "object") {
    return createEmptyUsage();
  }

  const promptTokens = Number.isFinite(Number(usage.promptTokens))
    ? Math.max(0, Number(usage.promptTokens))
    : Number.isFinite(Number(usage.prompt_tokens))
      ? Math.max(0, Number(usage.prompt_tokens))
      : 0;

  const completionTokens = Number.isFinite(Number(usage.completionTokens))
    ? Math.max(0, Number(usage.completionTokens))
    : Number.isFinite(Number(usage.completion_tokens))
      ? Math.max(0, Number(usage.completion_tokens))
      : 0;

  const totalTokens = Number.isFinite(Number(usage.totalTokens))
    ? Math.max(0, Number(usage.totalTokens))
    : Number.isFinite(Number(usage.total_tokens))
      ? Math.max(0, Number(usage.total_tokens))
      : promptTokens + completionTokens;

  return {
    promptTokens,
    completionTokens,
    totalTokens,
  };
};

const appendSessionUsage = (sessionId, usage) => {
  const normalizedUsage = normalizeUsage(usage);
  if (!sessionId) {
    return {
      ...normalizedUsage,
      requestCount: normalizedUsage.totalTokens > 0 ? 1 : 0,
    };
  }

  const previous = sessionUsageStore.get(sessionId) || {
    ...EMPTY_USAGE,
    requestCount: 0,
  };

  const next = {
    promptTokens: previous.promptTokens + normalizedUsage.promptTokens,
    completionTokens: previous.completionTokens + normalizedUsage.completionTokens,
    totalTokens: previous.totalTokens + normalizedUsage.totalTokens,
    requestCount:
      previous.requestCount + (normalizedUsage.totalTokens > 0 ? 1 : 0),
  };

  sessionUsageStore.set(sessionId, next);
  return next;
};

export const handleChat = async (req, res) => {
  try {
    const { message, history = [], sessionId, conversationId, userId } = req.body || {};

    if (typeof message !== "string" || message.trim().length === 0) {
      return res.status(400).json({
        error: "message is required and must be a non-empty string",
      });
    }

    if (!Array.isArray(history)) {
      return res.status(400).json({
        error: "history must be an array when provided",
      });
    }

    if (
      sessionId !== undefined &&
      (typeof sessionId !== "string" || sessionId.trim().length === 0)
    ) {
      return res.status(400).json({
        error: "sessionId must be a non-empty string when provided",
      });
    }

    const fallbackConversationId =
      typeof conversationId === "string" ? conversationId.trim() : null;
    const normalizedSessionId =
      typeof sessionId === "string" && sessionId.trim().length > 0
        ? sessionId.trim()
        : fallbackConversationId;

    const userMessage = normalizeUserMessage(message);
    const baseHistory = getBaseHistory({
      sessionId: normalizedSessionId,
      history,
    });

    const isGuestSession = req.user?.isGuest || req.user?.role === "guest";
    if (isGuestSession) {
      const reply = "Guest sessions do not have access to the AI assistant. Please sign in or create an account to use this feature.";
      const usage = createEmptyUsage();
      const sessionUsage = appendSessionUsage(normalizedSessionId, usage);
      const updatedHistory = appendAndStoreHistory({
        sessionId: normalizedSessionId,
        baseHistory,
        userMessage,
        assistantReply: reply,
      });

      return res.status(200).json({
        success: false,
        reply,
        updatedHistory,
        sessionId: normalizedSessionId,
        conversationId: normalizedSessionId,
        usage,
        sessionUsage,
        model: "guest-gate",
      });
    }

    const resolvedUserId = getRequestUserId(req, userId);
    if (!resolvedUserId) {
      const reply = "Please sign in to access your personalized financial assistant.";
      const usage = createEmptyUsage();
      const sessionUsage = appendSessionUsage(normalizedSessionId, usage);
      const updatedHistory = appendAndStoreHistory({
        sessionId: normalizedSessionId,
        baseHistory,
        userMessage,
        assistantReply: reply,
      });

      return res.status(401).json({
        reply,
        updatedHistory,
        sessionId: normalizedSessionId,
        conversationId: normalizedSessionId,
        usage,
        sessionUsage,
        model: "auth-gate",
      });
    }

    const lightweight = getLightweightReply(userMessage);
    if (lightweight) {
      const usage = createEmptyUsage();
      const sessionUsage = appendSessionUsage(normalizedSessionId, usage);
      const updatedHistory = appendAndStoreHistory({
        sessionId: normalizedSessionId,
        baseHistory,
        userMessage,
        assistantReply: lightweight.reply,
      });

      return res.status(200).json({
        reply: lightweight.reply,
        intent: lightweight.intent,
        updatedHistory,
        sessionId: normalizedSessionId,
        conversationId: normalizedSessionId,
        usage,
        sessionUsage,
        model: "lightweight-path",
      });
    }

    const intent = detectIntent(userMessage);

    const cooldownMsRemaining = getActiveSessionCooldownMs(normalizedSessionId);
    if (cooldownMsRemaining > 0) {
      let cooldownContext = null;
      try {
        cooldownContext = await getFullUserContext(resolvedUserId);
      } catch {
        cooldownContext = null;
      }

      const reply = buildDeterministicLimitReply({
        intent,
        context: cooldownContext,
        userMessage,
        cooldownMsRemaining,
      });
      const usage = createEmptyUsage();
      const sessionUsage = appendSessionUsage(normalizedSessionId, usage);
      const updatedHistory = appendAndStoreHistory({
        sessionId: normalizedSessionId,
        baseHistory,
        userMessage,
        assistantReply: reply,
      });

      return res.status(200).json({
        reply,
        intent,
        updatedHistory,
        sessionId: normalizedSessionId,
        conversationId: normalizedSessionId,
        usage,
        sessionUsage,
        model: "limit-cooldown",
        retryAfterMs: Math.ceil(cooldownMsRemaining),
        cooldownUntil: new Date(Date.now() + cooldownMsRemaining).toISOString(),
        contextMeta: {
          userName: cooldownContext?.user?.name || "User",
          transactionCount: cooldownContext?.transactions?.count || 0,
          activeLoanCount: cooldownContext?.loans?.count || 0,
        },
      });
    }

    const context = await getFullUserContext(resolvedUserId);
    const deterministicReply = getDeterministicFinanceReply({
      message: userMessage,
      intent,
      context,
    });

    if (deterministicReply) {
      const usage = createEmptyUsage();
      const sessionUsage = appendSessionUsage(normalizedSessionId, usage);
      const updatedHistory = appendAndStoreHistory({
        sessionId: normalizedSessionId,
        baseHistory,
        userMessage,
        assistantReply: deterministicReply,
      });

      return res.status(200).json({
        reply: deterministicReply,
        intent,
        updatedHistory,
        sessionId: normalizedSessionId,
        conversationId: normalizedSessionId,
        usage,
        sessionUsage,
        model: "deterministic-path",
        contextMeta: {
          userName: context?.user?.name || "User",
          transactionCount: context?.transactions?.count || 0,
          activeLoanCount: context?.loans?.count || 0,
        },
      });
    }

    const prompt = buildPrompt(context, userMessage, intent);

    let reply;
    let usage = createEmptyUsage();
    let model = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
    let retryAfterMs = null;
    try {
      const groqResult = await generateGroqReply(prompt);

      if (typeof groqResult === "string") {
        reply = groqResult;
      } else {
        reply = String(groqResult?.reply || "").trim();
        usage = normalizeUsage(groqResult?.usage);
        if (typeof groqResult?.model === "string" && groqResult.model.trim().length > 0) {
          model = groqResult.model;
        }
      }

      if (!reply) {
        throw new Error("The AI service returned an empty reply.");
      }

      clearSessionLimitCooldown(normalizedSessionId);
    } catch (error) {
      if (isPromptLimitError(error)) {
        console.warn(
          "[ai-limit-fallback]",
          JSON.stringify({
            sessionId: normalizedSessionId || null,
            statusCode: Number(error?.statusCode || 0) || null,
            message: String(error?.message || "").slice(0, 180),
          })
        );
        const limitState = setSessionLimitCooldown(
          normalizedSessionId,
          resolveRetryAfterMs(error),
          error?.message
        );
        retryAfterMs = limitState.retryAfterMs;
        reply = buildDeterministicLimitReply({
          intent,
          context,
          userMessage,
          cooldownMsRemaining: retryAfterMs,
        });
        usage = createEmptyUsage();
        model = "limit-fallback";
      } else {
        throw error;
      }
    }

    const sessionUsage = appendSessionUsage(normalizedSessionId, usage);

    const updatedHistory = appendAndStoreHistory({
      sessionId: normalizedSessionId,
      baseHistory,
      userMessage,
      assistantReply: reply,
    });

    return res.status(200).json({
      reply,
      intent,
      updatedHistory,
      sessionId: normalizedSessionId,
      conversationId: normalizedSessionId,
      usage,
      sessionUsage,
      model,
      ...(retryAfterMs
        ? {
            retryAfterMs,
            cooldownUntil: new Date(Date.now() + retryAfterMs).toISOString(),
          }
        : {}),
      contextMeta: {
        userName: context?.user?.name || "User",
        transactionCount: context?.transactions?.count || 0,
        activeLoanCount: context?.loans?.count || 0,
      },
    });
  } catch (error) {
    console.error('BIG ERROR', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || "Failed to process chat request",
    });
  }
};

export default handleChat;
