type AssignmentInput = {
  questionTypes?: string[] | string;
  numberOfQuestions?: number;
  marks?: number;
  instructions?: string;
  dueDate?: string;
};

const stringifyTypes = (questionTypes: AssignmentInput["questionTypes"]) => {
  if (Array.isArray(questionTypes)) {
    return questionTypes.join(", ");
  }

  return questionTypes || "General";
};

export const buildPrompt = (data: AssignmentInput): string => {
  const questionTypes = stringifyTypes(data.questionTypes);
  const numberOfQuestions = Number(data.numberOfQuestions || 0);
  const totalMarks = Number(data.marks || 0);
  const instructions = data.instructions || "Follow standard exam guidelines.";
  const dueDate = data.dueDate || "Not specified";

  return `
You are an expert exam paper generator.
Return only one valid JSON object.
Do not return markdown fences.
Do not return explanation text.

Required output schema:
{
  "sections": [
    {
      "title": "Section A",
      "instruction": "string",
      "questions": [
        {
          "text": "string",
          "difficulty": "easy | medium | hard",
          "marks": number
        }
      ]
    },
    {
      "title": "Section B",
      "instruction": "string",
      "questions": [
        {
          "text": "string",
          "difficulty": "easy | medium | hard",
          "marks": number
        }
      ]
    }
  ]
}

Generation rules:
- Include exactly 2 sections: Section A and Section B.
- Each section must include title, instruction, and questions array.
- Each question must include text, difficulty, and marks.
- Use only difficulty values: easy, medium, hard.
- Total number of questions across both sections must be ${numberOfQuestions}.
- Total marks across all questions must be ${totalMarks}.
- Distribute difficulties across easy, medium, and hard.

Input:
- Question Types: ${questionTypes}
- Total Questions: ${numberOfQuestions}
- Total Marks: ${totalMarks}
- Instructions: ${instructions}
- Due Date: ${dueDate}
`.trim();
};
