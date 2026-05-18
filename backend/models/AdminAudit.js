import mongoose from "mongoose";

const adminAuditSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: [
        "PROMOTE",
        "DEMOTE",
        "PROMOTION_REQUESTED",
        "PROMOTION_APPROVED",
        "PROMOTION_REJECTED",
        "PROMOTION_ACCEPTED_BY_USER",
        "PROMOTION_DECLINED_BY_USER",
      ],
      required: true,
    },

    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    targetUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    performedByRole: {
      type: String,
      enum: ["admin", "super_admin", "user"],
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("AdminAudit", adminAuditSchema);
