import { Request, Response } from "express";
import { Assignment } from "../models/assignment.model";
import { assignmentQueue } from "../queues/assignment.queue";

export const createAssignment = async (req: Request, res: Response) => {
  try {
    const data = req.body;

    const assignment = await Assignment.create({
      ...data,
      status: "pending"
    });

    await assignmentQueue.add("generateAssignment", {
      assignmentId: assignment._id,
      data
    });

    res.json({
      message: "Assignment creation started",
      id: assignment._id
    });

  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};
