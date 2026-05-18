import nodemailer from "nodemailer";
import User from "../models/User.js";

/* =========================
   EMAIL TRANSPORTER SETUP
========================= */
const createTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn("⚠️ Email service is not configured. Returning a mock mail transporter.");
    return {
      sendMail: async (mailOptions) => {
        console.log(`[MOCK EMAIL] Sent mail to ${mailOptions.to} with subject "${mailOptions.subject}"`);
        return { messageId: "mock-message-id" };
      }
    };
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

/* =========================
   EMAIL TEMPLATES
========================= */

const formatInactivityIntervalLabel = (intervalType) => {
  const normalized = typeof intervalType === "string" ? intervalType.trim().toLowerCase() : "";

  switch (normalized) {
    case "2hours":
      return "2 hours";
    case "4hours":
      return "4 hours";
    case "6hours":
      return "6 hours";
    case "12hours":
      return "12 hours";
    case "24hours":
    case "1day":
      return "1 day";
    case "2days":
      return "2 days";
    default:
      return "your selected reminder period";
  }
};

const emailTemplates = {
  budgetAlert: (userName, category, spent, limit, percentage, options = {}) => {
    const isOverallScope = options.scope === "overall";
    const isCriticalOverall = isOverallScope && (options.level === "exceeded" || percentage >= 100);
    const headerGradient = isCriticalOverall
      ? "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)"
      : "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)";
    const alertBackground = isCriticalOverall ? "#fee2e2" : "#fef3c7";
    const alertBorder = isCriticalOverall ? "#ef4444" : "#f59e0b";
    const alertText = isCriticalOverall ? "#991b1b" : "#92400e";
    const subject = isOverallScope
      ? isCriticalOverall
        ? `🚨 Critical Budget Limit Reached: Overall Budget at ${percentage}%`
        : `⚠️ Overall Budget Nearing Limit: ${percentage}%`
      : `⚠️ Budget Alert: ${category} at ${percentage}%`;
    const heading = isOverallScope
      ? isCriticalOverall
        ? "🚨 Critical Budget Alert"
        : "⚠️ Overall Budget Alert"
      : "⚠️ Budget Alert";
    const introText = isOverallScope
      ? `Your total budget usage is now at <strong>${percentage}%</strong>.`
      : `Your <strong>${category}</strong> budget is approaching its limit.`;
    const detailText = isOverallScope
      ? `You've spent ${percentage}% of your total planned budget across all categories.`
      : `You've used ${percentage}% of your budget for ${category}.`;
    const ctaUrl = isOverallScope
      ? `${process.env.FRONTEND_URL || 'http://localhost:5173'}/budgets`
      : `${process.env.FRONTEND_URL || 'http://localhost:5173'}/budgets?category=${encodeURIComponent(category)}`;
    const ctaLabel = isCriticalOverall ? "Review Budget Now" : "View Budget Details";

    return {
      subject,
      html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f7fa; }
          .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
          .header { background: ${headerGradient}; padding: 40px 30px; text-align: center; }
          .header h1 { color: white; margin: 0; font-size: 28px; font-weight: 700; }
          .content { padding: 40px 30px; }
          .alert-box { background: ${alertBackground}; border-left: 4px solid ${alertBorder}; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .stats { display: flex; justify-content: space-around; margin: 30px 0; }
          .stat { text-align: center; }
          .stat-value { font-size: 32px; font-weight: 700; color: #1f2937; margin: 5px 0; }
          .stat-label { color: #6b7280; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; }
          .progress-bar { background: #e5e7eb; height: 24px; border-radius: 12px; overflow: hidden; margin: 20px 0; }
          .progress-fill { background: linear-gradient(90deg, #f59e0b 0%, #ef4444 100%); height: 100%; display: flex; align-items: center; justify-content: flex-end; padding-right: 10px; color: white; font-weight: 600; font-size: 12px; }
          .btn { display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; margin-top: 20px; }
          .footer { background: #f9fafb; padding: 20px 30px; text-align: center; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${heading}</h1>
          </div>
          <div class="content">
            <p style="font-size: 16px; color: #374151; margin-bottom: 10px;">Hi <strong>${userName}</strong>,</p>
            <p style="font-size: 16px; color: #374151;">${introText}</p>
            
            <div class="alert-box">
              <p style="margin: 0; color: ${alertText}; font-weight: 600; font-size: 14px;">⚠️ ${detailText}</p>
            </div>

            <div class="stats">
              <div class="stat">
                <div class="stat-value">$${spent.toFixed(2)}</div>
                <div class="stat-label">Spent</div>
              </div>
              <div class="stat">
                <div class="stat-value">$${limit.toFixed(2)}</div>
                <div class="stat-label">Budget</div>
              </div>
              <div class="stat">
                <div class="stat-value">$${(limit - spent).toFixed(2)}</div>
                <div class="stat-label">Remaining</div>
              </div>
            </div>

            <div class="progress-bar">
              <div class="progress-fill" style="width: ${Math.min(percentage, 100)}%">${percentage}%</div>
            </div>

            <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">💡 <strong>Tip:</strong> Consider reviewing your recent transactions to stay within budget.</p>

            <a href="${ctaUrl}" class="btn">${ctaLabel}</a>
          </div>
          <div class="footer">
            <p>You're receiving this because you enabled Advanced Budget Reminders in your notification settings.</p>
            <p style="margin-top: 10px;">Smart Financial Tracker © ${new Date().getFullYear()}</p>
          </div>
        </div>
      </body>
      </html>
    `
    };
  },

  billReminder: (userName, billName, amount, dueDate, daysUntilDue) => ({
    subject: `🔔 Bill Reminder: ${billName} due ${daysUntilDue === 0 ? 'today' : `in ${daysUntilDue} day${daysUntilDue > 1 ? 's' : ''}`}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f7fa; }
          .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 40px 30px; text-align: center; }
          .header h1 { color: white; margin: 0; font-size: 28px; font-weight: 700; }
          .content { padding: 40px 30px; }
          .bill-card { background: #fef2f2; border: 2px solid #fecaca; padding: 25px; border-radius: 12px; margin: 25px 0; }
          .bill-name { font-size: 24px; font-weight: 700; color: #1f2937; margin-bottom: 10px; }
          .bill-amount { font-size: 36px; font-weight: 800; color: #ef4444; margin: 15px 0; }
          .bill-due { color: #6b7280; font-size: 16px; }
          .urgency { background: #fee2e2; color: #991b1b; padding: 10px 15px; border-radius: 8px; font-weight: 600; display: inline-block; margin: 15px 0; }
          .btn { display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; margin-top: 20px; }
          .footer { background: #f9fafb; padding: 20px 30px; text-align: center; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔔 Bill Payment Reminder</h1>
          </div>
          <div class="content">
            <p style="font-size: 16px; color: #374151; margin-bottom: 10px;">Hi <strong>${userName}</strong>,</p>
            <p style="font-size: 16px; color: #374151;">You have an upcoming bill payment:</p>
            
            <div class="bill-card">
              <div class="bill-name">${billName}</div>
              <div class="bill-amount">$${amount.toFixed(2)}</div>
              <div class="bill-due">Due: ${new Date(dueDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
              ${daysUntilDue <= 2 ? `<div class="urgency">⚠️ ${daysUntilDue === 0 ? 'DUE TODAY' : daysUntilDue === 1 ? 'DUE TOMORROW' : 'DUE IN 2 DAYS'}</div>` : ''}
            </div>

            <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">💡 <strong>Reminder:</strong> Don't forget to mark this bill as paid once you've made the payment.</p>

            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard" class="btn">Manage Bills</a>
          </div>
          <div class="footer">
            <p>You're receiving this because you enabled Bill Reminders in your notification settings.</p>
            <p style="margin-top: 10px;">Smart Financial Tracker © ${new Date().getFullYear()}</p>
          </div>
        </div>
      </body>
      </html>
    `
  }),

  weeklyReport: (userName, weekData) => ({
    subject: `📊 Your Weekly Financial Summary - ${new Date().toLocaleDateString()}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f7fa; }
          .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 40px 30px; text-align: center; }
          .header h1 { color: white; margin: 0; font-size: 28px; font-weight: 700; }
          .header p { color: rgba(255,255,255,0.9); margin: 10px 0 0 0; }
          .content { padding: 40px 30px; }
          .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 25px 0; }
          .stat-card { background: #f9fafb; padding: 20px; border-radius: 12px; text-align: center; border: 2px solid #e5e7eb; }
          .stat-value { font-size: 28px; font-weight: 800; margin: 10px 0; }
          .income { color: #10b981; }
          .expense { color: #ef4444; }
          .balance { color: #3b82f6; }
          .transactions { color: #8b5cf6; }
          .stat-label { color: #6b7280; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; }
          .insight-box { background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); padding: 20px; border-radius: 12px; margin: 25px 0; border-left: 4px solid #3b82f6; }
          .category-item { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e5e7eb; }
          .category-item:last-child { border-bottom: none; }
          .btn { display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; margin-top: 20px; }
          .footer { background: #f9fafb; padding: 20px 30px; text-align: center; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📊 Weekly Financial Summary</h1>
            <p>${weekData.weekStart} - ${weekData.weekEnd}</p>
          </div>
          <div class="content">
            <p style="font-size: 16px; color: #374151; margin-bottom: 10px;">Hi <strong>${userName}</strong>,</p>
            <p style="font-size: 16px; color: #374151;">Here's your financial summary for the past week:</p>
            
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-label">Total Income</div>
                <div class="stat-value income">$${weekData.income.toFixed(2)}</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Total Expenses</div>
                <div class="stat-value expense">$${weekData.expenses.toFixed(2)}</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Net Balance</div>
                <div class="stat-value balance">$${(weekData.income - weekData.expenses).toFixed(2)}</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Transactions</div>
                <div class="stat-value transactions">${weekData.transactionCount}</div>
              </div>
            </div>

            ${weekData.topCategories.length > 0 ? `
              <h3 style="color: #1f2937; margin: 30px 0 15px 0;">Top Spending Categories</h3>
              <div style="background: #f9fafb; padding: 20px; border-radius: 12px;">
                ${weekData.topCategories.map(cat => `
                  <div class="category-item">
                    <span style="font-weight: 600; color: #374151;">${cat.category}</span>
                    <span style="color: #ef4444; font-weight: 700;">$${cat.amount.toFixed(2)}</span>
                  </div>
                `).join('')}
              </div>
            ` : ''}

            ${weekData.savingsRate >= 0 ? `
              <div class="insight-box">
                <p style="margin: 0; color: #1e40af; font-weight: 600;">
                  💰 You ${weekData.savingsRate > 0 ? `saved ${weekData.savingsRate.toFixed(1)}% of your income` : 'broke even'} this week! 
                  ${weekData.savingsRate >= 20 ? ' Great job!' : weekData.savingsRate >= 10 ? ' Keep it up!' : weekData.savingsRate > 0 ? ' Try to save a bit more!' : ' Consider reducing expenses.'}
                </p>
              </div>
            ` : `
              <div class="insight-box" style="background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); border-left-color: #ef4444;">
                <p style="margin: 0; color: #991b1b; font-weight: 600;">
                  ⚠️ Your expenses exceeded income by $${Math.abs(weekData.income - weekData.expenses).toFixed(2)} this week.
                </p>
              </div>
            `}

            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/analytics" class="btn">View Detailed Analytics</a>
          </div>
          <div class="footer">
            <p>You're receiving this because you enabled Weekly Reports in your notification settings.</p>
            <p style="margin-top: 10px;">Smart Financial Tracker © ${new Date().getFullYear()}</p>
          </div>
        </div>
      </body>
      </html>
    `
  }),

  transactionInactivityReminder: (userName, intervalType, lastTransactionDate) => ({
    subject: `📋 Transaction Reminder: Keep Your Records Up to Date`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f7fa; }
          .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); padding: 40px 30px; text-align: center; }
          .header h1 { color: white; margin: 0; font-size: 28px; font-weight: 700; }
          .content { padding: 40px 30px; }
          .reminder-box { background: #f3e8ff; border-left: 4px solid #8b5cf6; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .icon { font-size: 64px; text-align: center; margin: 20px 0; }
          .highlight { background: #e9d5ff; padding: 2px 8px; border-radius: 4px; font-weight: 600; }
          .checklist { background: #f9fafb; padding: 25px; border-radius: 12px; margin: 25px 0; }
          .checklist-item { padding: 10px 0; color: #374151; font-size: 15px; }
          .checklist-item:before { content: '✓'; color: #10b981; font-weight: bold; margin-right: 10px; }
          .btn { display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; margin-top: 20px; }
          .footer { background: #f9fafb; padding: 20px 30px; text-align: center; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📋 Transaction Reminder</h1>
          </div>
          <div class="content">
            <div class="icon">📝</div>
            <p style="font-size: 16px; color: #374151; margin-bottom: 10px; text-align: center;">Hi <strong>${userName}</strong>,</p>
            <p style="font-size: 16px; color: #374151; text-align: center;">It's been <span class="highlight">${formatInactivityIntervalLabel(intervalType)}</span> since your last transaction.</p>
            
            <div class="reminder-box">
              <p style="margin: 0; color: #6b21a8; font-weight: 600;">💡 Keeping your financial records up to date helps you:</p>
            </div>

            <div class="checklist">
              <div class="checklist-item">Track your spending accurately</div>
              <div class="checklist-item">Stay within your budgets</div>
              <div class="checklist-item">Achieve your financial goals faster</div>
              <div class="checklist-item">Make better financial decisions</div>
            </div>

            ${lastTransactionDate ? `
              <p style="color: #6b7280; font-size: 14px; text-align: center; margin: 20px 0;">
                Last transaction: <strong>${new Date(lastTransactionDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong>
              </p>
            ` : ''}

            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/transactions" class="btn">Add Transaction</a>
            </div>

            <p style="color: #6b7280; font-size: 13px; margin-top: 30px; text-align: center;">
              💡 <em>Tip: You can disable these reminders in your notification settings.</em>
            </p>
          </div>
          <div class="footer">
            <p>You're receiving this because you enabled Transaction Inactivity Reminders in your notification settings.</p>
            <p style="margin-top: 10px;">Smart Financial Tracker © ${new Date().getFullYear()}</p>
          </div>
        </div>
      </body>
      </html>
    `
  }),

  transactionAlert: (userName, transaction) => ({
    subject: `💳 ${transaction.type === 'income' ? 'Income' : 'Expense'} Added: $${transaction.amount.toFixed(2)}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f7fa; }
          .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, ${transaction.type === 'income' ? '#10b981 0%, #059669 100%' : '#3b82f6 0%, #2563eb 100%'}); padding: 40px 30px; text-align: center; }
          .header h1 { color: white; margin: 0; font-size: 28px; font-weight: 700; }
          .content { padding: 40px 30px; }
          .transaction-card { background: ${transaction.type === 'income' ? '#d1fae5' : '#dbeafe'}; border: 2px solid ${transaction.type === 'income' ? '#6ee7b7' : '#93c5fd'}; padding: 25px; border-radius: 12px; margin: 25px 0; }
          .amount { font-size: 36px; font-weight: 800; color: ${transaction.type === 'income' ? '#059669' : '#2563eb'}; margin: 10px 0; }
          .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid ${transaction.type === 'income' ? '#a7f3d0' : '#bfdbfe'}; }
          .detail-row:last-child { border-bottom: none; }
          .detail-label { color: #6b7280; font-weight: 600; }
          .detail-value { color: #1f2937; font-weight: 700; }
          .btn { display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; margin-top: 20px; }
          .footer { background: #f9fafb; padding: 20px 30px; text-align: center; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>💳 ${transaction.type === 'income' ? 'Income' : 'Expense'} Recorded</h1>
          </div>
          <div class="content">
            <p style="font-size: 16px; color: #374151; margin-bottom: 10px;">Hi <strong>${userName}</strong>,</p>
            <p style="font-size: 16px; color: #374151;">A new ${transaction.type} has been added to your account:</p>
            
            <div class="transaction-card">
              <div class="amount">${transaction.type === 'income' ? '+' : '-'}$${transaction.amount.toFixed(2)}</div>
              <div class="detail-row">
                <span class="detail-label">Category</span>
                <span class="detail-value">${transaction.category}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Date</span>
                <span class="detail-value">${new Date(transaction.date).toLocaleDateString()}</span>
              </div>
              ${transaction.note ? `
                <div class="detail-row">
                  <span class="detail-label">Note</span>
                  <span class="detail-value">${transaction.note}</span>
                </div>
              ` : ''}
            </div>

            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/transactions" class="btn">View All Transactions</a>
          </div>
          <div class="footer">
            <p>You're receiving this because you enabled Transaction Alerts in your notification settings.</p>
            <p style="margin-top: 10px;">Smart Financial Tracker © ${new Date().getFullYear()}</p>
          </div>
        </div>
      </body>
      </html>
    `
  })
};

/* =========================
   NOTIFICATION FUNCTIONS
========================= */

export const sendBudgetAlert = async (userId, category, spent, limit, percentage, options = {}) => {
  try {
    console.log(`📧 sendBudgetAlert called for user: ${userId}, category: ${category}, percentage: ${percentage}%`);
    
    const user = await User.findById(userId);
    if (!user) {
      console.log(`❌ User not found: ${userId}`);
      return { success: false, reason: 'user_not_found' };
    }

    console.log(`📧 User found: ${user.email}`);

    // Check notification settings with defaults for backward compatibility
    const notificationSettings = user.notificationSettings || {
      emailNotifications: true,
      budgetEmailAlerts: true,
      budgetAlerts: true,
    };

    console.log(`📧 Notification settings:`, notificationSettings);

    const budgetReminderEnabled = Boolean(
      notificationSettings.budgetEmailAlerts ?? notificationSettings.budgetAlerts
    );

    if (!budgetReminderEnabled || !notificationSettings.emailNotifications) {
      console.log(`⚠️ Budget alerts disabled for user ${user.email}`);
      return { success: false, reason: 'notifications_disabled' };
    }

    const template = emailTemplates.budgetAlert(user.name, category, spent, limit, percentage, options);
    const transporter = createTransporter();

    console.log(`📧 Attempting to send email to: ${user.email}`);

    await transporter.sendMail({
      from: `"Smart Financial Tracker" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: template.subject,
      html: template.html,
    });

    console.log(`✅ Budget alert sent to ${user.email} for ${category} at ${percentage}%`);
    return { success: true };
  } catch (error) {
    console.error('❌ Error sending budget alert:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      response: error.response
    });
    return { success: false, error: error.message };
  }
};

export const sendBillReminder = async (userId, billName, amount, dueDate, daysUntilDue) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      return { success: false, reason: 'user_not_found' };
    }

    const notificationSettings = user.notificationSettings || {
      emailNotifications: true,
      billReminders: true
    };

    if (!notificationSettings.billReminders || !notificationSettings.emailNotifications) {
      console.log(`⚠️ Bill reminders disabled for user ${user.email}`);
      return { success: false, reason: 'notifications_disabled' };
    }

    const template = emailTemplates.billReminder(user.name, billName, amount, dueDate, daysUntilDue);
    const transporter = createTransporter();

    await transporter.sendMail({
      from: `"Smart Financial Tracker" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: template.subject,
      html: template.html,
    });

    console.log(`✅ Bill reminder sent to ${user.email}`);
    return { success: true };
  } catch (error) {
    console.error('Error sending bill reminder:', error);
    return { success: false, error: error.message };
  }
};

export const sendWeeklyReport = async (userId, weekData) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      return { success: false, reason: 'user_not_found' };
    }

    const notificationSettings = user.notificationSettings || {
      emailNotifications: true,
      weeklyReports: true
    };

    if (!notificationSettings.weeklyReports || !notificationSettings.emailNotifications) {
      console.log(`⚠️ Weekly reports disabled for user ${user.email}`);
      return { success: false, reason: 'notifications_disabled' };
    }

    const template = emailTemplates.weeklyReport(user.name, weekData);
    const transporter = createTransporter();

    await transporter.sendMail({
      from: `"Smart Financial Tracker" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: template.subject,
      html: template.html,
    });

    console.log(`✅ Weekly report sent to ${user.email}`);
    return { success: true };
  } catch (error) {
    console.error('Error sending weekly report:', error);
    return { success: false, error: error.message };
  }
};

export const sendTransactionAlert = async (userId, transaction) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      return { success: false, reason: 'user_not_found' };
    }

    const notificationSettings = user.notificationSettings || {
      emailNotifications: true,
      transactionAlerts: true
    };

    if (!notificationSettings.transactionAlerts || !notificationSettings.emailNotifications) {
      console.log(`⚠️ Transaction alerts disabled for user ${user.email}`);
      return { success: false, reason: 'notifications_disabled' };
    }

    const template = emailTemplates.transactionAlert(user.name, transaction);
    const transporter = createTransporter();

    await transporter.sendMail({
      from: `"Smart Financial Tracker" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: template.subject,
      html: template.html,
    });

    console.log(`✅ Transaction alert sent to ${user.email}`);
    return { success: true };
  } catch (error) {
    console.error('Error sending transaction alert:', error);
    return { success: false, error: error.message };
  }
};

/* =========================
   BUDGET CHECK UTILITY
========================= */
export const checkBudgetAndAlert = async (userId, category, currentSpent, budgetLimit) => {
  const percentage = (currentSpent / budgetLimit) * 100;
  
  // Send alerts at 80%, 90%, and 100%
  if (percentage >= 80) {
    await sendBudgetAlert(userId, category, currentSpent, budgetLimit, Math.round(percentage));
  }
};

/* =========================
   TRANSACTION INACTIVITY REMINDER
========================= */
export const sendTransactionInactivityReminder = async (userId, intervalType, lastTransactionDate) => {
  try {
    console.log(`📧 Sending transaction inactivity reminder to user: ${userId}, interval: ${intervalType}`);
    
    const user = await User.findById(userId);
    if (!user) {
      console.log(`❌ User not found: ${userId}`);
      return { success: false, reason: 'user_not_found' };
    }

    const notificationSettings = user.notificationSettings || {
      emailNotifications: true,
      transactionInactivityReminders: false
    };

    if (!notificationSettings.transactionInactivityReminders || !notificationSettings.emailNotifications) {
      console.log(`⚠️ Transaction inactivity reminders disabled for user ${user.email}`);
      return { success: false, reason: 'notifications_disabled' };
    }

    const template = emailTemplates.transactionInactivityReminder(user.name, intervalType, lastTransactionDate);
    const transporter = createTransporter();

    await transporter.sendMail({
      from: `"Smart Financial Tracker" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: template.subject,
      html: template.html,
    });

    console.log(`✅ Transaction inactivity reminder sent to ${user.email}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Error sending transaction inactivity reminder:', error);
    return { success: false, error: error.message };
  }
};

