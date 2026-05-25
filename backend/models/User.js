import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      default: "",
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    googleId: {
      type: String,
      default: null,
    },
    role: {
      type: String,
      enum: ["super_admin", "admin", "user"],
      default: "user",
    },
    subscriptionTier: {
      type: String,
      enum: ["free", "premium"],
      default: "free",
    },
    currency: {
      type: String,
      enum: ["LKR", "USD", "EUR", "GBP", "INR", "AUD", "CAD", "SGD", "JPY", "CNY"],
      default: "LKR",
    },
    monthlySalary: {
      type: Number,
      min: 0,
      default: null,
    },
    savingsPercentage: {
      type: Number,
      min: 0,
      max: 99.99,
      default: 20,
    },
    expenseStartMode: {
      type: String,
      enum: ["include_existing", "start_from_now"],
      default: "include_existing",
    },
    expenseStartDate: {
      type: Date,
      default: null,
    },
    budgetPeriodDays: {
      type: Number,
      min: 1,
      max: 365,
      default: 30,
    },
    budgetPeriodStartDate: {
      type: Date,
      default: null,
    },
    phone: {
      type: String,
      default: "",
    },
    bio: {
      type: String,
      default: "",
    },
    profilePicture: {
      type: String,
      default: "",
    },
    notificationSettings: {
      type: mongoose.Schema.Types.Mixed,
      default: {
        emailNotifications: true,
        pushNotifications: false,
        budgetAlerts: true,
        billReminders: true,
        weeklyReports: true,
        transactionAlerts: true,
        goalUpdates: true,
        budgetEmailAlerts: true, // Advanced budget reminders (category near-limit + overall critical)
        transactionInactivityReminders: false, // Remind if no transactions recorded
        inactivityReminderInterval: '1day' // 2hours, 4hours, 6hours, 12hours, 1day, 2days
      }
    },
    overallBudgetLastAlertLevel: {
      type: String,
      enum: [null, '90', 'exceeded'],
      default: null,
    },
    overallBudgetLastAlertDate: {
      type: Date,
      default: null,
    },
    lastTransactionInactivityReminderSentAt: {
      type: Date,
      default: null,
    },
    privacySettings: {
      type: mongoose.Schema.Types.Mixed,
      default: {
        twoFactorAuth: false,
        sessionTimeout: "30",
        loginNotifications: true,
        dataSharing: false
      }
    },
    resetPasswordToken: {
      type: String,
    },
    resetPasswordExpires: {
      type: Date,
    },
    twoFactorLoginCodeHash: {
      type: String,
      select: false,
    },
    twoFactorLoginCodeExpires: {
      type: Date,
      select: false,
    },
    twoFactorTrustedDevices: {
      type: [
        {
          deviceHash: {
            type: String,
            required: true,
          },
          expiresAt: {
            type: Date,
            required: true,
          },
        },
      ],
      default: [],
    },
    // Transfer-related fields
    transferPin: {
      type: String,
      select: false, // Don't include in queries by default
    },
    transferSettings: {
      type: mongoose.Schema.Types.Mixed,
      default: {
        requirePinAboveAmount: 1000, // Require PIN for transfers above this amount
        autoAcceptTransfers: true, // Auto-accept incoming transfers
        allowTransferRequests: true, // Allow others to request money
        notifyOnTransfer: true, // Notify on transfer activity
      }
    },
    transferLimits: {
      type: mongoose.Schema.Types.Mixed,
      default: {
        singleTransfer: 500000, // Max single transfer amount
        dailyLimit: 50000, // Daily transfer limit
        monthlyLimit: 200000, // Monthly transfer limit
        remainingDaily: 50000, // Remaining daily limit
        remainingMonthly: 200000, // Remaining monthly limit
        lastResetDate: new Date(),
      }
    },
    transferStats: {
      type: mongoose.Schema.Types.Mixed,
      default: {
        totalSent: 0,
        totalReceived: 0,
        transferCount: 0,
        lastTransferDate: null,
      }
    },
    transferOtpProfile: {
      type: mongoose.Schema.Types.Mixed,
      default: {
        phoneNumber: "",
        preferredChannel: "sms",
        phoneVerifiedAt: null,
      },
    },
    savedTransferRecipients: {
      type: [
        {
          userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
          },
          name: {
            type: String,
            default: "",
          },
          email: {
            type: String,
            default: "",
          },
          profilePicture: {
            type: String,
            default: "",
          },
          createdAt: {
            type: Date,
            default: Date.now,
          },
          lastUsedAt: {
            type: Date,
            default: Date.now,
          },
          useCount: {
            type: Number,
            default: 1,
          },
        },
      ],
      default: [],
    },
    accountNumber: {
      type: String,
      unique: true,
      sparse: true,
    },
  },
  { timestamps: true }
);

// Pre-save hook to generate unique account number
userSchema.pre("save", async function () {
  if (!this.accountNumber) {
    let isUnique = false;
    let accNum = "";
    while (!isUnique) {
      accNum = "SFT-" + Math.floor(100000 + Math.random() * 900000);
      const existing = await mongoose.model("User").findOne({ accountNumber: accNum });
      if (!existing) {
        isUnique = true;
      }
    }
    this.accountNumber = accNum;
  }
});

// Add index on createdAt to optimize admin dashboard sorting
userSchema.index({ createdAt: -1 });

export default mongoose.model("User", userSchema);
