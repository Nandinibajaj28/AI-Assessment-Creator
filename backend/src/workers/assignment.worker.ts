import dotenv from "dotenv";
dotenv.config();

import { Worker } from "bullmq";
import { bullRedisConfig } from "../config/redis";
import { connectDB } from "../config/db";
import { Assignment } from "../models/assignment.model";
import { getLocalAssignmentById, isMongoConnected, updateLocalAssignment } from "../services/local-data.service";
import { processAssignmentGeneration } from "../services/assignment-generation.service";

connectDB();

const FALLBACK_RESULT = {
  sections: [
    {
      title: "Section A",
      instruction: "Attempt all questions",
      questions: [
        {
          text: "What fact is directly stated in the provided material?",
          difficulty: "easy" as const,
          marks: 2,
          sourceLine: "No source text was extracted from the uploaded material."
        }
      ]
    }
  ]
};

const worker = new Worker(
  "assignmentQueue",
  async (job) => {
    const { assignmentId, data } = job.data;
    console.log(`[Worker] Job started for job ${job.id} and assignment ${assignmentId}`);

    try {
      const result = await processAssignmentGeneration(String(assignmentId), data);
      const assignment = isMongoConnected()
        ? await Assignment.findById(String(assignmentId)).lean()
        : getLocalAssignmentById(String(assignmentId));
      console.log(`[Worker] Job completed for assignment ${assignmentId}`);
      return {
        assignmentId,
        result,
        schoolName: assignment?.schoolName || "",
        subjectName: assignment?.subjectName || "",
        className: assignment?.className || "",
        timeAllowed: assignment?.timeAllowed || ""
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[Worker] Generation failed for assignment ${assignmentId}:`, message);

      const finalFallback = {
        ...FALLBACK_RESULT,
        errorMessage: message
      };

      try {
        if (isMongoConnected()) {
          await Assignment.findByIdAndUpdate(String(assignmentId), {
            status: "completed",
            errorMessage: message,
            result: FALLBACK_RESULT
          });
        } else {
          updateLocalAssignment(String(assignmentId), (assignment) => ({
            ...assignment,
            status: "completed",
            errorMessage: message,
            result: FALLBACK_RESULT,
            updatedAt: new Date().toISOString()
          }));
        }
      } catch (dbError) {
        console.error(`[Worker] DB update failed:`, dbError);
      }

      const assignment = isMongoConnected()
        ? await Assignment.findById(String(assignmentId)).lean()
        : getLocalAssignmentById(String(assignmentId));
      return {
        assignmentId,
        result: FALLBACK_RESULT,
        errorMessage: message,
        schoolName: assignment?.schoolName || "",
        subjectName: assignment?.subjectName || "",
        className: assignment?.className || "",
        timeAllowed: assignment?.timeAllowed || ""
      };
    }
  },
  {
    connection: bullRedisConfig as any
  }
);

worker.on("ready", () => {
  console.log("[Worker] Assignment worker is ready and connected to Redis");
});

worker.on("failed", (job, err) => {
  console.error(`[Worker] Job ${job?.id} failed: ${err.message}`);
});

export default worker;
