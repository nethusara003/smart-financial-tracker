import express from "express";
console.log("✅ userRoutes loaded");

import {
  registerUser,
  loginUser,
  googleLogin,
  guestLogin,
  forgotPassword,
  resetPassword,
  getUserProfile,
  updateCurrency,
  updateBudgetSettings,
  changePassword,
  updateProfile,
  updateNotificationSettings,
  updatePrivacySettings,
  exportUserData,
  deleteAccount,
  setTransferPin,
  checkTransferPin,
} from "../controllers/userController.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { triggerWeeklyReport } from "../utils/weeklyReportScheduler.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/google-login", googleLogin);
router.post("/guest-login", guestLogin);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/profile", requireAuth, getUserProfile);
router.post("/update-currency", requireAuth, updateCurrency);
router.put("/budget-settings", requireAuth, updateBudgetSettings);
router.post("/change-password", requireAuth, changePassword);
router.put("/profile", requireAuth, updateProfile);
router.put("/notification-settings", requireAuth, updateNotificationSettings);
router.put("/privacy-settings", requireAuth, updatePrivacySettings);
router.get("/export-data", requireAuth, exportUserData);
router.post("/delete-account", requireAuth, deleteAccount);
router.post("/trigger-weekly-report", requireAuth, triggerWeeklyReport);
router.post("/set-transfer-pin", requireAuth, setTransferPin);
router.get("/check-transfer-pin", requireAuth, checkTransferPin);

export default router;

