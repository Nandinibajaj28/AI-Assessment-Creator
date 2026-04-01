"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { MobileHeader } from "@/components/assignment/paper/MobileHeader";
import { AssignmentResult, Question } from "@/types/assignment";
import { useAssignmentStore } from "@/store/useAssignmentStore";
import { useAuthStore } from "@/store/useAuthStore";
import { AnswerKey } from "@/components/assignment/paper/AnswerKey";
import { ExamPaper } from "@/components/assignment/paper/ExamPaper";

const PDFButton = dynamic(() => import("@/components/assignment/paper/PDFButton").then((mod) => mod.PDFButton), {
  ssr: false,
});

type AssignmentOutputPageProps = {
  result: AssignmentResult | null;
  isLoading?: boolean;
  bannerText?: string;
  onRegenerate?: () => void;
};

type AnswerKeyItem = {
  id: string;
  text: string;
};

export function AssignmentOutputPage({
  result,
  isLoading = false,
  bannerText = "Here is your question paper!",
  onRegenerate,
}: AssignmentOutputPageProps) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const { schoolName, setHeader, subjectName, className, timeAllowed } = useAssignmentStore();

  const setSchoolName = (val: string) => setHeader({ schoolName: val, subjectName, className, timeAllowed });
  const setSubjectName = (val: string) => setHeader({ schoolName, subjectName: val, className, timeAllowed });
  const setClassName = (val: string) => setHeader({ schoolName, subjectName, className: val, timeAllowed });
  const setTimeAllowed = (val: string) => setHeader({ schoolName, subjectName, className, timeAllowed: val });

  const maximumMarks = useMemo(() => {
    if (!result) return 0;

    return result.sections.reduce(
      (sectionTotal, section) =>
        sectionTotal + section.questions.reduce((questionTotal, question) => questionTotal + question.marks, 0),
      0
    );
  }, [result]);

  const answerKey = useMemo(() => buildAnswerKey(result), [result]);

  const handleRegenerate = () => {
    if (onRegenerate) {
      onRegenerate();
      return;
    }

    router.push("/create");
  };

  const handleBack = () => {
    router.push("/assignments");
  };

  return (
    <main className="min-h-[calc(100vh-20px)]">
      <div className="mx-auto flex max-w-[1180px] gap-[8px] md:min-h-[calc(100vh-20px)]">
        <section className="relative flex-1 overflow-hidden rounded-[18px] bg-[#d9d9d9] shadow-[0_18px_40px_rgba(0,0,0,0.08)]">
          <div className="md:hidden">
            <MobileHeader />
          </div>

          <div className="hidden md:block">
            <DesktopTopBar
              onBack={handleBack}
              onRegenerate={handleRegenerate}
              userName={user?.name || "User"}
            />
          </div>

          <div className="h-full overflow-y-auto px-[12px] pb-[14px] pt-[8px] md:px-[12px] md:pb-[18px] md:pt-[6px]">
            <div className="mx-auto w-full max-w-[880px]">
              <div className="rounded-[22px] bg-[#2d2d2d] px-[16px] py-[15px] text-white shadow-[0_16px_32px_rgba(0,0,0,0.16)] md:px-[18px] md:py-[17px]">
                <p className="max-w-[670px] text-[12px] font-semibold leading-[1.45] tracking-[-0.02em] text-white md:text-[14px]">
                  {bannerText}
                </p>

                <div className="mt-[12px] flex flex-wrap items-center gap-[10px]">
                  {!isLoading ? <PDFButton /> : null}
                  <button type="button" onClick={handleRegenerate} className="inline-flex h-[34px] items-center justify-center rounded-full border border-white/20 bg-white/8 px-[16px] text-[11px] font-medium text-white transition hover:bg-white/14">
                    {isLoading ? "Generating..." : "Regenerate"}
                  </button>
                  {!isLoading ? (
                    <button type="button" onClick={handleBack} className="inline-flex h-[34px] items-center justify-center rounded-full border border-white/20 bg-white px-[16px] text-[11px] font-medium text-[#2f2f2f] transition hover:bg-white/92">
                      Back to Dashboard
                    </button>
                  ) : null}
                </div>
              </div>
              <div className="mt-[10px] md:mt-[12px]">
                <ExamPaper
                  result={result}
                  isLoading={isLoading}
                  schoolName={schoolName}
                  setSchoolName={setSchoolName}
                  subjectName={subjectName}
                  setSubjectName={setSubjectName}
                  className={className}
                  setClassName={setClassName}
                  timeAllowed={timeAllowed}
                  setTimeAllowed={setTimeAllowed}
                  maximumMarks={maximumMarks}
                  answerKey={answerKey}
                />
              </div>

              {!isLoading && result ? (
                <div className="mt-[14px] md:hidden">
                  <div className="rounded-[24px] bg-white px-[18px] py-[20px] shadow-[0_14px_34px_rgba(17,24,39,0.08)]">
                    <AnswerKey items={answerKey} />
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function DesktopTopBar({
  onBack,
  onRegenerate,
  userName,
}: {
  onBack: () => void;
  onRegenerate: () => void;
  userName: string;
}) {
  return (
    <header className="px-[8px] pt-[8px]">
      <div className="flex h-[40px] items-center justify-between rounded-[14px] bg-white/82 px-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)] backdrop-blur-sm">
        <div className="flex items-center gap-3 text-[#a3a3a3]">
          <button type="button" aria-label="Back" onClick={onBack} className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-[#2e2e2e]">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M9.75 3.5L5.25 8L9.75 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <button type="button" onClick={onRegenerate} className="flex items-center gap-[5px] text-[12px] font-medium tracking-[-0.02em] text-[#4b5563]">
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M11.3 4.8A4.75 4.75 0 1 0 12 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              <path d="M10.3 2.85H12.35V4.9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Regenerate</span>
          </button>
        </div>

        <div className="flex items-center gap-5 text-[#2d2d2d]">
          <button type="button" aria-label="Notifications" className="relative flex h-5 w-5 items-center justify-center">
            <svg width="17" height="17" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M10 3.25C7.92893 3.25 6.25 4.92893 6.25 7V8.81258C6.25 9.5667 5.95662 10.2912 5.43198 10.8352L4.75 11.5427V12.25H15.25V11.5427L14.568 10.8352C14.0434 10.2912 13.75 9.5667 13.75 8.81258V7C13.75 4.92893 12.0711 3.25 10 3.25Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
              <path d="M8.25 14.25C8.47009 14.876 9.07006 15.325 9.775 15.325H10.225C10.9299 15.325 11.5299 14.876 11.75 14.25" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <span className="absolute -right-[1px] top-0 h-[6px] w-[6px] rounded-full bg-[#ff5c2d]" />
          </button>

          <button type="button" className="flex items-center gap-[10px] text-[13px] font-medium">
            <span className="flex h-[25px] w-[25px] items-center justify-center overflow-hidden rounded-full bg-[#f4d9be] text-[14px]">
              {userName.slice(0, 1).toUpperCase()}
            </span>
            <span>{userName}</span>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}

function buildAnswerKey(result: AssignmentResult | null): AnswerKeyItem[] {
  if (!result) return [];

  return result.sections.flatMap((section) =>
    section.questions.map((question, index) => ({
      id: `${section.title}-${index + 1}`,
      text: createAnswerKeyText(question, section.title, index + 1),
    }))
  );
}

function createAnswerKeyText(question: Question, sectionTitle: string, position: number) {
  const answer = (question as Question & { answer?: string }).answer?.trim();
  if (answer) {
    return `${sectionTitle} ${position}: ${answer}`;
  }

  const difficultyLabel = getDifficultyLabel(question.difficulty);
  return `${sectionTitle} ${position}: ${difficultyLabel} answer should stay grounded in the extracted document text and fit within ${question.marks} mark${question.marks === 1 ? "" : "s"}.`;
}

function getDifficultyLabel(difficulty: string) {
  const normalized = difficulty.trim().toLowerCase();

  if (normalized === "easy") return "Easy";
  if (normalized === "medium" || normalized === "moderate") return "Moderate";

  return "Challenging";
}
