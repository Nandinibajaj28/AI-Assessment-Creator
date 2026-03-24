import mongoose from "mongoose";

const questionTypeSchema = new mongoose.Schema(
  {
    type: { type: String, required: true },
    count: { type: Number, required: true },
    marks: { type: Number, required: true }
  },
  { _id: false }
);

const uploadedDocumentSchema = new mongoose.Schema(
  {
    name: String,
    mimeType: String,
    dataUrl: String
  },
  { _id: false }
);

const assignmentSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      index: true
    },
    schoolName: String,
    subjectName: String,
    className: String,
    timeAllowed: String,
    dueDate: String,
    questionTypes: [questionTypeSchema],
    numberOfQuestions: Number,
    marks: Number,
    instructions: String,
    uploadedFile: uploadedDocumentSchema,
    uploadedImage: uploadedDocumentSchema,

    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending"
    },

    errorMessage: String,
    result: Object
  },
  { timestamps: true }
);

export const Assignment = mongoose.model("Assignment", assignmentSchema);
