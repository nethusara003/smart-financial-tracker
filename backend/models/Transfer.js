import mongoose from "mongoose";

const TransferSchema = new mongoose.Schema({
  // Transfer Parties
  sender: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    userName: {
      type: String,
      required: true
    },
    userEmail: {
      type: String,
      required: true
    },
    accountNumber: {
      type: String,
      default: null
    }
  },
  
  receiver: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    userName: {
      type: String,
      required: true
    },
    userEmail: {
      type: String,
      required: true
    },
    accountNumber: {
      type: String,
      default: null
    }
  },
  
  // Transfer Details
  amount: {
    type: Number,
    required: true,
    min: 0.01
  },
  
  currency: {
    type: String,
    default: 'USD'
  },
  
  fee: {
    type: Number,
    default: 0
  },
  
  netAmount: {
    type: Number,
    required: true
  },
  
  // Transfer Status
  status: {
    type: String,
    enum: ['initiated', 'pending', 'processing', 'completed', 'failed', 'cancelled', 'reversed'],
    default: 'initiated',
    index: true
  },
  
  // Transaction References (link to actual transaction records)
  senderTransactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction'
  },
  
  receiverTransactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction'
  },
  
  // Transfer Metadata
  description: {
    type: String,
    maxLength: 500,
    default: ''
  },
  
  category: {
    type: String,
    default: 'transfer'
  },
  
  transferType: {
    type: String,
    enum: ['standard', 'request', 'recurring', 'split'],
    default: 'standard'
  },

  // Optional scheduling metadata
  scheduledFor: {
    type: Date,
    default: null,
    index: true,
  },

  processingMode: {
    type: String,
    enum: ['instant', 'scheduled'],
    default: 'instant',
  },

  // Risk and intelligence metadata snapshot
  riskScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },

  riskLevel: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'low',
  },

  intelligenceSnapshot: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  
  // Security & Validation
  senderBalanceAtTransfer: {
    type: Number,
    default: 0
  },
  
  validatedAt: {
    type: Date
  },
  
  processedAt: {
    type: Date
  },
  
  // Error Handling
  failureReason: {
    type: String
  },
  
  errorCode: {
    type: String
  },
  
  // Reversal Information
  isReversible: {
    type: Boolean,
    default: true
  },
  
  reversalDeadline: {
    type: Date
  },
  
  reversedAt: {
    type: Date
  },
  
  reversalReason: {
    type: String
  },
  
  reversalInitiatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Audit Trail
  ipAddress: {
    type: String
  },
  
  userAgent: {
    type: String
  },
  
  deviceType: {
    type: String,
    enum: ['web', 'mobile', 'api'],
    default: 'web'
  }
}, {
  timestamps: true
});

// Indexes for performance
TransferSchema.index({ 'sender.userId': 1, createdAt: -1 });
TransferSchema.index({ 'receiver.userId': 1, createdAt: -1 });
TransferSchema.index({ status: 1, createdAt: -1 });
TransferSchema.index({ status: 1, scheduledFor: 1 });
TransferSchema.index({ 'sender.userId': 1, status: 1, createdAt: -1 });
TransferSchema.index({ 'receiver.userId': 1, status: 1, createdAt: -1 });

// Text search index
TransferSchema.index({ 
  description: 'text', 
  'sender.userName': 'text', 
  'receiver.userName': 'text' 
});

// Virtual field for completedAt
TransferSchema.virtual('completedAt').get(function() {
  return this.status === 'completed' ? this.processedAt : null;
});

// Method to check if transfer can be cancelled
TransferSchema.methods.canBeCancelled = function() {
  return ['initiated', 'pending'].includes(this.status);
};

// Method to check if transfer can be reversed
TransferSchema.methods.canBeReversed = function() {
  if (this.status !== 'completed') return false;
  if (!this.isReversible) return false;
  if (!this.reversalDeadline) return false;
  return new Date() <= this.reversalDeadline;
};

export default mongoose.model('Transfer', TransferSchema);
