import { Queue, QueueEvents } from "bullmq";
import { connection } from "../config/redis";

export const ASSIGNMENT_QUEUE_NAME = "assignmentQueue";

export const assignmentQueue = new Queue(ASSIGNMENT_QUEUE_NAME, {
  connection: connection as any
});

export const assignmentQueueEvents = new QueueEvents(ASSIGNMENT_QUEUE_NAME, {
  connection: connection as any
});
