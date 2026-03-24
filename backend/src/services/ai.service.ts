import pdfParse from "pdf-parse";
import Tesseract from "tesseract.js";
import { AssignmentInput, normalizeAssignmentConfig } from "./prompt.service";
import {
  GeneratedAssignment,
  GeneratedQuestion,
  GeneratedSection,
  validateGeneratedAssignment,
  validateStructure
} from "../utils/validator";

type AssignmentGenerationInput = AssignmentInput;

const DEFAULT_FALLBACK_ASSIGNMENT: GeneratedAssignment = {
  sections: [
    {
      title: "Section A",
      instruction: "Attempt all questions",
      questions: [
        {
          text: "Define the core concept related to the subject and provide one suitable example.",
          difficulty: "easy",
          marks: 2,
          sourceLine: "Core concept from the selected subject"
        }
      ]
    }
  ]
};

const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434/api/generate";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3";
const EXTRACTION_FAILURE_PREFIX = "Text extraction failed:";
const FORBIDDEN_TEXT_PATTERNS = [
  /generate exactly/i,
  /question\s*1\b/i,
  /question\s*\d+\b/i,
  /question\s*\d+\s+for\s+the\s+subject/i,
  /for the subject/i,
  /placeholder/i,
  /define topic/i,
  /write something about/i
];

const toErrorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

const containsForbiddenText = (value: string) =>
  FORBIDDEN_TEXT_PATTERNS.some((pattern) => pattern.test(value));

const cleanVisibleText = (value: string) =>
  value
    .split(/\r?\n/)
    .filter((line) => !containsForbiddenText(line))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

const normalizeExtractedText = (value: string) =>
  value
    .split(/\r?\n/)
    .map((line) => cleanVisibleText(line))
    .filter((line) => line.length > 0)
    .join("\n")
    .trim();

const normalizeLine = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/["'`]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "how",
  "in",
  "into",
  "is",
  "it",
  "of",
  "on",
  "or",
  "that",
  "the",
  "their",
  "this",
  "to",
  "what",
  "which",
  "who",
  "why",
  "with"
]);

const tokenizeMeaningfulWords = (value: string) =>
  normalizeLine(value)
    .split(" ")
    .filter((token) => token.length >= 4 && !STOP_WORDS.has(token));

const countSharedTokens = (left: string, right: string) => {
  const leftTokens = new Set(tokenizeMeaningfulWords(left));
  const rightTokens = new Set(tokenizeMeaningfulWords(right));

  let count = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) {
      count += 1;
    }
  }

  return count;
};

const findMatchingSourceLine = (sourceLine: string, sourceLines: string[]) => {
  const normalizedSourceLine = normalizeLine(sourceLine);
  if (!normalizedSourceLine) {
    return "";
  }

  const exactMatch = sourceLines.find((line) => normalizeLine(line) === normalizedSourceLine);
  if (exactMatch) {
    return exactMatch;
  }

  return (
    sourceLines.find((line) => {
      const normalizedLine = normalizeLine(line);
      return (
        normalizedLine.includes(normalizedSourceLine) || normalizedSourceLine.includes(normalizedLine)
      );
    }) || ""
  );
};

const isQuestionRelatedToContext = (
  questionText: string,
  sourceLine: string,
  sourceLines: string[],
  fullContext: string
) => {
  if (sourceLines.length === 0) {
    return true;
  }

  const matchedSourceLine = findMatchingSourceLine(sourceLine, sourceLines);
  if (!matchedSourceLine) {
    return false;
  }

  if (countSharedTokens(questionText, matchedSourceLine) >= 1) {
    return true;
  }

  return countSharedTokens(questionText, fullContext) >= 2;
};

const extractUploadedDocument = (data: AssignmentGenerationInput) =>
  data.uploadedFile ?? data.uploadedImage;

const extractUploadedContext = (data: AssignmentGenerationInput) =>
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

