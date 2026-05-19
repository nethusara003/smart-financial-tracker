import express from "express";
import { handleChat } from "../controllers/chat.controller.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = express.Router();

router.post("/", requireAuth, handleChat);

export default router;