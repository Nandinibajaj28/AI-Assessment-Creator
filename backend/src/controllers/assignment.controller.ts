import { Request, Response } from "express";
import {
  createAssignmentRecord,
  deleteAssignmentById,
  getAssignmentById,
  getAssignmentsByOwner,
  regenerateAssignmentRecord,
} from "../services/assignment.service";

export const createAssignment = async (req: Request, res: Response) => {
  try {
    const data = req.body as Record<string, unknown>;
    const ownerId = (req as any).user?.id;
    console.log("[AssignmentAPI] Create assignment API hit");

    if (!ownerId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const assignment = await createAssignmentRecord(ownerId, data);

    res.json({
      message: "Assignment creation started",
      id: assignment._id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[AssignmentAPI] Failed to create assignment:", message);
    res.status(500).json({ error: "Server error" });
  }
};

export const regenerateAssignment = async (req: Request, res: Response) => {
  try {
    const assignmentId = String(req.params.id);
    const ownerId = (req as any).user?.id;

    if (!ownerId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const regeneratedAssignmentId = await regenerateAssignmentRecord(assignmentId, ownerId);

    if (!regeneratedAssignmentId) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    return res.json({
      message: "Assignment regeneration started",
      id: regeneratedAssignmentId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[AssignmentAPI] Failed to regenerate assignment:", message);
    return res.status(500).json({ error: "Server error" });
  }
};

export const getAssignment = async (req: Request, res: Response) => {
  try {
    const ownerId = (req as any).user?.id;
    if (!ownerId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const assignment = await getAssignmentById(String(req.params.id), ownerId);
    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }
    res.json(assignment);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

export const getAssignments = async (req: Request, res: Response) => {
  try {
    const ownerId = (req as any).user?.id;
    if (!ownerId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const assignments = await getAssignmentsByOwner(ownerId);
    return res.json(assignments);
  } catch (error) {
    return res.status(500).json({ error: "Server error" });
  }
};

export const deleteAssignment = async (req: Request, res: Response) => {
  try {
    const ownerId = (req as any).user?.id;
    if (!ownerId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const deleted = await deleteAssignmentById(String(req.params.id), ownerId);
    if (!deleted) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ error: "Server error" });
  }
};
