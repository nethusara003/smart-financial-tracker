import AdminPromotionRequest from "../models/AdminPromotionRequest.js";
import AdminWallNotification from "../models/AdminWallNotification.js";
import AdminAudit from "../models/AdminAudit.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import { createNotification } from "./notificationController.js";

/* =========================
   HELPERS
========================= */
const ACTIVE_STATUSES = ["pending_super_admin", "pending_user_accept"];

const createWallNotification = async ({
  promotionRequestId,
  eventType,
  title,
  message,
  actor,
  targetUser,
}) => {
  try {
    return await AdminWallNotification.create({
      promotionRequestId,
      eventType,
      title,
      message,
      actor,
      targetUser,
    });
  } catch (error) {
    console.error("Error creating admin wall notification:", error);
    return null;
  }
};

/* =========================
   1. REQUEST PROMOTION
   POST /admin/promotions/request
   Auth: requireAuth + requireAdmin
========================= */
export const requestPromotion = async (req, res) => {
  try {
    const { userId, reason } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "Target userId is required" });
    }

    // Cannot promote yourself
    if (req.user.id === userId) {
      return res
        .status(400)
        .json({ message: "You cannot request a promotion for yourself" });
    }

    // Validate target user exists and is a regular user
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (targetUser.role !== "user") {
      return res.status(400).json({
        message: "Only regular users can be promoted to admin",
      });
    }

    // Check for existing active promotion request for this user
    const existingRequest = await AdminPromotionRequest.findOne({
      targetUser: userId,
      status: { $in: ACTIVE_STATUSES },
    });

    if (existingRequest) {
      return res.status(409).json({
        message: "A promotion request for this user is already pending",
      });
    }

    // Create the promotion request
    const promotionRequest = await AdminPromotionRequest.create({
      requestedBy: req.user.id,
      targetUser: userId,
      reason: reason || "",
      status: "pending_super_admin",
    });

    // Post to Admin Wall
    await createWallNotification({
      promotionRequestId: promotionRequest._id,
      eventType: "promotion_requested",
      title: "Promotion Request Submitted",
      message: `Admin "${req.user.name || req.user.email}" has requested to promote user "${targetUser.name || targetUser.email}" to admin.`,
      actor: req.user.id,
      targetUser: userId,
    });

    // Audit log
    await AdminAudit.create({
      action: "PROMOTION_REQUESTED",
      performedBy: req.user.id,
      targetUser: userId,
      performedByRole: req.user.role,
    });

    res.status(201).json({
      message: "Promotion request submitted for super admin approval",
      requestId: promotionRequest._id,
    });
  } catch (error) {
    console.error("Request promotion error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/* =========================
   2. REVIEW PROMOTION
   PATCH /admin/promotions/:requestId/review
   Auth: requireAuth + requireSuperAdmin
========================= */
export const reviewPromotion = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { decision } = req.body;

    if (!["approve", "reject"].includes(decision)) {
      return res.status(400).json({
        message: 'Decision must be "approve" or "reject"',
      });
    }

    const promotionRequest = await AdminPromotionRequest.findById(requestId)
      .populate("requestedBy", "name email")
      .populate("targetUser", "name email role");

    if (!promotionRequest) {
      return res.status(404).json({ message: "Promotion request not found" });
    }

    if (promotionRequest.status !== "pending_super_admin") {
      return res.status(400).json({
        message: `This request has already been reviewed (status: ${promotionRequest.status})`,
      });
    }

    // Double-check the target user is still a regular user
    if (promotionRequest.targetUser.role !== "user") {
      promotionRequest.status = "rejected_by_super";
      promotionRequest.reviewedBy = req.user.id;
      promotionRequest.reviewedAt = new Date();
      await promotionRequest.save();

      return res.status(400).json({
        message: "Target user is no longer a regular user",
      });
    }

    if (decision === "approve") {
      // Update request status
      promotionRequest.status = "pending_user_accept";
      promotionRequest.reviewedBy = req.user.id;
      promotionRequest.reviewedAt = new Date();
      await promotionRequest.save();

      // Post to Admin Wall
      await createWallNotification({
        promotionRequestId: promotionRequest._id,
        eventType: "promotion_approved",
        title: "Promotion Request Approved",
        message: `Super Admin "${req.user.name || req.user.email}" approved the promotion of "${promotionRequest.targetUser.name || promotionRequest.targetUser.email}" to admin. Awaiting user response.`,
        actor: req.user.id,
        targetUser: promotionRequest.targetUser._id,
      });

      // Send regular notification to the target user
      await createNotification(
        promotionRequest.targetUser._id,
        "system",
        "Admin Role Invitation",
        "You have been invited to become an admin. Please accept or decline this invitation from your notifications.",
        { promotionRequestId: promotionRequest._id.toString() },
        "Shield",
        "primary",
        null
      );

      // Audit log
      await AdminAudit.create({
        action: "PROMOTION_APPROVED",
        performedBy: req.user.id,
        targetUser: promotionRequest.targetUser._id,
        performedByRole: req.user.role,
      });

      return res.json({
        message: "Promotion approved. User has been notified to accept or decline.",
      });
    }

    // decision === "reject"
    promotionRequest.status = "rejected_by_super";
    promotionRequest.reviewedBy = req.user.id;
    promotionRequest.reviewedAt = new Date();
    await promotionRequest.save();

    // Post to Admin Wall
    await createWallNotification({
      promotionRequestId: promotionRequest._id,
      eventType: "promotion_rejected",
      title: "Promotion Request Rejected",
      message: `Super Admin "${req.user.name || req.user.email}" rejected the promotion of "${promotionRequest.targetUser.name || promotionRequest.targetUser.email}".`,
      actor: req.user.id,
      targetUser: promotionRequest.targetUser._id,
    });

    // Audit log
    await AdminAudit.create({
      action: "PROMOTION_REJECTED",
      performedBy: req.user.id,
      targetUser: promotionRequest.targetUser._id,
      performedByRole: req.user.role,
    });

    return res.json({ message: "Promotion request rejected." });
  } catch (error) {
    console.error("Review promotion error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/* =========================
   3. USER RESPOND TO PROMOTION
   PATCH /admin/promotions/:requestId/respond
   Auth: requireAuth (NO requireAdmin — the user is still a regular user)
========================= */
export const userRespondToPromotion = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { decision } = req.body;

    if (!["accept", "reject"].includes(decision)) {
      return res.status(400).json({
        message: 'Decision must be "accept" or "reject"',
      });
    }

    const promotionRequest = await AdminPromotionRequest.findById(requestId)
      .populate("requestedBy", "name email");

    if (!promotionRequest) {
      return res.status(404).json({ message: "Promotion request not found" });
    }

    // Only the target user can respond
    if (promotionRequest.targetUser.toString() !== req.user.id) {
      return res.status(403).json({
        message: "You are not authorised to respond to this request",
      });
    }

    if (promotionRequest.status !== "pending_user_accept") {
      return res.status(400).json({
        message: `This request is not awaiting your response (status: ${promotionRequest.status})`,
      });
    }

    if (decision === "accept") {
      // Promote the user
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      user.role = "admin";
      await user.save();

      // Update request status
      promotionRequest.status = "accepted_by_user";
      promotionRequest.userRespondedAt = new Date();
      await promotionRequest.save();

      // Post to Admin Wall
      await createWallNotification({
        promotionRequestId: promotionRequest._id,
        eventType: "promotion_accepted_by_user",
        title: "Promotion Accepted",
        message: `User "${user.name || user.email}" has accepted the admin role.`,
        actor: req.user.id,
        targetUser: req.user.id,
      });

      // Audit log
      await AdminAudit.create({
        action: "PROMOTION_ACCEPTED_BY_USER",
        performedBy: req.user.id,
        targetUser: req.user.id,
        performedByRole: "user",
      });

      // Update the user's notification to reflect resolution and remove buttons
      try {
        await Notification.findOneAndUpdate(
          {
            userId: req.user.id,
            "data.promotionRequestId": requestId,
          },
          {
            $set: {
              title: "Admin Role Invitation (Accepted)",
              message: "You have accepted the invitation to become an admin. Please log in again for changes to take effect.",
              color: "success",
              icon: "CheckCircle",
              read: true,
            },
            $unset: {
              "data.promotionRequestId": 1,
            },
          }
        );
      } catch (err) {
        console.error("Error updating accepted notification:", err);
      }

      return res.json({
        message: "You are now an admin. Please log in again for changes to take effect.",
        newRole: "admin",
      });
    }

    // decision === "reject"
    promotionRequest.status = "rejected_by_user";
    promotionRequest.userRespondedAt = new Date();
    await promotionRequest.save();

    // Post to Admin Wall
    const user = await User.findById(req.user.id).select("name email");

    await createWallNotification({
      promotionRequestId: promotionRequest._id,
      eventType: "promotion_declined_by_user",
      title: "Promotion Declined",
      message: `User "${user?.name || user?.email || "Unknown"}" has declined the admin role.`,
      actor: req.user.id,
      targetUser: req.user.id,
    });

    // Audit log
    await AdminAudit.create({
      action: "PROMOTION_DECLINED_BY_USER",
      performedBy: req.user.id,
      targetUser: req.user.id,
      performedByRole: "user",
    });

    // Update the user's notification to reflect resolution and remove buttons
    try {
      await Notification.findOneAndUpdate(
        {
          userId: req.user.id,
          "data.promotionRequestId": requestId,
        },
        {
          $set: {
            title: "Admin Role Invitation (Declined)",
            message: "You have declined the invitation to become an admin.",
            color: "danger",
            icon: "XCircle",
            read: true,
          },
          $unset: {
            "data.promotionRequestId": 1,
          },
        }
      );
    } catch (err) {
      console.error("Error updating declined notification:", err);
    }

    return res.json({ message: "You have declined the admin promotion." });
  } catch (error) {
    console.error("User respond to promotion error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/* =========================
   4. GET PROMOTION REQUESTS
   GET /admin/promotions
   Auth: requireAuth + requireAdmin
========================= */
export const getPromotionRequests = async (req, res) => {
  try {
    const { status } = req.query;

    const query = {};
    if (status) {
      query.status = status;
    }

    const requests = await AdminPromotionRequest.find(query)
      .populate("requestedBy", "name email")
      .populate("targetUser", "name email role")
      .populate("reviewedBy", "name email")
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(requests);
  } catch (error) {
    console.error("Get promotion requests error:", error);
    res.status(500).json({ message: "Failed to fetch promotion requests" });
  }
};

/* =========================
   5. GET ADMIN WALL NOTIFICATIONS
   GET /admin/wall-notifications
   Auth: requireAuth + requireAdmin
========================= */
export const getAdminWallNotifications = async (req, res) => {
  try {
    const notifications = await AdminWallNotification.find()
      .populate("actor", "name email")
      .populate("targetUser", "name email")
      .populate("promotionRequestId", "status")
      .sort({ createdAt: -1 })
      .limit(100);

    // Add a computed `read` flag for the current user
    const userId = req.user.id;
    const enriched = notifications.map((n) => {
      const obj = n.toObject();
      obj.read = (obj.readBy || []).some(
        (id) => id.toString() === userId
      );
      // Don't expose the full readBy array to the client
      delete obj.readBy;
      return obj;
    });

    const unreadCount = enriched.filter((n) => !n.read).length;

    res.json({ notifications: enriched, unreadCount });
  } catch (error) {
    console.error("Get admin wall notifications error:", error);
    res.status(500).json({ message: "Failed to fetch admin notifications" });
  }
};

/* =========================
   6. MARK ADMIN WALL NOTIFICATION READ
   PATCH /admin/wall-notifications/:id/read
   Auth: requireAuth + requireAdmin
========================= */
export const markAdminWallNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = await AdminWallNotification.findByIdAndUpdate(
      id,
      { $addToSet: { readBy: userId } },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.json({ message: "Marked as read" });
  } catch (error) {
    console.error("Mark admin wall notification read error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
