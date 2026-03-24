import { Assignment } from "../models/assignment.model";
import { assignmentQueue } from "../queues/assignment.queue";
import {
  createLocalAssignment,
  deleteLocalAssignment,
  getLocalAssignmentById,
  getLocalAssignmentsByOwner,
  isMongoConnected,
  updateLocalAssignment,
} from "./local-data.service";
import { processAssignmentGeneration } from "./assignment-generation.service";

const queueAssignmentGeneration = async (assignmentId: string, data: Record<string, unknown>) => {
  try {
    const job = await assignmentQueue.add("generateAssignment", {
      assignmentId,
      data,
    });
    console.log(`[AssignmentAPI] Job added to queue for assignment ${assignmentId} with job id ${job.id}`);
  } catch (queueError) {
    const message = queueError instanceof Error ? queueError.message : String(queueError);
    console.error("[AssignmentAPI] Queue add failed, generating assignment inline:", message);

    await processAssignmentGeneration(assignmentId, data);
    console.log(`[AssignmentAPI] Inline generation completed for assignment ${assignmentId}`);
  }
};

export const createAssignmentRecord = async (ownerId: string, data: Record<string, unknown>) => {
  const assignment = isMongoConnected()
    ? await Assignment.create({
        ...data,
        owner: ownerId,
        status: "pending",
      })
    : createLocalAssignment(ownerId, data);

  console.log(`[AssignmentAPI] Assignment created with pending status: ${assignment._id}`);
  await queueAssignmentGeneration(String(assignment._id), data);

  return assignment;
};

export const regenerateAssignmentRecord = async (assignmentId: string, ownerId: string) => {
  const assignment = isMongoConnected()
    ? await Assignment.findOne({ _id: assignmentId, owner: ownerId }).lean()
    : getLocalAssignmentById(assignmentId, ownerId);
  if (!assignment) {
    return null;
  }

  const { _id, createdAt, updatedAt, status, result, __v, ...generationData } =
    assignment as Record<string, unknown>;

  if (isMongoConnected()) {
    await Assignment.findByIdAndUpdate(assignmentId, {
      status: "pending",
      $unset: { result: 1, errorMessage: 1 },
    });
  } else {
    updateLocalAssignment(assignmentId, (current) => ({
      ...current,
      status: "pending",
      result: undefined,
      errorMessage: undefined,
      updatedAt: new Date().toISOString(),
    }));
  }

  await queueAssignmentGeneration(assignmentId, generationData);
  return assignmentId;
};

export const getAssignmentById = (assignmentId: string, ownerId: string) =>
  isMongoConnected()
    ? Assignment.findOne({ _id: assignmentId, owner: ownerId })
    : Promise.resolve(getLocalAssignmentById(assignmentId, ownerId));

export const getAssignmentsByOwner = (ownerId: string) =>
  isMongoConnected()
    ? Assignment.find({ owner: ownerId }).sort({ createdAt: -1 })
    : Promise.resolve(getLocalAssignmentsByOwner(ownerId));

export const deleteAssignmentById = async (assignmentId: string, ownerId: string) => {
  if (isMongoConnected()) {
    const deleted = await Assignment.findOneAndDelete({ _id: assignmentId, owner: ownerId });
    return Boolean(deleted);
  }

  return deleteLocalAssignment(assignmentId, ownerId);
};
