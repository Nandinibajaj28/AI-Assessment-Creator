"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAssignment, getAssignments, regenerateAssignment } from "@/services/api";
import { getSocket } from "@/lib/socket";
import { useAssignmentStore } from "@/store/useAssignmentStore";
import { AssignmentDoneEvent, AssignmentResult } from "@/types/assignment";
import { AssignmentOutputPage } from "@/components/assignment/paper/AssignmentOutputPage";

type AssignmentPaperClientProps = {
  id: string;
};

const hasStructuredSections = (result: AssignmentResult | null): result is AssignmentResult => {
  if (!result || !Array.isArray(result.sections)) return false;

  return result.sections.every(
    (section) =>
      typeof section.title === "string" &&
      Array.isArray(section.questions) &&
      section.questions.every(
        (question) =>
          typeof question.text === "string" &&
          typeof question.difficulty === "string" &&
          typeof question.marks === "number"
      )
  );
};

export function AssignmentPaperClient({ id }: AssignmentPaperClientProps) {
  const router = useRouter();
  const { assignmentId, result, setAssignmentId, setResult } = useAssignmentStore();
  const currentResult = assignmentId === id && hasStructuredSections(result) ? result : null;
  const hasCurrentResult = assignmentId === id && currentResult !== null;

  const [isWaiting, setIsWaiting] = useState(!hasCurrentResult);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchAssignment = async () => {
      try {
        const data = await getAssignment(id);
        const { setHeader, setResult: setStoreResult } = useAssignmentStore.getState();

        setHeader({
          schoolName: data.schoolName || "",
          subjectName: data.subjectName || "",
          className: data.className || "",
          timeAllowed: data.timeAllowed || "",
        });

        if (data.status === "failed") {
          setErrorMessage(data.errorMessage || "Unable to extract readable text from the uploaded file.");
          setStoreResult(null);
          setIsWaiting(false);
          return;
        }

        if (data.status === "completed" && data.result) {
          setErrorMessage(null);
          setStoreResult(hasStructuredSections(data.result) ? data.result : null);
          setIsWaiting(false);
        }
      } catch (err) {
        console.error("Failed to fetch assignment:", err);
        setErrorMessage("Unable to fetch the generated assignment.");
        setIsWaiting(false);
      }
    };

    void fetchAssignment();

    const socket = getSocket();
    socket.connect();

    const onDone = async (payload: AssignmentDoneEvent) => {
      if (payload?.assignmentId !== id) return;

      setAssignmentId(payload.assignmentId);
      useAssignmentStore.getState().setHeader({
        schoolName: payload.schoolName,
        subjectName: payload.subjectName,
        className: payload.className,
        timeAllowed: payload.timeAllowed,
      });

      if (payload.errorMessage) {
        setResult(null);
        setErrorMessage(payload.errorMessage);
        setIsWaiting(false);
        setIsRegenerating(false);
        return;
      }

      setResult(hasStructuredSections(payload.result ?? null) ? (payload.result ?? null) : null);
      const latestAssignments = await getAssignments().catch(() => null);
      if (latestAssignments) {
        useAssignmentStore.getState().setAssignments(latestAssignments);
      }
      setErrorMessage(null);
      setIsWaiting(false);
      setIsRegenerating(false);
    };

    socket.on("assignment_done", onDone);

    return () => {
      socket.off("assignment_done", onDone);
    };
  }, [id, setAssignmentId, setResult]);

  const handleRegenerate = async () => {
    try {
      setIsRegenerating(true);
      setIsWaiting(true);
      setErrorMessage(null);
      setResult(null);
      await regenerateAssignment(id);
    } catch {
      setIsRegenerating(false);
      setIsWaiting(false);
      setErrorMessage("Unable to regenerate the assignment. Please try again.");
      router.push(`/assignment/${id}`);
    }
  };

  return (
    <AssignmentOutputPage
      result={hasCurrentResult ? currentResult : null}
      isLoading={isWaiting || isRegenerating}
      errorMessage={errorMessage}
      onRegenerate={handleRegenerate}
    />
  );
}
