import Transaction from "../models/Transaction.js";
import User from "../models/User.js";
import Budget from "../models/Budget.js";
import { sendBudgetAlert } from "../Services/notificationService.js";
import { createNotification } from "../controllers/notificationController.js";

const CATEGORY_WARNING_LEVEL = 90;
const CATEGORY_EXCEEDED_LEVEL = 100;
const OVERALL_WARNING_LEVEL = 90;
const OVERALL_CRITICAL_LEVEL = 100;
const DEFAULT_CATEGORY_ALERT_THRESHOLD = 80;

const resolveAlertThreshold = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_CATEGORY_ALERT_THRESHOLD;
  }

  return Math.min(95, Math.max(50, parsed));
};

const resolvePeriodRange = (now, period) => {
  let startDate;
  let endDate;

  switch (period) {
    case "daily":
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 1);
      break;
    case "weekly":
      startDate = new Date(now);
      startDate.setDate(now.getDate() - now.getDay());
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 7);
      break;
    case "yearly":
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now.getFullYear() + 1, 0, 1);
      break;
    case "monthly":
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      break;
  }

  return { startDate, endDate };
};

const parseValidDate = (value) => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const resolveEffectiveStartDate = (periodStart, budget, user) => {
  const useStartFromNow =
    budget.expenseStartMode === "start_from_now" ||
    user?.expenseStartMode === "start_from_now";

  if (!useStartFromNow) {
    return periodStart;
  }

  const configuredDates = [
    parseValidDate(budget.expenseStartDate),
    parseValidDate(user?.expenseStartDate),
  ].filter(Boolean);

  if (configuredDates.length === 0) {
    return periodStart;
  }

  const latestConfiguredStart = new Date(
    Math.max(...configuredDates.map((entry) => entry.getTime()))
  );

  return latestConfiguredStart.getTime() > periodStart.getTime()
    ? latestConfiguredStart
    : periodStart;
};

const getCategoryAlertState = (percentage, alertThreshold) => {
  const thresholdToUse = Math.max(DEFAULT_CATEGORY_ALERT_THRESHOLD, resolveAlertThreshold(alertThreshold));

  if (percentage >= CATEGORY_EXCEEDED_LEVEL) {
    return {
      level: "exceeded",
      titlePrefix: "Budget Exceeded",
      color: "danger",
      messageBuilder: (category, spent, limit, roundedPercentage) =>
        `You've spent $${spent.toFixed(2)} of your $${limit.toFixed(2)} ${category} budget (${roundedPercentage}%).`,
    };
  }

  if (percentage >= CATEGORY_WARNING_LEVEL) {
    return {
      level: "90",
      titlePrefix: "Budget Warning",
      color: "warning",
      messageBuilder: (category, spent, limit, roundedPercentage) =>
        `${category} is at ${roundedPercentage}% ($${spent.toFixed(2)} of $${limit.toFixed(2)}).`,
    };
  }

  if (percentage >= thresholdToUse) {
    return {
      level: "80",
      titlePrefix: "Budget Nearing Limit",
      color: "warning",
      messageBuilder: (category, spent, limit, roundedPercentage) =>
        `${category} is nearing its limit at ${roundedPercentage}% ($${spent.toFixed(2)} of $${limit.toFixed(2)}).`,
    };
  }

  return null;
};

const getOverallAlertState = (percentage) => {
  if (percentage >= OVERALL_CRITICAL_LEVEL) {
    return {
      level: "exceeded",
      title: "Critical: Overall Budget Limit Reached",
      color: "danger",
      messageBuilder: (spent, limit, roundedPercentage) =>
        `Overall budget is at ${roundedPercentage}% ($${spent.toFixed(2)} of $${limit.toFixed(2)}). Immediate review recommended.`,
    };
  }

  if (percentage >= OVERALL_WARNING_LEVEL) {
    return {
      level: "90",
      title: "Overall Budget Nearing Limit",
      color: "warning",
      messageBuilder: (spent, limit, roundedPercentage) =>
        `Overall budget is at ${roundedPercentage}% ($${spent.toFixed(2)} of $${limit.toFixed(2)}).`,
    };
  }

  return null;
};

const isBudgetReminderEnabled = (notificationSettings = {}) => {
  return (
    Boolean(notificationSettings.emailNotifications) &&
    Boolean(notificationSettings.budgetEmailAlerts ?? notificationSettings.budgetAlerts)
  );
};