const extractGroundingLines = (value: string) => {
  const compact = value.replace(/\r/g, "\n");
  const fromLines = compact
    .split(/\n+/)
    .map((line) => cleanVisibleText(line))
    .filter((line) => line.length >= 12);

  const fromSentences = compact
    .split(/(?<=[.?!])\s+/)
    .map((line) => cleanVisibleText(line))
    .filter((line) => line.length >= 12);

  return [...fromLines, ...fromSentences].filter(
    (line, index, all) => all.findIndex((candidate) => normalizeLine(candidate) === normalizeLine(line)) === index
  );
};

const buildDifficulty = (index: number): GeneratedQuestion["difficulty"] => {
  const difficulties: GeneratedQuestion["difficulty"][] = ["easy", "medium", "hard"];
  return difficulties[index % difficulties.length];
};

const normalizeOptions = (value: unknown) => {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const options = value
    .map((option) => cleanVisibleText(String(option ?? "")))
    .filter((option) => option.length > 0);

  return options.length >= 3 ? options : undefined;
};

const sanitizeQuestion = (
  question: unknown,
  sectionTitle: string,
  marks: number,
  sourceLines: string[],
  fullContext: string
): GeneratedQuestion | null => {
  if (!question || typeof question !== "object") {
    return null;
  }

  const raw = question as Record<string, unknown>;
  const text = cleanVisibleText(String(raw.text ?? ""));
  const difficulty = String(raw.difficulty ?? "").trim().toLowerCase();
  const sourceLine =
    cleanVisibleText(String(raw.sourceLine ?? raw.source_line ?? raw.source ?? text)) ||
    "Relevant concept from the selected subject";
  const options = normalizeOptions(raw.options);

  if (!text || containsForbiddenText(text)) {
    return null;
  }

  if (!isQuestionRelatedToContext(text, sourceLine, sourceLines, fullContext)) {
    return null;
  }

  if (!["easy", "medium", "hard"].includes(difficulty)) {
    return null;
  }

  if (/multiple choice/i.test(sectionTitle) && !options) {
    return null;
  }

  return {
    text,
    difficulty: difficulty as GeneratedQuestion["difficulty"],
    marks,
    sourceLine,
    ...(options ? { options } : {})
  };
};

const sanitizeAssignment = (
  assignment: unknown,
  config: ReturnType<typeof normalizeAssignmentConfig>,
  sourceLines: string[],
  fullContext: string
): GeneratedAssignment => {
  if (!assignment || typeof assignment !== "object") {
    return { sections: [] };
  }

  const rawSections = Array.isArray((assignment as Record<string, unknown>).sections)
    ? ((assignment as Record<string, unknown>).sections as unknown[])
    : [];

  const sections = config.questionTypes.map<GeneratedSection>((questionType) => {
    const matchingSection = rawSections.find((section) => {
      if (!section || typeof section !== "object") {
        return false;
      }

      const title = String((section as Record<string, unknown>).title ?? "");
      return title.trim().toLowerCase() === questionType.normalizedType.trim().toLowerCase();
    }) as Record<string, unknown> | undefined;

    const rawQuestions = Array.isArray(matchingSection?.questions) ? matchingSection.questions : [];

    return {
      title: questionType.normalizedType,
      instruction: "Attempt all questions",
      questions: rawQuestions
        .map((question) =>
          sanitizeQuestion(
            question,
            questionType.normalizedType,
            questionType.marks,
            sourceLines,
            fullContext
          )
        )
        .filter((question): question is GeneratedQuestion => Boolean(question))
    };
  });

  return { sections };
};

const buildDistractors = (correctLine: string, sourceLines: string[]) => {
  const distractors = sourceLines
    .filter((line) => normalizeLine(line) !== normalizeLine(correctLine))
    .slice(0, 3)
    .map((line) => (line.length > 96 ? `${line.slice(0, 93).trim()}...` : line));

  while (distractors.length < 2) {
    distractors.push("This statement is not supported by the uploaded material.");
  }

  return [correctLine, ...distractors].slice(0, 4);
};

