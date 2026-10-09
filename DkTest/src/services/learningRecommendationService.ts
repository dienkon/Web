/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Explainable Learning Recommendation Engine for DkTEST Learning Intelligence
 * Generates transparent, deterministic recommendations with stable reason codes and subject-accurate practice routing.
 */

import type { LearningActivity } from "../types/learningActivity";
import type { RevisionProgram, RevisionTask } from "../types/revisionProgram";
import type { TopicMastery } from "../types/topicMastery";
import type { LearningRecommendation } from "../types/recommendation";

export function resolvePracticeRouting(subject: string, topicId?: string): {
  category: string;
  subjectParam: string;
  route: string;
  mode?: string;
} {
  const norm = (subject || "").toLowerCase();
  const tNorm = (topicId || "").toLowerCase();

  if (norm.includes("lý") || norm.includes("vật lý") || norm === "physics") {
    return {
      category: "physics",
      subjectParam: "physics",
      route: "/practice?subject=physics&category=physics&mode=physics-thermal-gas",
      mode: "physics-thermal-gas",
    };
  }

  if (norm.includes("hóa") || norm.includes("hóa học") || norm === "chemistry") {
    return {
      category: "chemistry",
      subjectParam: "chemistry",
      route: "/practice?subject=chemistry&category=chemistry&mode=chemistry-ester-lipid",
      mode: "chemistry-ester-lipid",
    };
  }

  if (norm.includes("tin") || norm.includes("cs")) {
    return {
      category: "cs",
      subjectParam: "cs",
      route: "/practice?subject=cs&category=cs&mode=cs_trace_loop",
      mode: "cs_trace_loop",
    };
  }

  if (norm.includes("anh") || norm.includes("english")) {
    return {
      category: "english",
      subjectParam: "english",
      route: "/practice?subject=english&category=english&mode=english-vocab-topic",
      mode: "english-vocab-topic",
    };
  }

  // Math categories
  let cat = "expressions";
  let modeId = "evaluate-expression";
  if (tNorm.includes("equation") || tNorm.includes("phuong_trinh") || tNorm.includes("pt")) {
    cat = "equations";
    modeId = "find-x-basic";
  } else if (tNorm.includes("fraction") || tNorm.includes("phan_so")) {
    cat = "fractions";
    modeId = "fraction-add";
  } else if (tNorm.includes("geometry") || tNorm.includes("hinh_hoc")) {
    cat = "geometry";
    modeId = "perimeter-area-square-rect";
  } else if (tNorm.includes("speed") || tNorm.includes("toc_do")) {
    cat = "speed";
    modeId = "speed-60s";
  }

  return {
    category: cat,
    subjectParam: "math",
    route: `/practice?subject=math&category=${cat}&mode=${modeId}`,
    mode: modeId,
  };
}

