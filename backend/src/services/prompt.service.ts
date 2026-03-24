export type Difficulty = "easy" | "medium" | "hard";

export type AssignmentQuestionTypeInput = {
  type?: string;
  count?: number;
  marks?: number;
};

export type UploadedDocumentInput = {
  name?: string;
  mimeType?: string;
  dataUrl?: string;
};

export type AssignmentInput = {
  questionTypes?: AssignmentQuestionTypeInput[] | string[] | string;
  numberOfQuestions?: number;
  marks?: number;
  additionalInfo?: string;
  instructions?: string;
  dueDate?: string;
  schoolName?: string;
  subjectName?: string;
  className?: string;
  timeAllowed?: string;
  sourceText?: string;
  uploadedContent?: string;
  content?: string;
  imageText?: string;
  imageDescription?: string;
  imageContext?: string;
  extractedText?: string;
  uploadedFile?: UploadedDocumentInput;
  uploadedImage?: UploadedDocumentInput;
};

export type StrictQuestionType = {
  requestedType: string;
  normalizedType: string;
  count: number;
  marks: number;
};

export type StrictAssignmentConfig = {
  questionTypes: StrictQuestionType[];
  numberOfQuestions: number;
  totalMarks: number;
  instructions: string;
  dueDate: string;
  schoolName: string;
  subjectName: string;
  className: string;
  timeAllowed: string;
};

const TYPE_LABELS: Record<string, string> = {
  mcq: "Multiple Choice Questions",
  "multiple choice questions": "Multiple Choice Questions",
  "multiple choice question": "Multiple Choice Questions",
  multiplechoicequestions: "Multiple Choice Questions",
  short: "Short Answer Questions",
  "short answer questions": "Short Answer Questions",
  "short answer question": "Short Answer Questions",
  shortquestions: "Short Answer Questions",
  "short questions": "Short Answer Questions",
  long: "Long Answer Questions",
  "long answer questions": "Long Answer Questions",
  "long answer question": "Long Answer Questions",
  longquestions: "Long Answer Questions",
  "long questions": "Long Answer Questions",
  numerical: "Numerical Problems",
  "numerical problems": "Numerical Problems",
  "numerical problem": "Numerical Problems",
  numericalproblems: "Numerical Problems",
  "diagram/graph-based questions": "Diagram/Graph-Based Questions",
  "diagram graph based questions": "Diagram/Graph-Based Questions",
  diagramgraphbasedquestions: "Diagram/Graph-Based Questions",
  "diagram based questions": "Diagram/Graph-Based Questions",
  diagrambasedquestions: "Diagram/Graph-Based Questions"
};

const normalizeTypeKey = (value: string) =>
  value.trim().toLowerCase().replace(/[^a-z]+/g, " ").trim();

const toNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getNormalizedType = (value: string) => {
  const direct = TYPE_LABELS[normalizeTypeKey(value)];
  if (direct) return direct;

  const collapsed = normalizeTypeKey(value).replace(/\s+/g, "");
  return TYPE_LABELS[collapsed] ?? value.trim();
};

const normalizeQuestionTypes = (
  questionTypes: AssignmentInput["questionTypes"]
): StrictQuestionType[] => {
  if (!Array.isArray(questionTypes)) {
    return [];
  }

  return questionTypes
    .map((questionType) => {
      if (typeof questionType === "string") {
        const normalizedType = getNormalizedType(questionType);
        return {
          requestedType: questionType,
          normalizedType,
          count: 0,
          marks: 0
        };
      }

      const requestedType = String(questionType.type ?? "").trim();
      const normalizedType = getNormalizedType(requestedType || "General");

      return {
        requestedType: requestedType || normalizedType,
        normalizedType,
        count: toNumber(questionType.count),
        marks: toNumber(questionType.marks)
      };
    })
    .filter((questionType) => questionType.normalizedType.length > 0);
};

export const normalizeAssignmentConfig = (data: AssignmentInput): StrictAssignmentConfig => {
  const questionTypes = normalizeQuestionTypes(data.questionTypes);
  const numberOfQuestions =
    questionTypes.reduce((sum, questionType) => sum + questionType.count, 0) ||
    toNumber(data.numberOfQuestions);
  const totalMarks =
    questionTypes.reduce((sum, questionType) => sum + questionType.count * questionType.marks, 0) ||
    toNumber(data.marks);

  return {
    questionTypes,
    numberOfQuestions,
    totalMarks,
    instructions: String(data.instructions ?? "").trim(),
    dueDate: String(data.dueDate ?? "").trim(),
    schoolName: String(data.schoolName ?? "").trim(),
    subjectName: String(data.subjectName ?? "").trim(),
    className: String(data.className ?? "").trim(),
    timeAllowed: String(data.timeAllowed ?? "").trim()
  };
};

