import mongoose from "mongoose";

const assignmentSchema = new mongoose.Schema({
  dueDate: Date,
  questionTypes: [String],
  numberOfQuestions: Number,
  marks: Number,
  instructions: String,

  status: {
    type: String,
    enum: ["pending", "completed"],
    default: "pending"
  },

  result: Object
}, { timestamps: true });

export const Assignment = mongoose.model("Assignment", assignmentSchema);