export function generateLearningRecommendations(params: {
  studentUid: string;
  topicMastery: TopicMastery[];
  recentActivities: LearningActivity[];
  activePrograms: RevisionProgram[];
  todayTasks: RevisionTask[];
}): LearningRecommendation[] {
  const { studentUid, topicMastery, recentActivities, activePrograms, todayTasks } = params;
  const recommendations: LearningRecommendation[] = [];
  const nowIso = new Date().toISOString();
  const todayStr = nowIso.split("T")[0];

  // Rule 1: Remedy Weak Topic (Needs Foundation)
  const weakTopics = topicMastery.filter(
    (t) => t.confidenceLevel === "needs_foundation" || (t.totalAttempts >= 5 && t.accuracy < 50)
  );
  if (weakTopics.length > 0) {
    const weakest = weakTopics.sort((a, b) => a.accuracy - b.accuracy)[0];
    const routing = resolvePracticeRouting(weakest.subject, weakest.topicId);

    recommendations.push({
      id: `rec_remedy_${weakest.topicId}`,
      reasonCode: "REC_REMEDY_WEAK_TOPIC",
      priority: "high",
      title: `Củng cố kiến thức: ${weakest.topicName}`,
      description: `Độ chính xác hiện tại ở chuyên đề này là ${weakest.accuracy}%. Làm 10 câu luyện tập cơ bản để lấy lại tự tin.`,
      reasonExplanation: `Hệ thống ghi nhận bạn làm ${weakest.totalAttempts} câu chuyên đề "${weakest.topicName}" nhưng tỷ lệ đúng mới đạt ${weakest.accuracy}%. Bổ sung kiến thức nền tảng ngay sẽ giúp bạn không mất điểm ở dạng bài này.`,
      subject: weakest.subject,
      topicId: weakest.topicId,
      topicName: weakest.topicName,
      estimatedMinutes: 20,
      actionLabel: "Luyện chuyên đề này",
      actionRoute: routing.route,
      actionParams: { category: routing.category, topic: weakest.topicId, subject: routing.subjectParam, mode: routing.mode },
      evidenceData: { accuracy: weakest.accuracy },
      createdAt: nowIso,
    });
  }

  // Rule 2: Retake Mistaken Questions from Recent Exam
  const recentExamWithMistakes = recentActivities.find(
    (a) => (a.origin === "formal_exam" || a.origin === "old_exam_review") && a.accuracy < 85 && a.sourceExamId
  );
  if (recentExamWithMistakes && recentExamWithMistakes.sourceExamId) {
    const wrongCount = Math.max(
      1,
      recentExamWithMistakes.totalQuestions - recentExamWithMistakes.correctQuestions
    );
    recommendations.push({
      id: `rec_retake_${recentExamWithMistakes.sourceExamId}`,
      reasonCode: "REC_RETAKE_WRONG_EXAM",
      priority: "high",
      title: `Chinh phục lại câu sai: ${recentExamWithMistakes.title}`,
      description: `Bạn có ${wrongCount} câu chưa chính xác trong bài thi gần đây. Hãy làm lại để khắc phục triệt để.`,
      reasonExplanation: `Ôn lại các câu sai ngay khi còn nhớ mạch tư duy là phương pháp hiệu quả nhất để ngăn ngừa lặp lại sai lầm trong phòng thi.`,
      subject: recentExamWithMistakes.subject,
      sourceExamId: recentExamWithMistakes.sourceExamId,
      estimatedMinutes: 20,
      actionLabel: "Làm lại câu sai",
      actionRoute: `/exam/preview/${recentExamWithMistakes.sourceExamId}`,
      evidenceData: { wrongQuestionsCount: wrongCount, accuracy: recentExamWithMistakes.accuracy },
      createdAt: nowIso,
    });
  }

  // Rule 3: Spaced Repetition (Inactive Topic >= 7 Days)
  const staleTopics = topicMastery.filter((t) => {
    if (!t.lastPracticedAt || t.confidenceLevel === "insufficient_evidence") return false;
    const diffDays = Math.floor(
      (Date.now() - new Date(t.lastPracticedAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    return diffDays >= 7;
  });
  if (staleTopics.length > 0) {
    const stale = staleTopics[0];
    const daysSince = Math.floor(
      (Date.now() - new Date(stale.lastPracticedAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    const routing = resolvePracticeRouting(stale.subject, stale.topicId);

    recommendations.push({
      id: `rec_spaced_${stale.topicId}`,
      reasonCode: "REC_REVIEW_SPACED",
      priority: "medium",
      title: `Ôn ngắt quãng: ${stale.topicName}`,
      description: `Đã ${daysSince} ngày bạn chưa làm bài thuộc chuyên đề này. Hãy ôn lại 10 câu để duy trì trí nhớ dài hạn.`,
      reasonExplanation: `Theo đường cong lãng quên Ebbinghaus, kiến thức không được ôn lại sau 7 ngày sẽ bị suy giảm tới 60%. Một bài ôn tập ngắn 15 phút sẽ phục hồi trí nhớ bền vững.`,
      subject: stale.subject,
      topicId: stale.topicId,
      topicName: stale.topicName,
      estimatedMinutes: 15,
      actionLabel: "Ôn tập ngay",
      actionRoute: routing.route,
      actionParams: { category: routing.category, topic: stale.topicId, subject: routing.subjectParam, mode: routing.mode },
      evidenceData: { daysSinceLastPractice: daysSince },
      createdAt: nowIso,
    });
  }

  // Rule 4: Countdown Drill (Target Exam Date Approaching)
  const countdownProgram = activePrograms.find((p) => p.type === "exam_countdown" && p.targetExamDate);
  if (countdownProgram && countdownProgram.targetExamDate) {
    const diffDays = Math.max(
      0,
      Math.floor(
        (new Date(countdownProgram.targetExamDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
    );
    if (diffDays <= 45) {
      const routing = resolvePracticeRouting(countdownProgram.subject);
      recommendations.push({
        id: `rec_countdown_${countdownProgram.id}`,
        reasonCode: "REC_COUNTDOWN_DRILL",
        priority: "high",
        title: `Tăng tốc chặng nước rút: ${countdownProgram.targetExamName || "Kỳ thi mục tiêu"}`,
        description: `Chỉ còn ${diffDays} ngày tới kỳ thi. Hãy tập trung làm các đề thi thử chuẩn cấu trúc và quản lý thời gian.`,
        reasonExplanation: `Kỳ thi đang đến rất gần! Việc luyện thi bấm giờ thực tế giúp cơ thể và bộ não thích nghi tối đa với nhịp độ phòng thi.`,
        subject: countdownProgram.subject,
        estimatedMinutes: 45,
        actionLabel: "Luyện đề thi thử",
        actionRoute: routing.route,
        actionParams: { category: routing.category, subject: routing.subjectParam, mode: routing.mode },
        evidenceData: { daysUntilExam: diffDays },
        createdAt: nowIso,
      });
    }
  }

  // Rule 5: Challenge High Streak / Mastery
  const highAccuracyActivities = recentActivities.slice(0, 3).filter((a) => a.accuracy >= 90);
  if (highAccuracyActivities.length >= 2 && recommendations.length < 3) {
    const sub = recentActivities[0]?.subject || "Toán";
    const routing = resolvePracticeRouting(sub);
    recommendations.push({
      id: "rec_challenge_streak",
      reasonCode: "REC_CHALLENGE_STREAK",
      priority: "medium",
      title: "Thử thách bứt phá điểm 9+",
      description: "Phong độ làm bài của bạn đang rất xuất sắc! Hãy thử sức với các câu hỏi vận dụng cao (VDC).",
      reasonExplanation: "Các bài gần nhất bạn đều đạt độ chính xác trên 90%. Đây là thời điểm lý tưởng để chinh phục câu hỏi phân loại khó hơn.",
      subject: sub,
      estimatedMinutes: 30,
      actionLabel: "Thử thách nâng cao",
      actionRoute: routing.route,
      actionParams: { category: routing.category, subject: routing.subjectParam, mode: routing.mode },
      createdAt: nowIso,
    });
  }

  // Fallback: Maintain Daily Routine
  if (recommendations.length === 0) {
    const routing = resolvePracticeRouting("Toán");
    recommendations.push({
      id: "rec_maintain_pace",
      reasonCode: "REC_MAINTAIN_PACE",
      priority: "low",
      title: "Rèn luyện nhịp độ học tập hàng ngày",
      description: "Dành 15 phút làm một bài tập ngắn để duy trì ngọn lửa học tập và nâng cao chuỗi ngày Streak.",
      reasonExplanation: "Học tập đều đặn mỗi ngày dù chỉ 15 phút mang lại hiệu quả gấp 3 lần so với dồn nhiều giờ vào cuối tuần.",
      subject: "Toán",
      estimatedMinutes: 15,
      actionLabel: "Bắt đầu làm bài",
      actionRoute: routing.route,
      actionParams: { category: routing.category, subject: routing.subjectParam, mode: routing.mode },
      createdAt: nowIso,
    });
  }

  return recommendations.slice(0, 4);
}
