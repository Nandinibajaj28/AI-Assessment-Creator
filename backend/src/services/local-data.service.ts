import fs from "fs";
import path from "path";
import crypto from "crypto";
import mongoose from "mongoose";

type LocalUserRecord = {
  _id: string;
  name: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
  createdAt: string;
  updatedAt: string;
};

type LocalAssignmentRecord = {
  _id: string;
  owner: string;
  schoolName?: string;
  subjectName?: string;
  className?: string;
  timeAllowed?: string;
  dueDate?: string;
  questionTypes?: Array<{ type: string; count: number; marks: number }>;
  numberOfQuestions?: number;
  marks?: number;
  instructions?: string;
  uploadedFile?: unknown;
  status: "pending" | "completed" | "failed";
  errorMessage?: string;
  result?: unknown;
  createdAt: string;
  updatedAt: string;
};

type LocalStore = {
  users: LocalUserRecord[];
  assignments: LocalAssignmentRecord[];
};

const dataDirectory = path.resolve(process.cwd(), ".local-data");
const storePath = path.join(dataDirectory, "store.json");

function ensureStore() {
  if (!fs.existsSync(dataDirectory)) {
    fs.mkdirSync(dataDirectory, { recursive: true });
  }

  if (!fs.existsSync(storePath)) {
    fs.writeFileSync(
      storePath,
      JSON.stringify({ users: [], assignments: [] } satisfies LocalStore, null, 2),
      "utf8"
    );
  }
}

function readStore(): LocalStore {
  ensureStore();
  return JSON.parse(fs.readFileSync(storePath, "utf8")) as LocalStore;
}

function writeStore(store: LocalStore) {
  ensureStore();
  fs.writeFileSync(storePath, JSON.stringify(store, null, 2), "utf8");
}

function createId() {
  return crypto.randomUUID().replace(/-/g, "");
}

function now() {
  return new Date().toISOString();
}

export function isMongoConnected() {
  return mongoose.connection.readyState === 1;
}

export function findLocalUserByEmail(email: string) {
  const store = readStore();
  return store.users.find((user) => user.email === email) ?? null;
}

export function createLocalUser(input: {
  name: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
}) {
  const store = readStore();
  const timestamp = now();

  const user: LocalUserRecord = {
    _id: createId(),
    name: input.name,
    email: input.email,
    passwordHash: input.passwordHash,
    passwordSalt: input.passwordSalt,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  store.users.push(user);
  writeStore(store);
  return user;
}

export function createLocalAssignment(ownerId: string, data: Record<string, unknown>) {
  const store = readStore();
  const timestamp = now();

  const assignment: LocalAssignmentRecord = {
    _id: createId(),
    owner: ownerId,
    ...data,
    status: "pending",
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  store.assignments.push(assignment);
  writeStore(store);
  return assignment;
}

export function getLocalAssignmentsByOwner(ownerId: string) {
  const store = readStore();
  return store.assignments
    .filter((assignment) => assignment.owner === ownerId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getLocalAssignmentById(assignmentId: string, ownerId?: string) {
  const store = readStore();
  return (
    store.assignments.find(
      (assignment) =>
        assignment._id === assignmentId && (!ownerId || assignment.owner === ownerId)
    ) ?? null
  );
}

export function updateLocalAssignment(
  assignmentId: string,
  updater: (assignment: LocalAssignmentRecord) => LocalAssignmentRecord
) {
  const store = readStore();
  const index = store.assignments.findIndex((assignment) => assignment._id === assignmentId);

  if (index === -1) {
    return null;
  }

  const updated = updater({
    ...store.assignments[index],
    updatedAt: now(),
  });

  store.assignments[index] = updated;
  writeStore(store);
  return updated;
}

export function deleteLocalAssignment(assignmentId: string, ownerId: string) {
  const store = readStore();
  const nextAssignments = store.assignments.filter(
    (assignment) => !(assignment._id === assignmentId && assignment.owner === ownerId)
  );

  const deleted = nextAssignments.length !== store.assignments.length;
  if (deleted) {
    store.assignments = nextAssignments;
    writeStore(store);
  }

  return deleted;
}
