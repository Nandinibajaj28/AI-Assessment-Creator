export type Difficulty = "easy" | "medium" | "hard";

export type Question = {
  text: string;
  difficulty: Difficulty;
  marks: number;
  options?: string[];
};

export type AssignmentSection = {
  title: string;
  instruction?: string;
  questions: Question[];
};

export type AssignmentResult = {
  sections: AssignmentSection[];
};

export type AssignmentQuestionType = {
  type: string;
  count: number;
  marks: number;
};

export type UploadedDocumentPayload = {
  name: string;
  mimeType: string;
  dataUrl: string;
};

export type CreateAssignmentPayload = {
  schoolName: string;
  subjectName: string;
  className: string;
  timeAllowed: string;
  dueDate: string;
  questionTypes: AssignmentQuestionType[];
  numberOfQuestions: number;
  marks: number;
  instructions: string;
  uploadedFile?: UploadedDocumentPayload;
};

export type DashboardAssignment = {
  id: string;
  title: string;
  assignedOn: string;
  dueDate: string;
  status?: string;
};

export type AssignmentDoneEvent = {
  assignmentId: string;
  result?: AssignmentResult;
  errorMessage?: string;
  schoolName: string;
  subjectName: string;
  className: string;
  timeAllowed: string;
};


