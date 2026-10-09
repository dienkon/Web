export interface GamificationStats {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null; // "YYYY-MM-DD"
  totalXP: number;
  level: number;
  levelTitle: string;
  currentLevelXP: number;
  nextLevelXP: number;
  progressPercent: number;
  badges: StudentBadge[];
}

export interface StudentBadge {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt: number | null;
}

const LEVEL_THRESHOLDS = [
  { level: 1, title: "Tân Binh", xp: 0 },
  { level: 2, title: "Tập Sự", xp: 100 },
  { level: 3, title: "Học Giả", xp: 300 },
  { level: 4, title: "Chiến Binh", xp: 600 },
  { level: 5, title: "Cao Thủ", xp: 1000 },
  { level: 6, title: "Kiện Tướng", xp: 1600 },
  { level: 7, title: "Huyền Thoại", xp: 2500 },
];

function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function computeStreak(dates: string[]): { currentStreak: number; longestStreak: number } {
  if (!dates || dates.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  // Deduplicate and sort descending
  const uniqueDates = Array.from(new Set(dates)).sort((a, b) => b.localeCompare(a));
  if (uniqueDates.length === 0) return { currentStreak: 0, longestStreak: 0 };

  const today = formatDateKey(new Date());
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = formatDateKey(yesterdayDate);

  const mostRecent = uniqueDates[0];
  let currentStreak = 0;

  // Streak is only active if user was active today or yesterday
  if (mostRecent === today || mostRecent === yesterday) {
    let checkDate = new Date(mostRecent);
    currentStreak = 1;

    for (let i = 1; i < uniqueDates.length; i++) {
      const prevExpected = new Date(checkDate);
      prevExpected.setDate(prevExpected.getDate() - 1);
      const expectedKey = formatDateKey(prevExpected);

      if (uniqueDates[i] === expectedKey) {
        currentStreak++;
        checkDate = prevExpected;
      } else {
        break;
      }
    }
  }

  // Calculate longest streak across all history
  let longestStreak = uniqueDates.length > 0 ? Math.max(1, currentStreak) : 0;
  let running = 1;
  for (let i = 0; i < uniqueDates.length - 1; i++) {
    const d1 = new Date(uniqueDates[i]);
    const d2 = new Date(uniqueDates[i + 1]);
    const diffDays = Math.round((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      running++;
      if (running > longestStreak) longestStreak = running;
    } else {
      running = 1;
    }
  }

  return { currentStreak, longestStreak };
}

export function computeXPAndLevel(totalScoreSum: number, examCount: number, perfectScoreCount: number) {
  // XP formula: 20 XP per exam + 10 XP per score point + 50 XP per 10/10 perfect score
  const totalXP = Math.round(examCount * 25 + totalScoreSum * 10 + perfectScoreCount * 50);

  let currentTier = LEVEL_THRESHOLDS[0];
  let nextTier = LEVEL_THRESHOLDS[1];

  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (totalXP >= LEVEL_THRESHOLDS[i].xp) {
      currentTier = LEVEL_THRESHOLDS[i];
      nextTier = LEVEL_THRESHOLDS[i + 1] || { level: currentTier.level + 1, title: "Đại Sư", xp: currentTier.xp + 1500 };
    } else {
      break;
    }
  }

  const range = nextTier.xp - currentTier.xp;
  const progressInTier = totalXP - currentTier.xp;
  const progressPercent = Math.min(100, Math.max(0, Math.round((progressInTier / (range || 1)) * 100)));

  return {
    totalXP,
    level: currentTier.level,
    levelTitle: currentTier.title,
    currentLevelXP: currentTier.xp,
    nextLevelXP: nextTier.xp,
    progressPercent,
  };
}

export function getGamificationStats(studentUsername: string): GamificationStats {
  if (!studentUsername) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: null,
      totalXP: 0,
      level: 1,
      levelTitle: "Tân Binh",
      currentLevelXP: 0,
      nextLevelXP: 100,
      progressPercent: 0,
      badges: [],
    };
  }

  try {
    const rawHistory = localStorage.getItem(`dktest_student_submissions_${studentUsername}`) ||
      localStorage.getItem("dktest_student_submissions");
    const submissions = rawHistory ? JSON.parse(rawHistory) : [];

    const dates: string[] = [];
    let scoreSum = 0;
    let perfectCount = 0;

    submissions.forEach((s: any) => {
      const ts = s.submittedAt || s.createdAt || Date.now();
      const d = new Date(typeof ts === "number" ? ts : (ts.seconds ? ts.seconds * 1000 : ts));
      if (!isNaN(d.getTime())) {
        dates.push(formatDateKey(d));
      }
      const score = Number(s.score) || 0;
      scoreSum += score;
      if (score >= 9.9) perfectCount++;
    });

    const { currentStreak, longestStreak } = computeStreak(dates);
    const xpStats = computeXPAndLevel(scoreSum, submissions.length, perfectCount);

    const journeyLevel = parseInt(localStorage.getItem("dktest_journey_level") || "1", 10);
    const hasNightExam = submissions.some((s: any) => {
      const ts = s.submittedAt || s.createdAt;
      if (!ts) return false;
      const hours = new Date(typeof ts === "number" ? ts : (ts.seconds ? ts.seconds * 1000 : ts)).getHours();
      return hours >= 22 || hours < 4;
    });
    const hasEarlyExam = submissions.some((s: any) => {
      const ts = s.submittedAt || s.createdAt;
      if (!ts) return false;
      const hours = new Date(typeof ts === "number" ? ts : (ts.seconds ? ts.seconds * 1000 : ts)).getHours();
      return hours >= 4 && hours <= 6;
    });
    const hasFastHighScorer = submissions.some((s: any) => {
      return s.durationSeconds && s.durationSeconds < 600 && Number(s.score) >= 8;
    });
    const hasEssayParticipation = submissions.some((s: any) => {
      return s.hasEssay || s.essayResponses || s.essayGraded;
    });

    const badges: StudentBadge[] = [
      {
        id: "badge_first_exam",
        title: "Khởi Đầu",
        description: "Hoàn thành bài thi đầu tiên trên hệ thống",
        icon: "🌱",
        unlockedAt: submissions.length >= 1 ? 1 : null,
      },
      {
        id: "badge_streak_3",
        title: "Chuyên Cần Đồng",
        description: "Duy trì chuỗi học tập liên tục 3 ngày",
        icon: "🔥",
        unlockedAt: currentStreak >= 3 || longestStreak >= 3 ? 1 : null,
      },
      {
        id: "badge_streak_7",
        title: "Chuyên Cần Bạc",
        description: "Duy trì chuỗi học tập kiên định 7 ngày",
        icon: "⚡",
        unlockedAt: currentStreak >= 7 || longestStreak >= 7 ? 1 : null,
      },
      {
        id: "badge_streak_14",
        title: "Bất Khả Xâm Phạm",
        description: "Duy trì chuỗi học tập liên tục 14 ngày",
        icon: "👑",
        unlockedAt: currentStreak >= 14 || longestStreak >= 14 ? 1 : null,
      },
      {
        id: "badge_perfect_10",
        title: "Điểm 10 Tuyệt Đối",
        description: "Đạt điểm 10 trọn vẹn trong một kỳ thi",
        icon: "⭐",
        unlockedAt: perfectCount >= 1 ? 1 : null,
      },
      {
        id: "badge_triple_10",
        title: "Tam Hoa Điểm 10",
        description: "Đạt từ 3 bài thi điểm 10 tuyệt đối trở lên",
        icon: "💎",
        unlockedAt: perfectCount >= 3 ? 1 : null,
      },
      {
        id: "badge_speedster",
        title: "Tia Chớp Tốc Độ",
        description: "Làm bài thi thần tốc (dưới 10 phút) đạt từ 8 điểm trở lên",
        icon: "⚡",
        unlockedAt: hasFastHighScorer ? 1 : null,
      },
      {
        id: "badge_night_owl",
        title: "Cú Đêm Chăm Chỉ",
        description: "Nỗ lực ôn luyện và nộp bài thi sau 22h đêm",
        icon: "🦉",
        unlockedAt: hasNightExam ? 1 : null,
      },
      {
        id: "badge_early_bird",
        title: "Chiến Thần Dậy Sớm",
        description: "Thức dậy sớm đón bình minh ôn bài trước 6h sáng",
        icon: "🌅",
        unlockedAt: hasEarlyExam ? 1 : null,
      },
      {
        id: "badge_essay_master",
        title: "Bậc Thầy Tự Luận",
        description: "Tham gia giải và nộp bài thi có câu hỏi tự luận AI",
        icon: "✍️",
        unlockedAt: hasEssayParticipation ? 1 : null,
      },
      {
        id: "badge_journey_starter",
        title: "Nhà Thám Hiểm",
        description: "Chinh phục từ Màn 5 trở lên trong Hành trình học tập",
        icon: "🗺️",
        unlockedAt: journeyLevel >= 5 ? 1 : null,
      },
      {
        id: "badge_journey_champion",
        title: "Chinh Phục Đỉnh Cao",
        description: "Vượt qua Màn 15 trong Hành trình học tập",
        icon: "🏰",
        unlockedAt: journeyLevel >= 15 ? 1 : null,
      },
      {
        id: "badge_veteran",
        title: "Bậc Thầy Ôn Luyện",
        description: "Hoàn thành từ 10 đề thi trở lên",
        icon: "🏆",
        unlockedAt: submissions.length >= 10 ? 1 : null,
      },
      {
        id: "badge_centurion",
        title: "Học Bá Bách Đề",
        description: "Kiên trì hoàn thành từ 25 đề thi trở lên",
        icon: "🎖️",
        unlockedAt: submissions.length >= 25 ? 1 : null,
      },
      {
        id: "badge_high_level",
        title: "Chiến Thần Cao Thủ",
        description: "Đạt cấp bậc Cao Thủ (Level 5) trong hệ thống",
        icon: "⚔️",
        unlockedAt: xpStats.level >= 5 ? 1 : null,
      },
    ];

    return {
      currentStreak,
      longestStreak,
      lastActiveDate: dates[0] || null,
      ...xpStats,
      badges,
    };
  } catch {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: null,
      totalXP: 0,
      level: 1,
      levelTitle: "Tân Binh",
      currentLevelXP: 0,
      nextLevelXP: 100,
      progressPercent: 0,
      badges: [],
    };
  }
}
