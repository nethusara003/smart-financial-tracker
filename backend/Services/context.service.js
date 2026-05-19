import mongoose from "mongoose";
import User from "../models/User.js";
import Transaction from "../models/Transaction.js";
import Loan from "../models/Loan.js";
import LoanPayment from "../models/LoanPayment.js";
import Budget from "../models/Budget.js";
import Goal from "../models/Goal.js";
import Wallet from "../models/Wallet.js";
import Transfer from "../models/Transfer.js";
import Notification from "../models/Notification.js";

const toObjectId = (userId) => {
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return null;
  }

  return new mongoose.Types.ObjectId(userId);
};

const round = (value) => Number((value || 0).toFixed(2));

const sumAmounts = (items, selector) =>
  items.reduce((total, entry) => total + Number(selector(entry) || 0), 0);

const buildCategoryMap = (transactions) => {
  const expenseCategoryMap = new Map();
  const incomeCategorySet = new Set();

  for (const tx of transactions) {
    const category = tx.category || "Uncategorized";
    if (tx.type === "expense") {
      expenseCategoryMap.set(
        category,
        (expenseCategoryMap.get(category) || 0) + Math.abs(Number(tx.amount || 0))
      );
    }

    if (tx.type === "income") {
      incomeCategorySet.add(category);
    }
  }

  const topExpenseCategories = [...expenseCategoryMap.entries()]
    .map(([category, amount]) => ({ category, amount: round(amount) }))
    .sort((a, b) => b.amount - a.amount);

  return {
    topExpenseCategories,
    incomeCategories: [...incomeCategorySet].sort(),
    expenseCategories: topExpenseCategories.map((entry) => entry.category),
  };
};

const buildBudgetUsage = (budgets, transactions) => {
  const expenseByCategory = new Map();

  for (const tx of transactions) {
    if (tx.type !== "expense") {
      continue;
    }

    const category = tx.category || "Uncategorized";
    expenseByCategory.set(
      category,
      (expenseByCategory.get(category) || 0) + Math.abs(Number(tx.amount || 0))
    );
  }

  return budgets.map((budget) => {
    const spent = round(expenseByCategory.get(budget.category) || 0);
    const limit = Number(budget.limit || 0);

    return {
      ...budget,
      usage: {
        spent,
        limit: round(limit),
        remaining: round(limit - spent),
        percent: limit > 0 ? round((spent / limit) * 100) : 0,
      },
    };
  });
};

const buildGoalProgress = (goals) =>
  goals.map((goal) => {
    const target = Number(goal.targetAmount || 0);
    const current = Number(goal.currentAmount || 0);

    return {
      ...goal,
      progress: {
        current: round(current),
        target: round(target),
        percentage: target > 0 ? round((current / target) * 100) : 0,
      },
    };
  });

const buildLoanSummary = (loans, loanPayments) => {
  const activeLoans = loans.filter((loan) => loan.status === "active");
  const outstandingBalance = round(
    sumAmounts(activeLoans, (loan) => Number(loan.remainingBalance || 0))
  );

  const scheduleByLoan = loanPayments.reduce((acc, payment) => {
    const loanId = String(payment.loanId);
    if (!acc[loanId]) {
      acc[loanId] = [];
    }

    acc[loanId].push(payment);
    return acc;
  }, {});

  return {
    count: activeLoans.length,
    activeLoans,
    allLoans: loans,
    outstandingBalance,
    repaymentSchedules: scheduleByLoan,
  };
};

const buildWalletSummary = (wallets) => {
  const combinedBalance = round(sumAmounts(wallets, (wallet) => wallet.balance));
  const combinedAvailableBalance = round(
    sumAmounts(wallets, (wallet) => wallet.availableBalance)
  );
  const combinedPendingBalance = round(
    sumAmounts(wallets, (wallet) => wallet.pendingBalance)
  );

  return {
    accounts: wallets,
    totals: {
      combinedBalance,
      combinedAvailableBalance,
      combinedPendingBalance,
    },
  };
};

const buildMonthlySummary = (transactions) => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);

  const monthlyTransactions = transactions.filter((tx) => {
    const date = new Date(tx.date || tx.createdAt || now);
    return date >= start;
  });

  const income = round(
    sumAmounts(
      monthlyTransactions.filter((tx) => tx.type === "income"),
      (tx) => Number(tx.amount || 0)
    )
  );
  const expenses = round(
    sumAmounts(
      monthlyTransactions.filter((tx) => tx.type === "expense"),
      (tx) => Math.abs(Number(tx.amount || 0))
    )
  );

  return {
    income,
    expenses,
    savings: round(income - expenses),
    transactionCount: monthlyTransactions.length,
  };
};