const buildFallbackQuestion = ({
  sectionTitle,
  sourceLine,
  sourceLines,
  marks,
  index
}: {
  sectionTitle: string;
  sourceLine: string;
  sourceLines: string[];
  marks: number;
  index: number;
}): GeneratedQuestion => {
  const clippedLine = sourceLine.length > 120 ? `${sourceLine.slice(0, 117).trim()}...` : sourceLine;

  if (/multiple choice/i.test(sectionTitle)) {
    return {
      text: "Which of the following statements is directly supported by the uploaded material?",
      difficulty: buildDifficulty(index),
      marks,
      sourceLine,
      options: buildDistractors(clippedLine, sourceLines)
    };
  }

  return {
    text: `Explain ${clippedLine} in a concise academic answer.`,
    difficulty: buildDifficulty(index),
    marks,
    sourceLine
  };
};

const buildGroundedFallbackAssignment = (
  data: AssignmentGenerationInput,
  sourceLinesInput?: string[]
): GeneratedAssignment => {
  const config = normalizeAssignmentConfig(data);
  const sourceLines = sourceLinesInput?.length
    ? sourceLinesInput
    : extractGroundingLines(extractUploadedContext(data));
  const usableLines =
    sourceLines.length > 0
      ? sourceLines
      : [
        cleanVisibleText(
          [
            data.subjectName && `Subject: ${data.subjectName}`,
            data.additionalInfo && `Additional Info: ${data.additionalInfo}`,
            data.instructions && `Instruction: ${data.instructions}`
          ]
            .filter(Boolean)
            .join(" | ")
        ) || `${data.subjectName || "Selected subject"} subject academic questions`
      ];

  if (config.questionTypes.length === 0) {
    return DEFAULT_FALLBACK_ASSIGNMENT;
  }

  return {
    sections: config.questionTypes.map<GeneratedSection>((questionType, sectionIndex) => ({
      title: questionType.normalizedType,
      instruction: "Attempt all questions",
      questions: Array.from({ length: questionType.count }, (_, index) => {
        const sourceLine = usableLines[(sectionIndex + index) % usableLines.length];
        return buildFallbackQuestion({
          sectionTitle: questionType.normalizedType,
          sourceLine,
          sourceLines: usableLines,
          marks: questionType.marks,
          index
        });
      })
    }))
  };
};

const completeAssignmentWithFallback = (
  assignment: GeneratedAssignment,
  data: AssignmentGenerationInput,
  sourceLines: string[]
) => {
  const config = normalizeAssignmentConfig(data);
  const fallback = buildGroundedFallbackAssignment(data, sourceLines);

  return {
    sections: config.questionTypes.map<GeneratedSection>((questionType) => {
      const currentSection = assignment.sections.find(
        (section) => section.title.toLowerCase() === questionType.normalizedType.toLowerCase()
      );
      const fallbackSection = fallback.sections.find(
        (section) => section.title.toLowerCase() === questionType.normalizedType.toLowerCase()
      );

      const questions = [...(currentSection?.questions ?? [])];

      for (const fallbackQuestion of fallbackSection?.questions ?? []) {
        if (questions.length >= questionType.count) {
          break;
        }

        questions.push(fallbackQuestion);
      }

      return {
        title: questionType.normalizedType,
        instruction: "Attempt all questions",
        questions: questions.slice(0, questionType.count).map((question) => ({
          ...question,
          marks: questionType.marks
        }))
      };
    })
  };
};

const parseDataUrlToBuffer = (dataUrl?: string) => {
  if (!dataUrl) {
    return null;
  }

  const matches = dataUrl.match(/^data:(.*?);base64,(.*)$/);
  if (!matches) {
    return null;
  }

  return {
    mimeType: matches[1],
    buffer: Buffer.from(matches[2], "base64")
  };
};

const extractTextFromPdf = async (buffer: Buffer) => {
  const parsed = await pdfParse(buffer);
  return normalizeExtractedText(parsed.text || "");
};

const extractTextFromImage = async (buffer: Buffer) => {
  const result = await Tesseract.recognize(buffer, "eng");
  return normalizeExtractedText(result.data.text || "");
};

