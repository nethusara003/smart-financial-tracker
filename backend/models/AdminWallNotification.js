import mongoose from "mongoose";

const adminWallNotificationSchema = new mongoose.Schema(
  {
    // Links back to the promotion request
    promotionRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AdminPromotionRequest",
      required: true,
    },
    // What happened
    eventType: {
      type: String,
      enum: [
        "promotion_requested",        // Admin submitted a request
        "promotion_approved",         // Super admin approved
        "promotion_rejected",         // Super admin rejected
        "promotion_accepted_by_user", // User accepted
        "promotion_declined_by_user", // User declined
      ],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    // Who triggered this event
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // The user being promoted (for quick display)
    targetUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Read tracking — per-admin (array of user IDs who have read it)
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

// Primary query pattern: latest-first feed for all admins
adminWallNotificationSchema.index({ createdAt: -1 });

export default mongoose.model("AdminWallNotification", adminWallNotificationSchema);
