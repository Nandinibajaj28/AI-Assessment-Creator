import Groq from "groq-sdk";
import { buildPrompt } from "./prompt.service";
import { GeneratedAssignment, validateStructure } from "./validator";

const GROQ_MODEL = "openai/gpt-oss-120b";

let groqClient: Groq | null = null;

const getGroqClient = () => {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error("Missing GROQ_API_KEY");
  }

  if (!groqClient) {
    groqClient = new Groq({ apiKey });
  }

  return groqClient;
};

const extractJson = (content: unknown) => {
  if (typeof content !== "string") {
    throw new Error("Groq response content was empty");
  }

  const trimmed = content.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);

  return (fenced?.[1] ?? trimmed).trim();
};

const fallbackResponse = (): GeneratedAssignment => ({
  sections: [
    {
      title: "Section A",
      instruction: "Attempt all questions",
      questions: [
        {
          text: "What is Artificial Intelligence?",
          difficulty: "easy",
          marks: 2
        },
        {
          text: "Explain supervised and unsupervised learning.",
          difficulty: "medium",
          marks: 4
        }
      ]
    },
    {
      title: "Section B",
      instruction: "Answer any one question",
      questions: [
        {
          text: "Describe one real-world AI use case and its impact.",
          difficulty: "hard",
          marks: 6
        }
      ]
    }
  ]
});

const parseGroqResponse = (content: unknown): GeneratedAssignment => {
  const raw = extractJson(content);
  const parsed = JSON.parse(raw);
  const validate: (data: unknown) => asserts data is GeneratedAssignment = validateStructure;
  validate(parsed);
  return parsed;
};

export const generateQuestions = async (data: any): Promise<GeneratedAssignment> => {
  const prompt = buildPrompt(data);

  try {
    const client = getGroqClient();
    const response = await client.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You generate strict JSON only. Do not include markdown, comments, or extra text."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.2
    });

    return parseGroqResponse(response.choices[0]?.message?.content);
  } catch (error: any) {
    console.error("GROQ ERROR:", error?.message || error);

    return fallbackResponse();
  }
};

