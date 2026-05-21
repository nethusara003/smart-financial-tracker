import Bill from "../models/Bill.js";
import { sendBillReminder } from "../Services/notificationService.js";
import Notification from "../models/Notification.js";
import Transaction from "../models/Transaction.js";

/* =========================
   GET ALL BILLS
========================= */
export const getBills = async (req, res) => {
  try {
    const userId = req.user._id;
    const bills = await Bill.find({ userId }).sort({ dueDate: 1 });
    
    res.json({ bills });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* =========================
   CREATE BILL
========================= */
export const createBill = async (req, res) => {
  try {
    const userId = req.user._id;
    const { name, amount, category, dueDate, recurring, frequency, reminderDays, autoPay, notes } = req.body;

    if (!name || !amount || !category || !dueDate) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const bill = await Bill.create({
      userId,
      name,
      amount,
      category,
      dueDate,
      recurring: recurring || false,
      frequency: frequency || 'monthly',
      reminderDays: reminderDays || 3,
      autoPay: autoPay || false,
      notes: notes || ''
    });

    // Check if we need to send an immediate reminder email
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const daysUntilDue = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const reminderSchedule = [7, 3, 1];

    if (reminderSchedule.includes(daysUntilDue)) {
      await sendBillReminder(bill.userId, bill.name, bill.amount, bill.dueDate, daysUntilDue);
      bill.lastReminderSent = today;
      await bill.save();
    }

    // Create in-app notification
    await Notification.create({
      userId,
      type: 'bill_reminder',
      title: 'New Bill Added',
      message: `${name} - $${amount.toFixed(2)} due on ${new Date(dueDate).toLocaleDateString()}`,
      icon: 'Calendar',
      color: 'info',
      actionUrl: '/dashboard'
    });

    res.status(201).json({ bill });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* =========================
   UPDATE BILL
========================= */
export const updateBill = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const bill = await Bill.findOne({ _id: id, userId });
    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }

    const allowedUpdates = ['name', 'amount', 'category', 'dueDate', 'recurring', 'frequency', 'reminderDays', 'autoPay', 'notes', 'isPaid', 'paidDate'];
    const updates = {};
    
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    // Check if the due date got updated and needs an immediate reminder
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastReminder = bill.lastReminderSent ? new Date(bill.lastReminderSent) : null;
    const alreadySentToday = lastReminder && lastReminder.toDateString() === today.toDateString();

    Object.assign(bill, updates);
    await bill.save();

    if (updates.dueDate && !alreadySentToday) {
      const due = new Date(updates.dueDate);
      due.setHours(0, 0, 0, 0);
      const daysUntilDue = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const reminderSchedule = [7, 3, 1];

      if (reminderSchedule.includes(daysUntilDue)) {
        await sendBillReminder(bill.userId, bill.name, bill.amount, bill.dueDate, daysUntilDue);
        bill.lastReminderSent = today;
        await bill.save();
      }
    }

    res.json({ bill });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* =========================
   DELETE BILL
========================= */
export const deleteBill = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const bill = await Bill.findOneAndDelete({ _id: id, userId });
    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }

    res.json({ message: "Bill deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* =========================
   MARK BILL AS PAID
========================= */
export const markBillAsPaid = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const { createTransaction = true } = req.body || {};

    const bill = await Bill.findOne({ _id: id, userId });
    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }

    if (bill.isPaid) {
      return res.status(400).json({ message: "Bill is already marked as paid" });
    }

    bill.isPaid = true;
    bill.paidDate = new Date();

    // Create transaction entry so payment appears across the system.
    if (createTransaction) {
      const categoryMap = {
        electricity: 'Utilities',
        water: 'Utilities',
        gas: 'Utilities',
        internet: 'Utilities',
        phone: 'Utilities',
        utilities: 'Utilities',
        rent: 'Rent',
        mortgage: 'Rent',
        insurance: 'Insurance',
        subscription: 'Subscriptions',
        credit_card: 'Other Expense',
        loan: 'Loan Payment',
        other: 'Other Expense',
      };

      await Transaction.create({
        user: userId,
        type: 'expense',
        category: categoryMap[bill.category] || 'Other Expense',
        amount: bill.amount,
        note: `Bill Payment - ${bill.name}`,
        date: new Date(),
      });
    }

    // If recurring, clone the bill for the next cycle
    if (bill.recurring) {
      const nextDueDate = new Date(bill.dueDate);
      
      switch (bill.frequency) {
        case 'weekly':
          nextDueDate.setDate(nextDueDate.getDate() + 7);
          break;
        case 'biweekly':
          nextDueDate.setDate(nextDueDate.getDate() + 14);
          break;
        case 'monthly':
          nextDueDate.setMonth(nextDueDate.getMonth() + 1);
          break;
        case 'quarterly':
          nextDueDate.setMonth(nextDueDate.getMonth() + 3);
          break;
        case 'yearly':
          nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);
          break;
      }
      
      const newBillData = bill.toObject();
      delete newBillData._id;
      delete newBillData.createdAt;
      delete newBillData.updatedAt;
      
      newBillData.dueDate = nextDueDate;
      newBillData.isPaid = false;
      newBillData.paidDate = null;
      newBillData.lastReminderSent = null;
      
      await Bill.create(newBillData);
    }

    await bill.save();

    res.json({ bill, message: "Bill marked as paid" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* =========================
   GET UPCOMING BILLS
========================= */
export const getUpcomingBills = async (req, res) => {
  try {
    const userId = req.user._id;
    const daysAhead = parseInt(req.query.days) || 7;

    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + daysAhead);

    const bills = await Bill.find({
      userId,
      dueDate: { $gte: today, $lte: futureDate },
      isPaid: false
    }).sort({ dueDate: 1 });

    res.json({ bills, count: bills.length });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* =========================
   SEND BILL REMINDERS (CRON JOB)
========================= */
export const sendBillReminders = async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find all bills that need reminders
    const bills = await Bill.find({ isPaid: false });

    for (const bill of bills) {
      const dueDate = new Date(bill.dueDate);
      dueDate.setHours(0, 0, 0, 0);

      const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      // Send reminder if within 7, 3, or 1 days of due date, and not already sent today
      const lastReminder = bill.lastReminderSent ? new Date(bill.lastReminderSent) : null;
      const alreadySentToday = lastReminder && lastReminder.toDateString() === today.toDateString();
      const reminderSchedule = [7, 3, 1];

      if (reminderSchedule.includes(daysUntilDue) && !alreadySentToday) {
        // Send email notification
        await sendBillReminder(bill.userId, bill.name, bill.amount, bill.dueDate, daysUntilDue);

        // Create in-app notification
        await Notification.create({
          userId: bill.userId,
          type: 'bill_reminder',
          title: `Bill Due ${daysUntilDue === 0 ? 'Today' : `in ${daysUntilDue} day${daysUntilDue > 1 ? 's' : ''}`}`,
          message: `${bill.name} - $${bill.amount.toFixed(2)}`,
          data: { billId: bill._id, dueDate: bill.dueDate },
          icon: 'AlertCircle',
          color: daysUntilDue <= 1 ? 'danger' : 'warning',
          actionUrl: '/dashboard'
        });

        // Update last reminder sent
        bill.lastReminderSent = today;
        await bill.save();

        console.log(`✅ Reminder sent for bill: ${bill.name} (due in ${daysUntilDue} days)`);
      }
    }

    console.log('✅ Bill reminders check completed');
  } catch (error) {
    console.error('Error sending bill reminders:', error);
  }
};
