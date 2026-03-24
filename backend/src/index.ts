import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import { connectDB } from "./config/db";
import assignmentRoutes from "./routes/assignment.routes";
import authRoutes from "./routes/auth.routes";
import { assignmentQueueEvents } from "./queues/assignment.queue";

dotenv.config();

connectDB();

const PORT = process.env.PORT || 5000;

const app = express();
const server = http.createServer(app);

export const io = new Server(server, {
  cors: { origin: "*" }
});

app.use(cors());
app.use(express.json({ limit: "20mb" }));

app.get("/", (req, res) => {
  res.send("API Running");
});

app.use("/api/auth", authRoutes);
app.use("/api/assignment", assignmentRoutes);

assignmentQueueEvents.on("completed", ({ jobId, returnvalue }: { jobId: string; returnvalue: any }) => {
  console.log(`[QueueEvents] Job ${jobId} completed`);
  io.emit("assignment_done", returnvalue);
});

assignmentQueueEvents.on("failed", ({ jobId, failedReason }: { jobId: string; failedReason: string }) => {
  console.error(`[QueueEvents] Job ${jobId} failed: ${failedReason}`);
});

assignmentQueueEvents.on("error", (error: Error) => {
  console.error("[QueueEvents] Queue event error:", error.message);
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
