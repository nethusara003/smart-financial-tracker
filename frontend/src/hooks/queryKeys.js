export const queryKeys = {
  admin: {
    all: ["admin"],
    users: ["admin", "users"],
    analyticsOverview: ["admin", "analyticsOverview"],
    auditLogs: ["admin", "auditLogs"],
    userTransactions: (userId) => ["admin", "userTransactions", userId],
    promotionRequests: ["admin", "promotionRequests"],
    wallNotifications: ["admin", "wallNotifications"],
  },
  bills: {
    all: ["bills"],
    list: ["bills", "list"],
    upcoming: (days = 7) => ["bills", "upcoming", days],
  },
  wallet: {
    all: ["wallet"],
    balance: ["wallet", "balance"],
    transactions: (scope = "default") => ["wallet", "transactions", scope],
  },
  transfers: {
    all: ["transfers"],
    limits: ["transfers", "limits"],
    history: ({ type = "all", status = "all" } = {}) => ["transfers", "history", type, status],
    detail: (transferId) => ["transfers", "detail", transferId],
    userSearch: (query = "") => ["transfers", "userSearch", query],
    contacts: ["transfers", "contacts"],
    feasibility: ({ receiverId = "", amount = 0, scheduledFor = "" } = {}) =>
      ["transfers", "feasibility", receiverId, amount, scheduledFor],
  },
  budgets: {
    all: ["budgets"],
    withSpending: ["budgets", "withSpending"],
    status: ["budgets", "status"],
    analysis: ["budgets", "analysis"],
  },
  recurring: {
    all: ["recurring"],
    list: (type = "all") => ["recurring", "list", type],
  },
  transactions: {
    all: ["transactions"],
    list: (scope = "all") => ["transactions", "list", scope],
  },
  notifications: {
    all: ["notifications"],
    list: (scope = "all") => ["notifications", "list", scope],
    unreadCount: ["notifications", "unreadCount"],
  },
  settings: {
    all: ["settings"],
    profile: ["settings", "profile"],
    budgetProfile: ["settings", "budgetProfile"],
    transferPinStatus: ["settings", "transferPinStatus"],
  },
  feedback: {
    all: ["feedback"],
    list: ({ type = "all", sort = "recent" } = {}) => ["feedback", "list", type, sort],
  },
  insights: {
    all: ["insights"],
    expenseForecast: (months = 3) => ["insights", "expenseForecast", months],
    financialHealth: (months = 1) => ["insights", "financialHealth", months],
    budgetRecommendations: (months = 1) => ["insights", "budgetRecommendations", months],
  },
};
