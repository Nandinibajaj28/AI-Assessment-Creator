import {
  StrictAssignmentConfig,
  StrictQuestionType,
  normalizeAssignmentConfig
} from "../services/prompt.service";

export type Difficulty = "easy" | "medium" | "hard";

export type GeneratedQuestion = {
  text: string;
  difficulty: Difficulty;
  marks: number;
  sourceLine: string;
  options?: string[];
};

export type GeneratedSection = {
  title: string;
  instruction?: string;
  questions: GeneratedQuestion[];
};

export type GeneratedAssignment = {
  sections: GeneratedSection[];
};

export type ValidationSummary = {
  expectedTypeCounts: Record<string, number>;
  actualTypeCounts: Record<string, number>;
  expectedTotalQuestions: number;
  actualTotalQuestions: number;
  expectedTotalMarks: number;
  actualTotalMarks: number;
};

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const normalizeLabel = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");

const toValidationSummary = (
  config: StrictAssignmentConfig,
  assignment: GeneratedAssignment
): ValidationSummary => {
  const expectedTypeCounts = Object.fromEntries(
    config.questionTypes.map((questionType) => [questionType.normalizedType, questionType.count])
  );

  const actualTypeCounts = Object.fromEntries(
    config.questionTypes.map((questionType) => {
      const section = assignment.sections.find(
        (entry) => normalizeLabel(entry.title) === normalizeLabel(questionType.normalizedType)
      );

      return [questionType.normalizedType, section?.questions.length ?? 0];
    })
  );

  const actualTotalQuestions = assignment.sections.reduce(
    (sum, section) => sum + section.questions.length,
    0
  );
  const actualTotalMarks = assignment.sections.reduce(
    (sum, section) =>
      sum + section.questions.reduce((questionSum, question) => questionSum + question.marks, 0),
    0
  );

  return {
    expectedTypeCounts,
    actualTypeCounts,
    expectedTotalQuestions: config.numberOfQuestions,
    actualTotalQuestions,
    expectedTotalMarks: config.totalMarks,
    actualTotalMarks
  };
};

export function validateStructure(data: unknown): asserts data is GeneratedAssignment {
  if (!isObject(data) || !Array.isArray(data.sections) || data.sections.length === 0) {
    throw new Error("Invalid sections");
  }

  data.sections.forEach((section, sectionIndex) => {
    if (!isObject(section)) {
      throw new Error(`Invalid section format at index ${sectionIndex}`);
    }

    const title = section.title;
    const questions = section.questions;

    if (typeof title !== "string" || title.trim().length === 0) {
      throw new Error(`Missing section.title at index ${sectionIndex}`);
    }

    if (!Array.isArray(questions)) {
      throw new Error(`Invalid section.questions at index ${sectionIndex}`);
    }

    if (questions.length === 0) {
      throw new Error(`Empty section.questions at index ${sectionIndex}`);
    }

    questions.forEach((question, questionIndex) => {
      if (!isObject(question)) {
        throw new Error(
          `Invalid question format at section ${sectionIndex} index ${questionIndex}`
        );
      }

      const text = question.text;
      const difficulty = question.difficulty;
      const marks = question.marks;
      const sourceLine = question.sourceLine;
      const options = question.options;

      if (typeof text !== "string" || text.trim().length === 0) {
        throw new Error(`Missing question.text at section ${sectionIndex} index ${questionIndex}`);
      }

      if (typeof difficulty !== "string" || !DIFFICULTIES.includes(difficulty as Difficulty)) {
        throw new Error(
          `Invalid question.difficulty at section ${sectionIndex} index ${questionIndex}`
        );
      }

      if (typeof marks !== "number" || !Number.isFinite(marks) || marks <= 0) {
        throw new Error(`Invalid question.marks at section ${sectionIndex} index ${questionIndex}`);
      }

      if (sourceLine != null && typeof sourceLine !== "string") {
        throw new Error(`Invalid question.sourceLine at section ${sectionIndex} index ${questionIndex}`);
      }

      if (/multiple choice/i.test(title)) {
        if (!Array.isArray(options) || options.length < 3) {
          throw new Error(
            `Invalid question.options at section ${sectionIndex} index ${questionIndex}`
          );
        }

        options.forEach((option, optionIndex) => {
          if (typeof option !== "string" || option.trim().length === 0) {
            throw new Error(
              `Invalid question option at section ${sectionIndex} index ${questionIndex} option ${optionIndex}`
            );
          }
        });
      }
    });
  });
}

