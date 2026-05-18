import express from "express";
import {
  inviteAdmin,
  getAllUsers,
  promoteToAdmin,
  demoteToUser,
  getRecentAuditLogs,
} from "../controllers/adminController.js";

import requireAuth from "../middleware/requireAuth.js";
import requireAdmin from "../middleware/requireAdmin.js";
import requireSuperAdmin from "../middleware/requireSuperAdmin.js";
import { acceptAdminInvite } from "../controllers/adminAcceptController.js";

import {
  getUserTransactions,
  getAllTransactions,
} from "../controllers/adminTransactionController.js";
import { getAdminAnalyticsOverview } from "../controllers/adminAnalyticsController.js";

import {
  requestPromotion,
  reviewPromotion,
  userRespondToPromotion,
  getPromotionRequests,
  getAdminWallNotifications,
  markAdminWallNotificationRead,
} from "../controllers/promotionWorkflowController.js";

const router = express.Router();

/* =========================
   ADMIN MANAGEMENT
========================= */
router.post("/invite", requireAuth, requireAdmin, inviteAdmin);
router.post("/accept-invite", acceptAdminInvite);

router.get("/users", requireAuth, requireAdmin, getAllUsers);

router.patch(
  "/promote/:userId",
  requireAuth,
  requireAdmin,
  promoteToAdmin
);

router.patch(
  "/demote/:userId",
  requireAuth,
  requireAdmin,
  demoteToUser
);

/* =========================
   PROMOTION WORKFLOW
========================= */
router.post("/promotions/request", requireAuth, requireAdmin, requestPromotion);
router.patch("/promotions/:requestId/review", requireAuth, requireSuperAdmin, reviewPromotion);
router.patch("/promotions/:requestId/respond", requireAuth, userRespondToPromotion);
router.get("/promotions", requireAuth, requireAdmin, getPromotionRequests);

/* =========================
   ADMIN NOTIFICATION WALL
========================= */
router.get("/wall-notifications", requireAuth, requireAdmin, getAdminWallNotifications);
router.patch("/wall-notifications/:id/read", requireAuth, requireAdmin, markAdminWallNotificationRead);

/* =========================
   TRANSACTIONS
========================= */
router.get(
  "/users/:userId/transactions",
  requireAuth,
  requireAdmin,
  getUserTransactions
);

router.get(
  "/transactions",
  requireAuth,
  requireAdmin,
  getAllTransactions
);

/* =========================
   ANALYTICS (STEP 3)
========================= */
router.get(
  "/analytics/overview",
  requireAuth,
  requireAdmin,
  getAdminAnalyticsOverview
);

/* =========================
   AUDIT LOGS
========================= */
router.get(
  "/audit-logs",
  requireAuth,
  requireAdmin,
  getRecentAuditLogs
);

export default router;
