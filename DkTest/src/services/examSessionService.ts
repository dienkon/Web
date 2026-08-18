export interface ActiveExamSession {
  examId: string;
  examTitle?: string;
  examCode?: string;
  studentUsername: string;
  studentName: string;
  startTime: number; // timestamp ms
  durationMinutes: number; // in minutes
  endTime: number; // timestamp ms (startTime + durationMinutes * 60 * 1000)
  answers: Record<string, any>;
  flagged: Record<string, boolean>;
  activeQuestionIdx: number;
  warnings: number;
  updatedAt: number;
  status: "in-progress" | "submitted" | "expired";
}

const GLOBAL_ACTIVE_SESSION_KEY = "active_exam_session";

function getStudentIdentifier(): string {
  try {
    const studentInfoStr = localStorage.getItem("student_info") || localStorage.getItem("current_student_session");
    if (studentInfoStr) {
      const parsed = JSON.parse(studentInfoStr);
      return parsed.username || parsed.displayName || "student";
    }
  } catch (e) {}
  return "student";
}

export function saveActiveExamSession(data: {
  examId: string;
  examTitle?: string;
  examCode?: string;
  studentUsername?: string;
  studentName?: string;
  startTime: number;
  durationMinutes: number;
  answers: Record<string, any>;
  flagged?: Record<string, boolean>;
  activeQuestionIdx?: number;
  warnings?: number;
}): ActiveExamSession {
  const studentUsername = data.studentUsername || getStudentIdentifier();
  const studentName = data.studentName || "Thí sinh";
  const endTime = data.startTime + Math.max(1, data.durationMinutes) * 60 * 1000;

  const session: ActiveExamSession = {
    examId: data.examId,
    examTitle: data.examTitle || "Bài kiểm tra",
    examCode: data.examCode || "",
    studentUsername,
    studentName,
    startTime: data.startTime,
    durationMinutes: data.durationMinutes,
    endTime,
    answers: data.answers || {},
    flagged: data.flagged || {},
    activeQuestionIdx: data.activeQuestionIdx || 0,
    warnings: data.warnings || 0,
    updatedAt: Date.now(),
    status: "in-progress",
  };

  try {
    localStorage.setItem(GLOBAL_ACTIVE_SESSION_KEY, JSON.stringify(session));
    localStorage.setItem(`active_exam_${data.examId}_${studentUsername}`, JSON.stringify(session));
    // Also save legacy startTime key for backward compatibility
    localStorage.setItem(`exam_startTime_${data.examId}_${studentUsername}`, data.startTime.toString());
  } catch (e) {
    console.warn("Could not save active exam session to localStorage:", e);
  }

  return session;
}

export function updateActiveExamSessionAnswers(
  examId: string,
  answers: Record<string, any>,
  extra?: {
    flagged?: Record<string, boolean>;
    activeQuestionIdx?: number;
    warnings?: number;
  }
) {
  try {
    const current = getActiveExamSession(examId);
    if (current && current.status === "in-progress") {
      current.answers = answers;
      if (extra?.flagged !== undefined) current.flagged = extra.flagged;
      if (extra?.activeQuestionIdx !== undefined) current.activeQuestionIdx = extra.activeQuestionIdx;
      if (extra?.warnings !== undefined) current.warnings = extra.warnings;
      current.updatedAt = Date.now();

      localStorage.setItem(GLOBAL_ACTIVE_SESSION_KEY, JSON.stringify(current));
      localStorage.setItem(`active_exam_${examId}_${current.studentUsername}`, JSON.stringify(current));
    }
  } catch (e) {
    console.warn("Error updating active exam session answers:", e);
  }
}

export function getActiveExamSession(examId?: string): ActiveExamSession | null {
  try {
    const sessionStr = localStorage.getItem(GLOBAL_ACTIVE_SESSION_KEY);
    if (!sessionStr) return null;

    const session: ActiveExamSession = JSON.parse(sessionStr);
    if (!session || !session.examId || session.status !== "in-progress") {
      return null;
    }

    if (examId && session.examId !== examId) {
      return null;
    }

    // Check if session has expired
    const remainingMs = session.endTime - Date.now();
    if (remainingMs <= 0) {
      session.status = "expired";
      localStorage.setItem(GLOBAL_ACTIVE_SESSION_KEY, JSON.stringify(session));
      return session;
    }

    return session;
  } catch (e) {
    console.warn("Error reading active exam session:", e);
    return null;
  }
}

export function hasActiveExamInProgress(): ActiveExamSession | null {
  const session = getActiveExamSession();
  if (!session) return null;

  const remainingMs = session.endTime - Date.now();
  // If at least 3 seconds left, it is actively in progress
  if (session.status === "in-progress" && remainingMs > 3000) {
    return session;
  }

  return null;
}

export function clearActiveExamSession(examId?: string) {
  try {
    const studentUsername = getStudentIdentifier();
    localStorage.removeItem(GLOBAL_ACTIVE_SESSION_KEY);
    if (examId) {
      localStorage.removeItem(`active_exam_${examId}_${studentUsername}`);
      localStorage.removeItem(`exam_startTime_${examId}_${studentUsername}`);
      localStorage.removeItem(`attemptSnapshot_${examId}_${studentUsername}`);
      localStorage.removeItem(`custom_sub_exam_config_${examId}`);
    }
  } catch (e) {
    console.warn("Error clearing active exam session:", e);
  }
}