const normalizeSectionForType = (
  section: GeneratedSection | undefined,
  questionType: StrictQuestionType
): GeneratedSection => ({
  title: questionType.normalizedType,
  instruction: section?.instruction?.trim() || "Attempt all questions",
  questions: [...(section?.questions ?? [])]
});

export const autoCorrectAssignment = (
  assignment: GeneratedAssignment,
  configInput: StrictAssignmentConfig | Parameters<typeof normalizeAssignmentConfig>[0]
): GeneratedAssignment => {
  const config =
    "questionTypes" in configInput && Array.isArray(configInput.questionTypes)
      ? (configInput as StrictAssignmentConfig)
      : normalizeAssignmentConfig(configInput);

  const correctedSections = config.questionTypes.map((questionType) => {
    const originalSection = assignment.sections.find(
      (section) => normalizeLabel(section.title) === normalizeLabel(questionType.normalizedType)
    );

    const normalizedSection = normalizeSectionForType(originalSection, questionType);
    const filteredQuestions = normalizedSection.questions
      .filter((question) => question.marks === questionType.marks)
      .slice(0, questionType.count);

    return {
      ...normalizedSection,
      questions: filteredQuestions
    };
  });

  return {
    sections: correctedSections
  };
};

export const validateGeneratedAssignment = (
  assignment: GeneratedAssignment,
  configInput: StrictAssignmentConfig | Parameters<typeof normalizeAssignmentConfig>[0]
): GeneratedAssignment => {
  const config =
    "questionTypes" in configInput && Array.isArray(configInput.questionTypes)
      ? (configInput as StrictAssignmentConfig)
      : normalizeAssignmentConfig(configInput);

  if (config.questionTypes.length === 0) {
    throw new Error("No question types provided");
  }

  const corrected = autoCorrectAssignment(assignment, config);
  const summary = toValidationSummary(config, corrected);

  config.questionTypes.forEach((questionType) => {
    const section = corrected.sections.find(
      (entry) => normalizeLabel(entry.title) === normalizeLabel(questionType.normalizedType)
    );

    if (!section) {
      throw new Error(`Missing section for type "${questionType.normalizedType}"`);
    }

    if (section.questions.length !== questionType.count) {
      throw new Error(
        `Question count mismatch for "${questionType.normalizedType}": expected ${questionType.count}, received ${section.questions.length}`
      );
    }

    section.questions.forEach((question, index) => {
      if (question.marks !== questionType.marks) {
        throw new Error(
          `Marks mismatch for "${questionType.normalizedType}" question ${index + 1}: expected ${questionType.marks}, received ${question.marks}`
        );
      }

      if (!DIFFICULTIES.includes(question.difficulty)) {
        throw new Error(
          `Difficulty mismatch for "${questionType.normalizedType}" question ${index + 1}`
        );
      }
    });
  });

  if (corrected.sections.length !== config.questionTypes.length) {
    throw new Error("Section count mismatch");
  }

  if (summary.actualTotalQuestions !== summary.expectedTotalQuestions) {
    throw new Error(
      `Total question count mismatch: expected ${summary.expectedTotalQuestions}, received ${summary.actualTotalQuestions}`
    );
  }

  if (summary.actualTotalMarks !== summary.expectedTotalMarks) {
    throw new Error(
      `Total marks mismatch: expected ${summary.expectedTotalMarks}, received ${summary.actualTotalMarks}`
    );
  }

  return corrected;
};
