import mongoose from "mongoose";

const adminPromotionRequestSchema = new mongoose.Schema(
  {
    // Admin who initiated the request
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // User being nominated for promotion
    targetUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Lifecycle status
    status: {
      type: String,
      enum: [
        "pending_super_admin",   // Waiting for super admin approval
        "rejected_by_super",     // Super admin rejected
        "pending_user_accept",   // Super admin approved; waiting for user
        "accepted_by_user",      // User accepted → role changed to admin
        "rejected_by_user",      // User declined the promotion
      ],
      default: "pending_super_admin",
    },
    // Optional reason / note from the requesting admin
    reason: { type: String, default: "" },
    // Super admin who acted on the request
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: { type: Date, default: null },
    // User response timestamp
    userRespondedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Compound index for efficient status-based queries sorted by creation time
adminPromotionRequestSchema.index({ status: 1, createdAt: -1 });

// Prevent duplicate pending requests for the same target user
adminPromotionRequestSchema.index(
  { targetUser: 1, status: 1 },
  {
    partialFilterExpression: {
      status: { $in: ["pending_super_admin", "pending_user_accept"] },
    },
  }
);

export default mongoose.model("AdminPromotionRequest", adminPromotionRequestSchema);