const buildQuestionPlan = (config: StrictAssignmentConfig) =>
  config.questionTypes
    .map(
      (questionType, index) =>
        `${index + 1}. ${questionType.normalizedType}: ${questionType.count} question(s), ${questionType.marks} mark${
          questionType.marks === 1 ? "" : "s"
        } each`
    )
    .join("\n");

const buildQualityExamples = (subjectName: string) => {
  const subject = subjectName || "the given subject";

  return `
Bad question examples:
- "Write anything about ${subject}."
- "Explain something from the chapter."
- "Ask a question not present in the source."

Good question examples:
- "What does the chapter state about photosynthesis?"
- "Which statement from the source is correct?"
- "According to the uploaded material, what is the definition of osmosis?"
- "What fact is directly supported by the source line about the water cycle?"
`.trim();
};

const extractUploadedContext = (data: AssignmentInput) =>
  [
    data.extractedText,
    data.imageText,
    data.imageDescription,
    data.imageContext,
    data.sourceText,
    data.uploadedContent,
    data.content
  ]
    .find((value) => typeof value === "string" && value.trim().length > 0)
    ?.trim() || "";

const buildSectionSchema = (config: StrictAssignmentConfig) =>
  config.questionTypes
    .map(
      (questionType) => `    {
      "title": "${questionType.normalizedType || "Section A"}",
      "instruction": "Attempt all questions",
      "questions": [
        {
          "text": "Write a complete exam question here.",
          "difficulty": "easy",
          "marks": ${questionType.marks}
        }
      ]
    }`
    )
    .join(",\n");

export const buildPrompt = (data: AssignmentInput): string => {
  const config = normalizeAssignmentConfig(data);
  const questionPlan = buildQuestionPlan(config);
  const extraInstructions = config.instructions || "No extra instructions.";
  const subjectContext = config.subjectName || "Not specified";
  const classContext = config.className || "Not specified";
  const uploadedContext = extractUploadedContext(data);
  const uploadedFile = data.uploadedFile ?? data.uploadedImage;
  const fileContext = uploadedFile?.name
    ? `${uploadedFile.name} (${uploadedFile.mimeType || "unknown"})`
    : "No uploaded document";

  return `
You are an expert exam question paper generator with validation discipline.
Your job is to generate student questions using ONLY the uploaded content and the selected subject.
Do not use outside knowledge.
Do not invent facts.
Every question must be directly supported by the source text.

Generate a question paper in STRICT JSON format.

DO NOT include:
- instructions about how to generate
- explanations
- phrases like "generate exactly"
- repeated prompt text
- placeholder text like "question 1 for the subject"
- markdown fences

Return ONLY JSON.

Questions must be factual, specific, and answerable from the provided material only.
Questions must strictly match the requested subject, class level, instructions, and uploaded content context.
If uploaded content is present, treat it as the primary source.
Before finalizing each question, ensure that it maps to a source sentence or line from the material.
If a question cannot be supported by a source sentence or line, exclude it.
Use the class level and requested difficulty to control wording, but do not add unsupported material.
For Multiple Choice Questions, include at least 3 options.
For each question include the supporting source line in the field "source_line".

Question paper requirements for the AI only:
- Create exactly ${config.questionTypes.length} sections.
- Each section title must exactly match the requested question type label.
- Each section instruction must be exactly "Attempt all questions".
- Put only real questions inside each section.
- Each question must contain: text, difficulty, marks, source_line.
- Difficulty must be exactly one of: easy, medium, hard.
- If the section is "Multiple Choice Questions", each question must also contain an "options" array with at least 3 strings.
- Do not add extra sections.
- Do not add extra questions.
- Do not change counts.
- Do not change marks.
- Total number of questions must be exactly ${config.numberOfQuestions}.
- Total marks must be exactly ${config.totalMarks}.
- ${config.questionTypes
    .map(
      (questionType) =>
        `"${questionType.normalizedType}" must contain exactly ${questionType.count} real question(s), each worth ${questionType.marks} mark${
          questionType.marks === 1 ? "" : "s"
        }.`
    )
    .join("\n- ")}

Quality guidance:
${buildQualityExamples(config.subjectName)}

Grounding rules:
- The value in "source_line" must copy the supporting line or sentence exactly from the source text.
- Do not use a source line that is not present in the provided material.
- Prefer one clear fact per question.
- Keep wording exam-ready, but keep the fact grounded.
- If the source is too weak for a question, omit that question instead of guessing.

Requested question distribution:
${questionPlan || "1. Section A: 1 question, 2 marks each"}

Structure:
{
  "sections": [
${buildSectionSchema(config)}
  ]
}

Context for question generation only:
- School Name: ${config.schoolName || "Not specified"}
- Subject: ${subjectContext}
- Class: ${classContext}
- Time Allowed: ${config.timeAllowed || "Not specified"}
- Due Date: ${config.dueDate || "Not specified"}
- Additional Instructions: ${extraInstructions}
- Uploaded File: ${fileContext}
- Uploaded Image/Content Context: ${uploadedContext || "No uploaded image or content provided"}
`.trim();
};

