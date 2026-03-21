import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import { connectDB } from "./config/db";

import assignmentRoutes from "./routes/assignment.routes";



dotenv.config();

connectDB();

const PORT = process.env.PORT || 5000;

const app = express();
const server = http.createServer(app);

export const io = new Server(server, {
    cors: { origin: "*" }
});

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.send("API Running");
});

import { assignmentQueueEvents } from "./queues/assignment.queue";

app.use("/api/assignment", assignmentRoutes);

assignmentQueueEvents.on("completed", ({ jobId, returnvalue }) => {
    io.emit("assignment_done", returnvalue);
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
