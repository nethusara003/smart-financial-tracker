const MAX_RECENT_ITEMS = 4;
const MAX_CONTEXT_CHARS = Number(process.env.CHAT_CONTEXT_CHAR_LIMIT || 5000);
const MAX_TEXT_LENGTH = 120;

const roundNumber = (value) => Number(Number(value || 0).toFixed(2));

const truncateText = (value, maxLength = MAX_TEXT_LENGTH) => {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return "";
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength)}...`;
};

const toIsoDate = (value) => {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.toISOString().slice(0, 10);
};

const compact = (obj) =>
  Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined && value !== null && value !== "")
  );

const safeStringify = (value, maxChars = MAX_CONTEXT_CHARS) => {
  try {
    const serialized = JSON.stringify(value);

    if (serialized.length <= maxChars) {
      return serialized;
    }

    return `${serialized.slice(0, maxChars)}... [context truncated]`;
  } catch {
    return "{}";
  }
};

const formatTransaction = (tx) =>
  compact({
    date: toIsoDate(tx?.date || tx?.createdAt),
    type: tx?.type,
    category: truncateText(tx?.category || "Uncategorized", 40),
    amount: roundNumber(Math.abs(Number(tx?.amount || 0))),
    description: truncateText(tx?.description || tx?.note || "", 80),
  });

const formatLoan = (loan) =>
  compact({
    name: truncateText(loan?.name || loan?.title || loan?.loanType || "Loan", 40),
    status: loan?.status,
    principalAmount: roundNumber(loan?.amount || loan?.principalAmount),
    remainingBalance: roundNumber(loan?.remainingBalance),
    monthlyPayment: roundNumber(loan?.monthlyPayment || loan?.emiAmount),
    dueDate: toIsoDate(loan?.nextDueDate || loan?.dueDate),
  });

const formatBudget = (budget) =>
  compact({
    category: truncateText(budget?.category || "Uncategorized", 40),
    limit: roundNumber(budget?.limit),
    spent: roundNumber(budget?.usage?.spent),
    remaining: roundNumber(budget?.usage?.remaining),
    percentUsed: roundNumber(budget?.usage?.percent),
  });

const formatGoal = (goal) =>
  compact({
    title: truncateText(goal?.title || goal?.name || "Goal", 50),
    current: roundNumber(goal?.progress?.current || goal?.currentAmount),
    target: roundNumber(goal?.progress?.target || goal?.targetAmount),
    percentage: roundNumber(goal?.progress?.percentage),
    targetDate: toIsoDate(goal?.targetDate),
  });

const formatTransfer = (transfer) =>
  compact({
    date: toIsoDate(transfer?.createdAt || transfer?.date),
    status: transfer?.status,
    amount: roundNumber(transfer?.amount),
    note: truncateText(transfer?.note || transfer?.description || "", 80),
  });

const formatNotification = (alert) =>
  compact({
    type: alert?.type || alert?.category,
    title: truncateText(alert?.title || alert?.message || "", 80),
    createdAt: toIsoDate(alert?.createdAt || alert?.date),
  });

const getRecentRepayments = (repaymentSchedules) => {
  if (!repaymentSchedules || typeof repaymentSchedules !== "object") {
    return [];
  }

  return Object.values(repaymentSchedules)
    .flat()
    .filter(Boolean)
    .slice(0, MAX_RECENT_ITEMS)
    .map((payment) =>
      compact({
        date: toIsoDate(payment?.paymentDate || payment?.createdAt),
        amount: roundNumber(payment?.amount || payment?.paymentAmount),
        status: payment?.status,
      })
    );
};

const buildIntentContext = (context, intent) => {
  const base = {
    user: {
      name: context?.user?.name || "User",
      email: context?.user?.email || "",
    },
    summary: context?.summary || {},
    monthlySummary: context?.monthlySummary || {},
    loans: {
      count: context?.loans?.count || 0,
      outstandingBalance: context?.loans?.outstandingBalance || 0,
    },
    budgets: {
      count: context?.budgets?.count || 0,
    },
    goals: {
      count: context?.goals?.count || 0,
    },
  };

  if (intent === "expenses") {
    return {
      ...base,
      expenses: {
        topSpendingCategories: (context?.transactions?.topSpendingCategories || [])
          .slice(0, MAX_RECENT_ITEMS)
          .map((entry) =>
            compact({
              category: truncateText(entry?.category || "Uncategorized", 40),
              amount: roundNumber(entry?.amount),
            })
          ),
        recentTransactions: (context?.transactions?.all || [])
          .filter((tx) => tx.type === "expense")
          .slice(0, MAX_RECENT_ITEMS)
          .map(formatTransaction),
      },
    };
  }

  if (intent === "loans") {
    return {
      ...base,
      loans: {
        ...base.loans,
        activeLoans: (context?.loans?.activeLoans || []).slice(0, MAX_RECENT_ITEMS).map(formatLoan),
        recentRepayments: getRecentRepayments(context?.loans?.repaymentSchedules),
      },
    };
  }

  if (intent === "budgets") {
    return {
      ...base,
      budgets: {
        ...base.budgets,
        items: (context?.budgets?.items || []).slice(0, MAX_RECENT_ITEMS).map(formatBudget),
      },
    };
  }

  if (intent === "goals") {
    return {
      ...base,
      goals: {
        ...base.goals,
        items: (context?.goals?.items || []).slice(0, MAX_RECENT_ITEMS).map(formatGoal),
      },
    };
  }

  if (intent === "summary") {
    return {
      ...base,
      wallets: {
        totals: context?.wallets?.totals || {},
        accounts: (context?.wallets?.accounts || []).slice(0, MAX_RECENT_ITEMS).map((wallet) =>
          compact({
            name: truncateText(wallet?.name || wallet?.accountName || "Wallet", 40),
            balance: roundNumber(wallet?.balance),
            availableBalance: roundNumber(wallet?.availableBalance),
          })
        ),
      },
      transfers: {
        count: context?.transfers?.count || 0,
        recent: (context?.transfers?.history || []).slice(0, MAX_RECENT_ITEMS).map(formatTransfer),
      },
      recentActivity: (context?.transactions?.recent || []).slice(0, MAX_RECENT_ITEMS).map(formatTransaction),
    };
  }

  return {
    ...base,
    transactions: {
      count: context?.transactions?.count || 0,
      recent: (context?.transactions?.recent || []).slice(0, MAX_RECENT_ITEMS).map(formatTransaction),
      topSpendingCategories: (context?.transactions?.topSpendingCategories || [])
        .slice(0, MAX_RECENT_ITEMS)
        .map((entry) =>
          compact({
            category: truncateText(entry?.category || "Uncategorized", 40),
            amount: roundNumber(entry?.amount),
          })
        ),
    },
    wallets: {
      totals: context?.wallets?.totals || {},
    },
    transfers: {
      count: context?.transfers?.count || 0,
      recent: (context?.transfers?.history || []).slice(0, MAX_RECENT_ITEMS).map(formatTransfer),
    },
    notifications: {
      count: context?.notifications?.count || 0,
      alerts: (context?.notifications?.alerts || []).slice(0, MAX_RECENT_ITEMS).map(formatNotification),
    },
    preferences: {
      currency: context?.preferences?.currency,
      locale: context?.preferences?.locale,
    },
    system: {
      generatedAt: context?.system?.generatedAt,
      datasetSizes: context?.system?.datasetSizes || {},
    },
  };
};

export const buildPrompt = (context, message, intent) => {
  const userName = context?.user?.name || "User";
  const intentContext = buildIntentContext(context, intent);

  const systemPrompt = `You are the in-app financial assistant for Smart Financial Tracker.