const buildWeeklySummary = (transactions) => {
  const now = new Date();
  const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const weeklyTransactions = transactions.filter((tx) => {
    const date = new Date(tx.date || tx.createdAt || now);
    return date >= start;
  });

  const income = round(
    sumAmounts(
      weeklyTransactions.filter((tx) => tx.type === "income"),
      (tx) => Number(tx.amount || 0)
    )
  );
  const expenses = round(
    sumAmounts(
      weeklyTransactions.filter((tx) => tx.type === "expense"),
      (tx) => Math.abs(Number(tx.amount || 0))
    )
  );

  return {
    income,
    expenses,
    savings: round(income - expenses),
    transactionCount: weeklyTransactions.length,
  };
};

const buildYearlySummary = (transactions) => {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);

  const yearlyTransactions = transactions.filter((tx) => {
    const date = new Date(tx.date || tx.createdAt || now);
    return date >= start;
  });

  const income = round(
    sumAmounts(
      yearlyTransactions.filter((tx) => tx.type === "income"),
      (tx) => Number(tx.amount || 0)
    )
  );
  const expenses = round(
    sumAmounts(
      yearlyTransactions.filter((tx) => tx.type === "expense"),
      (tx) => Math.abs(Number(tx.amount || 0))
    )
  );

  return {
    income,
    expenses,
    savings: round(income - expenses),
    transactionCount: yearlyTransactions.length,
  };
};

export const getFullUserContext = async (userId) => {
  const objectId = toObjectId(userId);

  if (!objectId) {
    const error = Object.assign(new Error("Invalid userId"), { statusCode: 400 });
    throw error;
  }

  const [
    user,
    transactions,
    loans,
    loanPayments,
    budgets,
    goals,
    wallets,
    transfers,
    notifications,
  ] = await Promise.all([
    User.findById(objectId).lean(),
    Transaction.find({ user: objectId }).sort({ date: -1, createdAt: -1 }).lean(),
    Loan.find({ userId: objectId }).sort({ createdAt: -1 }).lean(),
    LoanPayment.find({ userId: objectId }).sort({ paymentDate: -1 }).lean(),
    Budget.find({ userId: objectId }).sort({ createdAt: -1 }).lean(),
    Goal.find({ user: objectId }).sort({ createdAt: -1 }).lean(),
    Wallet.find({ user: objectId }).sort({ createdAt: -1 }).lean(),
    Transfer.find({
      $or: [{ "sender.userId": objectId }, { "receiver.userId": objectId }],
    })
      .sort({ createdAt: -1 })
      .lean(),
    Notification.find({ userId: objectId }).sort({ createdAt: -1 }).limit(100).lean(),
  ]);

  const allIncome = transactions.filter((tx) => tx.type === "income");
  const allExpenses = transactions.filter((tx) => tx.type === "expense");

  const income = round(sumAmounts(allIncome, (tx) => Number(tx.amount || 0)));
  const expenses = round(sumAmounts(allExpenses, (tx) => Math.abs(Number(tx.amount || 0))));
  const savings = round(income - expenses);

  const categoryData = buildCategoryMap(transactions);
  const budgetUsage = buildBudgetUsage(budgets, transactions);
  const goalProgress = buildGoalProgress(goals);
  const loanSummary = buildLoanSummary(loans, loanPayments);
  const walletSummary = buildWalletSummary(wallets);
  const monthlySummary = buildMonthlySummary(transactions);
  const weeklySummary = buildWeeklySummary(transactions);
  const yearlySummary = buildYearlySummary(transactions);
  const recentActivity = transactions.slice(0, 10);

  return {
    user: {
      name: user?.name || "User",
      email: user?.email || "",
      profile: user || {},
    },
    summary: {
      income,
      expenses,
      savings,
    },
    weeklySummary,
    monthlySummary,
    yearlySummary,
    loans: loanSummary,
    budgets: {
      items: budgetUsage,
      count: budgetUsage.length,
    },
    goals: {
      items: goalProgress,
      count: goalProgress.length,
    },
    wallets: walletSummary,
    transfers: {
      history: transfers,
      count: transfers.length,
    },
    transactions: {
      all: transactions,
      count: transactions.length,
      recent: recentActivity,
      topSpendingCategories: categoryData.topExpenseCategories.slice(0, 10),
    },
    categories: {
      income: categoryData.incomeCategories,
      expense: categoryData.expenseCategories,
      topSpending: categoryData.topExpenseCategories,
    },
    notifications: {
      alerts: notifications,
      count: notifications.length,
    },
    preferences: {
      currency: user?.currency || "USD",
      locale: user?.locale || "en-US",
      notificationSettings: user?.notificationSettings || {},
      privacySettings: user?.privacySettings || {},
    },
    system: {
      generatedAt: new Date().toISOString(),
      datasetSizes: {
        transactions: transactions.length,
        loans: loans.length,
        loanPayments: loanPayments.length,
        budgets: budgets.length,
        goals: goals.length,
        wallets: wallets.length,
        transfers: transfers.length,
        notifications: notifications.length,
      },
      wholeSystem: {
        hasUserProfile: Boolean(user),
        hasFinancialRecords: transactions.length > 0,
      },
    },
  };
};

export default getFullUserContext;