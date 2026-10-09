/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Deterministic Revision Task Scheduler for DkTEST Learning Intelligence
 * Generates structured, spaced, and paced tasks adhering to student constraints.
 */

import type {
  RevisionProgramConfigInput,
  RevisionTask,
  RevisionTaskType,
} from "../types/revisionProgram";

/**
 * Returns formatted date string (YYYY-MM-DD) offset by days from a base date string.
 */
export function addDays(baseDateStr: string, days: number): string {
  const d = new Date(baseDateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

/**
 * Formats a Date object to YYYY-MM-DD.
 */
export function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

/**
 * Finds the next available allowed study date on or after targetDate.
 * weeklyDays: array of 0-6 where 0=Sunday, 1=Monday, etc.
 */
export function getNextStudyDate(dateStr: string, weeklyDays: number[]): string {
  if (!weeklyDays || weeklyDays.length === 0) return dateStr;
  let cur = new Date(dateStr);
  for (let i = 0; i < 14; i++) {
    const dayOfWeek = cur.getDay();
    if (weeklyDays.includes(dayOfWeek)) {
      return formatDate(cur);
    }
    cur.setDate(cur.getDate() + 1);
  }
  return dateStr;
}

/**
 * Generates a full array of deterministic RevisionTask items for a RevisionProgram.
 */
export function scheduleRevisionTasks(
  programId: string,
  config: RevisionProgramConfigInput,
  startDateStr: string = formatDate(new Date())
): RevisionTask[] {
  const tasks: RevisionTask[] = [];
  const {
    studentUid,
    type,
    subject,
    topics = [],
    dailyTargetMinutes = 30,
    weeklyDays = [1, 2, 3, 4, 5],
    targetExamDate,
    sourceExamIds = [],
  } = config;

  let taskIndex = 0;
  const nowIso = new Date().toISOString();

  // Helper to append a task with proper ordering and date
  const createTask = (params: {
    title: string;
    description: string;
    taskType: RevisionTaskType;
    targetTopic?: string;
    sourceExamId?: string;
    targetQuestionsCount: number;
    estimatedMinutes: number;
    dueDate: string;
  }): RevisionTask => {
    taskIndex++;
    return {
      id: `task_${programId}_${taskIndex}`,
      programId,
      studentUid,
      orderIndex: taskIndex,
      title: params.title,
      description: params.description,
      taskType: params.taskType,
      targetSubject: subject,
      targetTopic: params.targetTopic,
      sourceExamId: params.sourceExamId,
      targetQuestionsCount: params.targetQuestionsCount,
      estimatedMinutes: params.estimatedMinutes,
      dueDate: getNextStudyDate(params.dueDate, weeklyDays),
      status: "pending",
      rescheduleCount: 0,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
  };

  const effectiveTopics = topics.length > 0 ? topics : [`Chương 1: Trọng tâm môn ${subject}`];

  switch (type) {
    case "exam_countdown": {
      // Calculate days until exam
      let totalDays = 30;
      if (targetExamDate) {
        const diffMs = new Date(targetExamDate).getTime() - new Date(startDateStr).getTime();
        const diffDays = Math.max(7, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
        totalDays = Math.min(diffDays, 120);
      }

      // Phase 1: Topic reviews (first 40% of time)
      const phase1Days = Math.max(3, Math.floor(totalDays * 0.4));
      const step1 = Math.max(1, Math.floor(phase1Days / effectiveTopics.length));
      effectiveTopics.forEach((topic, idx) => {
        const offset = idx * step1;
        tasks.push(
          createTask({
            title: `Luyện chuyên đề: ${topic}`,
            description: `Rèn luyện kiến thức cốt lõi và củng cố câu hỏi theo chuyên đề ${topic}.`,
            taskType: "topic_quiz",
            targetTopic: topic,
            targetQuestionsCount: 15,
            estimatedMinutes: Math.min(dailyTargetMinutes, 25),
            dueDate: addDays(startDateStr, offset),
          })
        );
      });

      // Phase 2: Mixed drills & mistake reviews (next 40% of time)
      const phase2Start = phase1Days;
      const drillCount = Math.min(5, Math.max(2, Math.floor(totalDays * 0.4 / 4)));
      for (let i = 0; i < drillCount; i++) {
        tasks.push(
          createTask({
            title: `Đề luyện tổng hợp số ${i + 1}`,
            description: `Luyện đề tổng hợp các dạng bài bám sát cấu trúc đề thi.`,
            taskType: "practice",
            targetQuestionsCount: 25,
            estimatedMinutes: Math.min(dailyTargetMinutes, 45),
            dueDate: addDays(startDateStr, phase2Start + i * 4),
          })
        );
      }

      // Phase 3: Final Sprint full mock exams (last 20% of time)
      const phase3Start = Math.floor(totalDays * 0.8);
      tasks.push(
        createTask({
          title: `Thi thử mô phỏng thời gian thực`,
          description: `Rèn luyện áp lực phòng thi với đề thi hoàn chỉnh bấm giờ nghiêm túc.`,
          taskType: "full_exam",
          targetQuestionsCount: 40,
          estimatedMinutes: Math.min(dailyTargetMinutes * 2, 60),
          dueDate: addDays(startDateStr, phase3Start),
        })
      );
      tasks.push(
        createTask({
          title: `Tổng rà soát lỗi sai trước ngày thi`,
          description: `Ôn lại toàn bộ các câu sai và ghi nhớ các bẫy thường gặp.`,
          taskType: "review_mistakes",
          targetQuestionsCount: 20,
          estimatedMinutes: Math.min(dailyTargetMinutes, 30),
          dueDate: addDays(startDateStr, Math.max(phase3Start + 3, totalDays - 2)),
        })
      );
      break;
    }

    case "weakness_remedy": {
      effectiveTopics.forEach((topic, idx) => {
        const baseDay = idx * 3;
        tasks.push(
          createTask({
            title: `Rà soát lỗ hổng: ${topic}`,
            description: `Tập trung vào các dạng bài sai nhiều và phân tích nguyên nhân lỗi sai.`,
            taskType: "review_mistakes",
            targetTopic: topic,
            targetQuestionsCount: 10,
            estimatedMinutes: Math.min(dailyTargetMinutes, 20),
            dueDate: addDays(startDateStr, baseDay),
          })
        );
        tasks.push(
          createTask({
            title: `Luyện khắc phục lỗi: ${topic}`,
            description: `Làm lại các câu tương tự để đảm bảo đã khắc phục triệt để lỗ hổng.`,
            taskType: "practice",
            targetTopic: topic,
            targetQuestionsCount: 15,
            estimatedMinutes: Math.min(dailyTargetMinutes, 25),
            dueDate: addDays(startDateStr, baseDay + 2),
          })
        );
      });
      break;
    }

    case "topic_deep_dive": {
      effectiveTopics.forEach((topic, idx) => {
        const baseDay = idx * 4;
        tasks.push(
          createTask({
            title: `Nền tảng & Khái niệm: ${topic}`,
            description: `Nắm vững lý thuyết, công thức và bài tập cơ bản.`,
            taskType: "topic_quiz",
            targetTopic: topic,
            targetQuestionsCount: 15,
            estimatedMinutes: Math.min(dailyTargetMinutes, 25),
            dueDate: addDays(startDateStr, baseDay),
          })
        );
        tasks.push(
          createTask({
            title: `Nâng cao & Vận dụng: ${topic}`,
            description: `Thử sức với các bài toán vận dụng mức độ vừa và khó.`,
            taskType: "practice",
            targetTopic: topic,
            targetQuestionsCount: 15,
            estimatedMinutes: Math.min(dailyTargetMinutes, 30),
            dueDate: addDays(startDateStr, baseDay + 2),
          })
        );
      });
      break;
    }

    case "maintenance_spaced": {
      // Spaced repetition: intervals 1, 3, 7, 14, 28 days
      const intervals = [1, 3, 7, 14, 28];
      const primaryTopic = effectiveTopics[0] || "Toàn diện";
      intervals.forEach((interval, idx) => {
        tasks.push(
          createTask({
            title: `Ôn ngắt quãng mốc ${idx + 1} (${interval} ngày)`,
            description: `Khơi gợi lại kiến thức theo chu kỳ quên Ebbinghaus để ghi nhớ dài hạn.`,
            taskType: "practice",
            targetTopic: primaryTopic,
            targetQuestionsCount: 15,
            estimatedMinutes: Math.min(dailyTargetMinutes, 25),
            dueDate: addDays(startDateStr, interval),
          })
        );
      });
      break;
    }

    case "speed_drill": {
      for (let i = 0; i < 6; i++) {
        tasks.push(
          createTask({
            title: `Phản xạ & Tốc độ chặng ${i + 1}`,
            description: `Luyện làm bài nhanh trong thời gian giới hạn, tối ưu hóa thao tác.`,
            taskType: "speed_drill",
            targetQuestionsCount: 20,
            estimatedMinutes: Math.min(dailyTargetMinutes, 20),
            dueDate: addDays(startDateStr, i * 2),
          })
        );
      }
      break;
    }

    case "retake_mastery": {
      const examTargets = sourceExamIds.length > 0 ? sourceExamIds : ["recent_exam"];
      examTargets.forEach((examId, idx) => {
        const baseDay = idx * 3;
        tasks.push(
          createTask({
            title: `Chinh phục lại câu sai đề thi ${idx + 1}`,
            description: `Làm lại toàn bộ các câu từng làm sai trong đề thi trước đây.`,
            taskType: "review_mistakes",
            sourceExamId: examId,
            targetQuestionsCount: 15,
            estimatedMinutes: Math.min(dailyTargetMinutes, 25),
            dueDate: addDays(startDateStr, baseDay),
          })
        );
        tasks.push(
          createTask({
            title: `Kiểm tra làm lại đề thi ${idx + 1}`,
            description: `Làm lại đề hoàn chỉnh để đo lường mức độ tiến bộ thực tế.`,
            taskType: "full_exam",
            sourceExamId: examId,
            targetQuestionsCount: 30,
            estimatedMinutes: Math.min(dailyTargetMinutes * 2, 45),
            dueDate: addDays(startDateStr, baseDay + 2),
          })
        );
      });
      break;
    }

    case "comprehensive_prep":
    default: {
      // 4-week balanced program
      effectiveTopics.forEach((topic, idx) => {
        tasks.push(
          createTask({
            title: `Chuyên đề ${idx + 1}: ${topic}`,
            description: `Ôn tập có trọng tâm lý thuyết và bài tập điển hình môn ${subject}.`,
            taskType: "topic_quiz",
            targetTopic: topic,
            targetQuestionsCount: 15,
            estimatedMinutes: Math.min(dailyTargetMinutes, 25),
            dueDate: addDays(startDateStr, idx * 3),
          })
        );
      });
      tasks.push(
        createTask({
          title: `Tổng ôn & Đề kiểm tra giữa kỳ`,
          description: `Đánh giá tổng hợp kiến thức đã ôn luyện.`,
          taskType: "practice",
          targetQuestionsCount: 30,
          estimatedMinutes: Math.min(dailyTargetMinutes, 40),
          dueDate: addDays(startDateStr, effectiveTopics.length * 3 + 2),
        })
      );
      break;
    }
  }

  // Deduplicate tasks: unique by (dueDate, taskType, targetTopic/title)
  const seenTaskKeys = new Set<string>();
  const deduplicatedTasks = tasks.filter((t) => {
    const key = `${t.dueDate}_${t.taskType}_${t.targetTopic || t.title}`;
    if (seenTaskKeys.has(key)) return false;
    seenTaskKeys.add(key);
    return true;
  });

  return deduplicatedTasks;
}