STRICT RULE: You are a strict financial advisor. If the user asks about non-financial topics (like the weather, sports, general knowledge, etc.), politely decline to answer, state that you are here to support their finances, and steer the conversation back to their budget, goals, or financial data.
APPLICATION CAPABILITIES: You are fully aware that Smart Financial Tracker has advanced features including a Machine Learning Expense Forecaster, a Monte Carlo Retirement Planner, P2P Wallet Transfers, Budgeting, and Goal tracking. If the user asks if they can use these features (like calculating retirement), confirm enthusiastically that they can!
Use only provided context and never invent data.
If details are missing, say: "Based on your current records..."
Keep replies short by default (1-3 sentences).
Do not provide a full financial summary unless the user explicitly asks for a summary, report, or overview.
For greetings or small talk, reply in one short sentence and ask one brief follow-up question.
Give concise, practical guidance and optional next steps.
Use the user's name at most once.
Do not mention model limitations or external account connections.

User: ${userName}
Summary (All-Time): income ${context?.summary?.income || 0}, expenses ${context?.summary?.expenses || 0}, savings ${context?.summary?.savings || 0}
Summary (This Year): income ${context?.yearlySummary?.income || 0}, expenses ${context?.yearlySummary?.expenses || 0}, savings ${context?.yearlySummary?.savings || 0}
Summary (This Month): income ${context?.monthlySummary?.income || 0}, expenses ${context?.monthlySummary?.expenses || 0}, savings ${context?.monthlySummary?.savings || 0}
Summary (Last 7 Days): income ${context?.weeklySummary?.income || 0}, expenses ${context?.weeklySummary?.expenses || 0}, savings ${context?.weeklySummary?.savings || 0}
Active loans: ${context?.loans?.count || 0}`;

  const userPrompt = `${userName} asked:
${message}

Intent: ${intent}

Context snapshot:
${safeStringify(intentContext)}

Respond naturally using the available system data.`;

  return {
    systemPrompt,
    userPrompt,
  };
};

export default buildPrompt;