/* =========================
   CHECK USER BUDGET AND SEND ALERTS
========================= */
export const checkBudgetAlerts = async (userId, budgets) => {
  try {
    if (!budgets || budgets.length === 0) {
      return;
    }

    const now = new Date();

    const user = await User.findById(userId).select(
      "notificationSettings expenseStartMode expenseStartDate overallBudgetLastAlertLevel overallBudgetLastAlertDate"
    );

    if (!user) {
      return;
    }

    if (!isBudgetReminderEnabled(user.notificationSettings || {})) {
      return;
    }

    let totalSpent = 0;
    let totalLimit = 0;
    let shouldPersistOverallState = false;

    // Check each budget
    for (const budget of budgets) {
      const { startDate, endDate } = resolvePeriodRange(now, budget.period);
      const effectiveStartDate = resolveEffectiveStartDate(startDate, budget, user);

      // Get all transactions for this period
      const transactions = await Transaction.find({
        user: userId,
        type: 'expense',
        category: { $regex: new RegExp(`^${budget.category}$`, 'i') },
        date: { $gte: effectiveStartDate, $lt: endDate }
      });

      const spent = transactions.reduce((sum, t) => sum + t.amount, 0);
      const percentage = budget.limit > 0 ? (spent / budget.limit) * 100 : 0;
      const roundedPercentage = Math.round(percentage);

      totalSpent += spent;
      totalLimit += Number(budget.limit) || 0;

      const categoryAlertState = getCategoryAlertState(percentage, budget.alertThreshold);

      // Send alert if threshold reached and not already sent for this level
      if (categoryAlertState && budget.lastAlertLevel !== categoryAlertState.level) {
        console.log(`📧 Sending budget alert for ${budget.category}: ${roundedPercentage}% (level: ${categoryAlertState.level})`);
        
        // Dispatch email alert and in-app notification in parallel to avoid SMTP delays blocking UI notifications
        const [emailRes, notificationRes] = await Promise.allSettled([
          sendBudgetAlert(
            userId,
            budget.category,
            spent,
            budget.limit,
            roundedPercentage,
            {
              scope: "category",
              level: categoryAlertState.level,
            }
          ),
          createNotification(
            userId,
            'budget_alert',
            `${categoryAlertState.titlePrefix}: ${budget.category}`,
            categoryAlertState.messageBuilder(budget.category, spent, budget.limit, roundedPercentage),
            {
              scope: "category",
              category: budget.category,
              spent,
              limit: budget.limit,
              percentage: roundedPercentage,
              level: categoryAlertState.level,
            },
            'AlertCircle',
            categoryAlertState.color,
            '/budgets'
          )
        ]);

        if (emailRes.status === "rejected") {
          console.error(`❌ SMTP email failed:`, emailRes.reason);
        } else {
          console.log(`📧 Email result:`, emailRes.value);
        }

        if (notificationRes.status === "rejected") {
          console.error(`❌ In-app notification failed:`, notificationRes.reason);
        }

        // Update budget to track this alert was sent
        await Budget.findByIdAndUpdate(budget._id, { 
          lastAlertLevel: categoryAlertState.level,
          lastAlertDate: new Date()
        });

        console.log(`✅ Budget alert sent for ${budget.category} at ${roundedPercentage}%`);
      } else if (categoryAlertState && budget.lastAlertLevel === categoryAlertState.level) {
        console.log(`⏭️ Skipping duplicate alert for ${budget.category} at ${roundedPercentage}% (already sent level: ${categoryAlertState.level})`);
      }

      // Reset alert level if we're back below the threshold (budget period might have reset or spending decreased)
      if (!categoryAlertState && budget.lastAlertLevel) {
        await Budget.findByIdAndUpdate(budget._id, { 
          lastAlertLevel: null,
          lastAlertDate: null
        });
        console.log(`✅ Budget alert level reset for ${budget.category}`);
      }
    }

    if (totalLimit > 0) {
      const overallPercentage = (totalSpent / totalLimit) * 100;
      const roundedOverallPercentage = Math.round(overallPercentage);
      const overallAlertState = getOverallAlertState(overallPercentage);

      if (overallAlertState && user.overallBudgetLastAlertLevel !== overallAlertState.level) {
        console.log(`📧 Sending overall budget alert: ${roundedOverallPercentage}% (level: ${overallAlertState.level})`);

        const [overallEmailRes, overallNotificationRes] = await Promise.allSettled([
          sendBudgetAlert(
            userId,
            "Overall Budget",
            totalSpent,
            totalLimit,
            roundedOverallPercentage,
            {
              scope: "overall",
              level: overallAlertState.level,
            }
          ),
          createNotification(
            userId,
            "budget_alert",
            overallAlertState.title,
            overallAlertState.messageBuilder(totalSpent, totalLimit, roundedOverallPercentage),
            {
              scope: "overall",
              spent: totalSpent,
              limit: totalLimit,
              percentage: roundedOverallPercentage,
              level: overallAlertState.level,
            },
            overallAlertState.level === "exceeded" ? "AlertTriangle" : "AlertCircle",
            overallAlertState.color,
            "/budgets"
          )
        ]);

        if (overallEmailRes.status === "rejected") {
          console.error(`❌ SMTP overall email failed:`, overallEmailRes.reason);
        } else {
          console.log(`📧 Overall budget email result:`, overallEmailRes.value);
        }

        if (overallNotificationRes.status === "rejected") {
          console.error(`❌ Overall in-app notification failed:`, overallNotificationRes.reason);
        }

        user.overallBudgetLastAlertLevel = overallAlertState.level;
        user.overallBudgetLastAlertDate = new Date();
        shouldPersistOverallState = true;
      }

      if (!overallAlertState && user.overallBudgetLastAlertLevel) {
        user.overallBudgetLastAlertLevel = null;
        user.overallBudgetLastAlertDate = null;
        shouldPersistOverallState = true;
        console.log("✅ Overall budget alert level reset");
      }
    }

    if (shouldPersistOverallState) {
      await user.save();
    }

    console.log(`✅ Budget check completed for user ${userId}`);
  } catch (error) {
    console.error('Error checking budgets:', error);
  }
};

/* =========================
   CHECK BUDGETS FROM LOCALSTORAGE DATA
   This is called when a transaction is added
========================= */
export const checkBudgetOnTransaction = async (userId) => {
  try {
    // Note: Budgets are stored in localStorage on frontend
    // For real-time alerts, we'd need to store budgets in the database
    // For now, this is a placeholder for when Budget model is created
    console.log(`Budget check triggered for user ${userId}`);
  } catch (error) {
    console.error('Error in budget check:', error);
  }
};
