export interface ClassAssignment {
  id: string;
  examId: string;
  examTitle: string;
  examCode: string;
  targetClass: string;
  dueDate: string;
  passingScore: number;
  assignedAt: number;
  createdBy: string;
  status: "open" | "closed";
}

const LOCAL_ASSIGNMENTS_KEY = "dktest_class_assignments";

export async function fetchAssignments(className?: string): Promise<ClassAssignment[]> {
  try {
    const raw = localStorage.getItem(LOCAL_ASSIGNMENTS_KEY);
    const list: ClassAssignment[] = raw ? JSON.parse(raw) : [];

    if (!className || className === "all") return list;
    return list.filter((a) => a.targetClass === className || a.targetClass === "all");
  } catch {
    return [];
  }
}

export async function createAssignment(
  data: Omit<ClassAssignment, "id" | "assignedAt">
): Promise<ClassAssignment> {
  const newId = `asgn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const item: ClassAssignment = {
    ...data,
    id: newId,
    assignedAt: Date.now(),
  };

  try {
    const raw = localStorage.getItem(LOCAL_ASSIGNMENTS_KEY);
    const list: ClassAssignment[] = raw ? JSON.parse(raw) : [];
    list.unshift(item);
    localStorage.setItem(LOCAL_ASSIGNMENTS_KEY, JSON.stringify(list));
  } catch (e) {
    console.error("Failed to persist assignment locally", e);
  }

  return item;
}

export async function deleteAssignment(id: string): Promise<void> {
  try {
    const raw = localStorage.getItem(LOCAL_ASSIGNMENTS_KEY);
    const list: ClassAssignment[] = raw ? JSON.parse(raw) : [];
    const filtered = list.filter((a) => a.id !== id);
    localStorage.setItem(LOCAL_ASSIGNMENTS_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.error("Failed to delete assignment", e);
  }
}

export async function toggleAssignmentStatus(id: string): Promise<void> {
  try {
    const raw = localStorage.getItem(LOCAL_ASSIGNMENTS_KEY);
    const list: ClassAssignment[] = raw ? JSON.parse(raw) : [];
    const updated = list.map((a) =>
      a.id === id ? { ...a, status: a.status === "open" ? ("closed" as const) : ("open" as const) } : a
    );
    localStorage.setItem(LOCAL_ASSIGNMENTS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error("Failed to toggle assignment status", e);
  }
}

export function checkStudentAssignmentStatus(
  assignment: ClassAssignment,
  studentUsername: string
): { status: "not_started" | "passed" | "failed"; score?: number } {
  if (!studentUsername) return { status: "not_started" };

  try {
    const rawHistory = localStorage.getItem(`dktest_student_submissions_${studentUsername}`) ||
      localStorage.getItem("dktest_student_submissions");
    const submissions = rawHistory ? JSON.parse(rawHistory) : [];

    // Find latest submission for this exam
    const sub = submissions.find(
      (s: any) => s.examId === assignment.examId || (s.examCode && s.examCode === assignment.examCode)
    );

    if (!sub) return { status: "not_started" };

    const score = Number(sub.score) || 0;
    if (score >= assignment.passingScore) {
      return { status: "passed", score };
    }
    return { status: "failed", score };
  } catch {
    return { status: "not_started" };
  }
}