const extractDocumentText = async (data: AssignmentGenerationInput) => {
  const uploadedDocument = extractUploadedDocument(data);
  const existingContext = extractUploadedContext(data);

  if (existingContext) {
    return existingContext;
  }

  if (!uploadedDocument?.dataUrl) {
    return "";
  }

  const parsedFile = parseDataUrlToBuffer(uploadedDocument.dataUrl);
  if (!parsedFile) {
    throw new Error(`${EXTRACTION_FAILURE_PREFIX} invalid file payload received.`);
  }

  const mimeType = uploadedDocument.mimeType || parsedFile.mimeType;

  try {
    const extractedText = mimeType === "application/pdf"
      ? await extractTextFromPdf(parsedFile.buffer)
      : await extractTextFromImage(parsedFile.buffer);

    if (mimeType === "application/pdf") {
      console.log("PDF RAW TEXT:", extractedText.slice(0, 300));
    }

    if (!extractedText) {
      throw new Error(`${EXTRACTION_FAILURE_PREFIX} no readable text was found in the uploaded file.`);
    }

    return extractedText;
  } catch (error) {
    throw new Error(`${EXTRACTION_FAILURE_PREFIX} ${toErrorMessage(error)}`);
  }
};

const extractTextFromOpenAIResponse = (response: any) => {
  if (typeof response?.output_text === "string") {
    return response.output_text.trim();
  }

  if (!Array.isArray(response?.output)) {
    return "";
  }

  const textParts = response.output.flatMap((item: any) =>
    Array.isArray(item?.content)
      ? item.content
        .map((contentItem: any) => {
          if (typeof contentItem?.text === "string") {
            return contentItem.text.trim();
          }

          if (typeof contentItem?.output_text === "string") {
            return contentItem.output_text.trim();
          }

          return "";
        })
        .filter(Boolean)
      : []
  );

  return textParts.join("\n").trim();
};

const buildStrictPrompt = (data: AssignmentGenerationInput, limitedText: string) => {
  const config = normalizeAssignmentConfig(data);
  const fallbackSubject = data.subjectName || "the selected subject";
  const contextBlock = limitedText || `[EMPTY_CONTEXT] Fallback to subject: ${fallbackSubject}`;

  return `
You are an expert school exam paper setter.

Context:
${contextBlock}

RULES:

- Generate questions ONLY from this context
- Do NOT use external knowledge
- Do NOT generate unrelated topics
- If context is empty -> fallback to subject
- Follow question count exactly
- Keep section titles, marks, and difficulty aligned to the request
- For Multiple Choice Questions, include at least 3 options

Return ONLY valid JSON:

{
  "sections": [
    {
      "title": "Multiple Choice Questions",
      "instruction": "Attempt all questions",
      "questions": [
        {
          "text": "Actual academic question",
          "difficulty": "easy",
          "marks": 2,
          "sourceLine": "relevant concept",
          "options": ["A", "B", "C", "D"]
        }
      ]
    }
  ]
}

Additional requirements:
- Every question must be grounded in the context block above
- Every "sourceLine" must be copied from the provided context
- Create exactly ${config.questionTypes.length} sections
- Each section title must exactly match the requested question type label
- Each section instruction must be exactly "Attempt all questions"
- Total number of questions must be exactly ${config.numberOfQuestions}
- Total marks must be exactly ${config.totalMarks}
- Difficulty must be exactly one of: easy, medium, hard
- ${config.questionTypes
    .map(
      (questionType) =>
        `"${questionType.normalizedType}" must contain exactly ${questionType.count} question(s), each worth ${questionType.marks} mark${
          questionType.marks === 1 ? "" : "s"
        }.`
    )
    .join("\n- ")}
`.trim();
};

