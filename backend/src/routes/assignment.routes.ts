import express from "express";
import {
  createAssignment,
  deleteAssignment,
  getAssignment,
  getAssignments,
  regenerateAssignment
} from "../controllers/assignment.controller";
import { requireAuth } from "../middleware/auth.middleware";

const router = express.Router();

router.use(requireAuth);
router.get("/", getAssignments);
router.post("/", createAssignment);
router.post("/:id/regenerate", regenerateAssignment);
router.get("/:id", getAssignment);
router.delete("/:id", deleteAssignment);

export default router;
