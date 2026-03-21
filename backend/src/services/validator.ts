export type Difficulty = "easy" | "medium" | "hard";

export type GeneratedQuestion = {
  text: string;
  difficulty: Difficulty;
  marks: number;
};

export type GeneratedSection = {
  title: string;
  instruction?: string;
  questions: GeneratedQuestion[];
};

export type GeneratedAssignment = {
  sections: GeneratedSection[];
};

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

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

    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error(`Invalid section.questions at index ${sectionIndex}`);
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
    });
  });
}