const callOpenAI = async (prompt: string) => {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: prompt
            }
          ]
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI request failed with status ${response.status}`);
  }

  const result = await response.json();
  return extractTextFromOpenAIResponse(result);
};

const callOllama = async (prompt: string) => {
  const response = await fetch(OLLAMA_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt,
      stream: false,
      format: "json"
    })
  });

  if (!response.ok) {
    throw new Error(`Ollama request failed with status ${response.status}`);
  }

  const result = (await response.json()) as { response?: string };
  return typeof result.response === "string" ? result.response.trim() : "";
};

const tryParseAssignment = (
  rawText: string,
  config: ReturnType<typeof normalizeAssignmentConfig>,
  sourceLines: string[],
  fullContext: string
): GeneratedAssignment => {
  const sanitized = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();

  try {
    return sanitizeAssignment(JSON.parse(sanitized), config, sourceLines, fullContext);
  } catch {
    const jsonSubstringMatch = sanitized.match(/\{[\s\S]*\}/);
    if (!jsonSubstringMatch) {
      throw new Error("Unable to extract JSON substring from AI response");
    }

    return sanitizeAssignment(JSON.parse(jsonSubstringMatch[0]), config, sourceLines, fullContext);
  }
};

export const generateQuestions = async (data: unknown): Promise<GeneratedAssignment> => {
  const input = data as AssignmentGenerationInput;
  const uploadedDocument = extractUploadedDocument(input);
  const DEBUG_MODE = false;

  try {
    console.log("[AI] Starting grounded generation pipeline", {
      subject: input.subjectName,
      mimeType: uploadedDocument?.mimeType || "none"
    });

    let extractedText = "";
    try {
      extractedText = await extractDocumentText(input);
      console.log("EXTRACTED TEXT:", extractedText.slice(0, 200));
      console.log("========== EXTRACTION DEBUG ==========");
      console.log("File Info:", {
        hasFile: !!uploadedDocument,
        mimeType: uploadedDocument?.mimeType,
      });
      console.log("Data URL Preview:", uploadedDocument?.dataUrl?.slice(0, 100));
      console.log("Extracted Text Length:", extractedText.length);
      console.log("Extracted Text Preview:", extractedText.slice(0, 500));
      if (!extractedText) {
        console.warn("⚠️ EXTRACTION FAILED — NO TEXT FOUND");
      }
      console.log("======================================");
    } catch (extractionError) {
      const extractionMessage = toErrorMessage(extractionError);
      console.warn("[AI] Text extraction failed, proceeding with metadata only:", extractionMessage);
      // We don't throw anymore. We let it proceed to allow LLM to generate based on subject/class.
      // We can also inject a hint into the instructions.
      console.log("========== EXTRACTION DEBUG ==========");
      console.log("File Info:", {
        hasFile: !!uploadedDocument,
        mimeType: uploadedDocument?.mimeType,
      });
      console.log("Data URL Preview:", uploadedDocument?.dataUrl?.slice(0, 100));
      console.log("Extracted Text Length:", extractedText.length);
      console.log("Extracted Text Preview:", extractedText.slice(0, 500));
      console.warn("⚠️ EXTRACTION FAILED — NO TEXT FOUND");
      console.log("======================================");
    }

    if (DEBUG_MODE) {
      console.log("[AI DEBUG MODE] Extracted content:", extractedText || "NO TEXT EXTRACTED");
    }

    const preparedInput: AssignmentGenerationInput = {
      ...input,
      extractedText:
        extractedText ||
        input.additionalInfo ||
        input.instructions ||
        `${input.subjectName || "Selected subject"} subject academic questions`
    };

    const limitedText = (preparedInput.extractedText || "").slice(0, 2000);
    const sourceLines = extractGroundingLines(limitedText);

    const prompt = buildStrictPrompt(preparedInput, limitedText);
    const rawResponse = process.env.OPENAI_API_KEY ? await callOpenAI(prompt) : await callOllama(prompt);

    console.log("[AI DEBUG]", {
      extractedText: preparedInput.extractedText,
      prompt,
      rawResponse
    });

    if (!rawResponse) {
      throw new Error("LLM response content was empty");
    }

    const config = normalizeAssignmentConfig(preparedInput);
    const parsed = tryParseAssignment(rawResponse, config, sourceLines, limitedText);
    const supportedOnly = parsed;

    const completed = completeAssignmentWithFallback(supportedOnly, preparedInput, sourceLines);

    validateStructure(completed);
    return validateGeneratedAssignment(completed, config);
  } catch (error) {
    const message = toErrorMessage(error);
    console.error("[AI] Grounded generation failed", message);

    try {
      const fallback = buildGroundedFallbackAssignment(input);
      validateStructure(fallback);
      return validateGeneratedAssignment(fallback, normalizeAssignmentConfig(input));
    } catch (fallbackError) {
      console.error("[AI] Fallback generation failed", toErrorMessage(fallbackError));
      return DEFAULT_FALLBACK_ASSIGNMENT;
    }
  }
};
