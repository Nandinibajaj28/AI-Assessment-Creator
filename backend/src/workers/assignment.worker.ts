import dotenv from "dotenv";
dotenv.config();

import { Worker } from "bullmq";
import { connection } from "../config/redis";
import { connectDB } from "../config/db";
import { Assignment } from "../models/assignment.model";
import { generateQuestions } from "../services/ai.service";
import { ASSIGNMENT_QUEUE_NAME } from "../queues/assignment.queue";

connectDB();

const worker = new Worker(
    ASSIGNMENT_QUEUE_NAME,
    async (job) => {
        const { assignmentId, data } = job.data;
        console.log("Processing job", job.id);

        const result = await generateQuestions(data);

        await Assignment.findByIdAndUpdate(assignmentId, {
            status: "completed",
            result
        });

        console.log("Assignment completed", assignmentId.toString());

        return { assignmentId, result };
    },
    { connection: connection as any }
);

worker.on("ready", () => {
    console.log("Assignment Worker is ready and connected to Redis");
});

worker.on("failed", (job, err) => {
    console.error(`Job ${job?.id} failed with error: ${err.message}`);
});

export default worker;
