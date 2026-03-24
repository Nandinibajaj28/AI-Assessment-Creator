import express from "express";
import { login, me, signup } from "../controllers/auth.controller";
import { requireAuth } from "../middleware/auth.middleware";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.get("/me", requireAuth, me);

export default router;
