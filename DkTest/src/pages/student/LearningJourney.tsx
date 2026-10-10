/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * DkTEST 3D Learning Journey — Visual Overhaul, Immersive Effects & Advanced Learning World
 * Features:
 * - 3D Landscape Viewport with Camera Controls, Isometric Tilt, and Subject Atmospheres
 * - Interactive Node Detail Panel (Sidebar / Bottom Sheet) with Real Learning Data
 * - Daily Missions & Goals Widget
 * - Knowledge Crystals & Collectibles Showcase
 * - Knowledge Atlas (Search & Quick Jump Camera)
 * - Map Legend & Visual Symbols Guide
 * - Animated Progress Replay
 * - Dual Mode: Longitudinal Intelligence Roadmap & 3D Interactive Gamified World
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import RevealOnScroll from "../../components/common/RevealOnScroll";
import {
  Trophy,
  Heart,
  Lock,
  Check,
  Play,
  RotateCcw,
  Sparkles,
  ArrowLeft,
  ChevronRight,
  Flame,
  Award,
  Zap,
  HelpCircle,
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
  Compass,
  Star,
  ShieldCheck,
  BookOpen,
  Atom,
  FlaskConical,
  Calculator,
  ChevronDown,
  Calendar,
  Target,
  Plus,
  TrendingUp,
  MapPin,
  Info,
  Users,
  BookMarked,
  Sliders,
  Share2,
} from "lucide-react";
import confetti from "canvas-confetti";
import { collection, doc, getDocs, limit, orderBy, query, setDoc, where, onSnapshot } from "firebase/firestore";
import { db } from "../../services/firebase/config";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/ui/ToastNotification";
import LatexPreview from "../../features/exam-builder/editor/LatexPreview";
import {
  getSubjectJourneyQuestions,
  JourneyQuestionItem,
} from "../../features/journey/data/journeySubjectQuestions";

// Learning Intelligence imports
import type { LearningActivity, StudentLearningStats } from "../../types/learningActivity";
import {
  getStudentLearningActivities,
  getStudentLearningStats,
  computeStudentLearningStats,
  saveLearningActivity,
} from "../../services/learningActivityService";
import type {
  RevisionProgram,
  RevisionProgramConfigInput,
  RevisionTask,
} from "../../types/revisionProgram";
import {
  getStudentRevisionPrograms,
  getTodayTasks,
  completeTask,
  rescheduleTask,
  createRevisionProgram,
} from "../../services/revisionProgramService";
import type { TopicMastery } from "../../types/topicMastery";
import {
  getStudentTopicMastery,
  recordTopicEvidence,
} from "../../services/topicMasteryService";
import type { LearningRecommendation } from "../../types/recommendation";
import { generateLearningRecommendations } from "../../services/learningRecommendationService";

import TopicMasteryCard from "../../components/journey/TopicMasteryCard";
import JourneyTimeline from "../../components/journey/JourneyTimeline";
import TodayTasksWidget from "../../components/revision/TodayTasksWidget";
import RevisionProgramWizardModal from "../../components/revision/RevisionProgramWizardModal";

// 3D Journey Experience imports
import type {
  Journey3DNode,
  QualityProfile,
  SubjectThemeType,
} from "../../features/journey/types/journey3D";
import World3DViewport from "../../features/journey/components/World3DViewport";
import NodeDetailPanel from "../../features/journey/components/NodeDetailPanel";
import DailyMissionsWidget from "../../features/journey/components/DailyMissionsWidget";
import CollectiblesModal from "../../features/journey/components/CollectiblesModal";
import KnowledgeAtlasModal from "../../features/journey/components/KnowledgeAtlasModal";
import MapLegendModal from "../../features/journey/components/MapLegendModal";
import ProgressReplayModal from "../../features/journey/components/ProgressReplayModal";
import StoryCampaignsModal from "../../features/journey/components/StoryCampaignsModal";
import KnowledgeConstellationModal from "../../features/journey/components/KnowledgeConstellationModal";
import JourneyModesModal from "../../features/journey/components/JourneyModesModal";
import CooperativeExpeditionsModal from "../../features/journey/components/CooperativeExpeditionsModal";
import DiscoveryJournalModal from "../../features/journey/components/DiscoveryJournalModal";
import DiscoveryEventsModal from "../../features/journey/components/DiscoveryEventsModal";
import JourneySettingsModal from "../../features/journey/components/JourneySettingsModal";
import AccessibleJourneyView from "../../features/journey/components/AccessibleJourneyView";
import StudyCompanionWidget from "../../features/journey/components/StudyCompanionWidget";
import { MobileContinueBar } from "../../features/journey/components/MobileContinueBar";
import { FocusSessionModal } from "../../features/journey/components/FocusSessionModal";
import { MilestoneRecapModal } from "../../features/journey/components/MilestoneRecapModal";
import { MobileMapOverviewHUD } from "../../features/journey/components/MobileMapOverviewHUD";

import { getStudentCollectibles } from "../../features/journey/services/journeyCollectiblesService";
import { generateDailyMissions } from "../../features/journey/services/journeyMissionsService";
import { recordMilestoneEntry } from "../../features/journey/services/discoveryJournalService";
import {
  getStudentExpeditions,
  contributeToExpedition,
} from "../../features/journey/services/cooperativeExpeditionService";
import type { JourneyModeType } from "../../features/journey/services/journeySessionService";
import type { CampaignNode } from "../../features/journey/types/campaign";

const TOTAL_LEVELS = 50;
const MAX_HEARTS = 5;
const HEART_RECOVERY_INTERVAL_MS = 5 * 60 * 1000; // 5 phút hồi 1 tim = 300.000 ms

type JourneyMode = "roadmap" | "gamified";

interface LeaderboardUser {
  rank?: number;
  username: string;
  displayName: string;
  level: number;
  avatar: string;
}

export default function LearningJourney() {
  const { user, userProfile } = useAuth();
  const { success: showSuccessToast, error: showErrorToast, info: showInfoToast } = useToast();

  // Mode Switcher: "roadmap" (Lộ trình & Mục tiêu Học tập) vs "gamified" (Bản đồ Chinh phục 3D)
  const [journeyMode, setJourneyMode] = useState<JourneyMode>(() => {
    return (localStorage.getItem("dktest_journey_mode") as JourneyMode) || "gamified";
  });

  const handleSwitchMode = useCallback((mode: JourneyMode) => {
    setJourneyMode(mode);
    localStorage.setItem("dktest_journey_mode", mode);
  }, []);

  // Student identifier resolution (Require authentic UID for Firestore private paths)
  const studentUid = user?.uid || "";
  const studentUsername =
    userProfile?.username ||
    user?.displayName ||
    localStorage.getItem("student_name") ||
    "Học sinh";

  // --- ROADMAP & LEARNING INTELLIGENCE STATE ---
  const [isWizardOpen, setIsWizardOpen] = useState<boolean>(false);
  const [loadingRoadmap, setLoadingRoadmap] = useState<boolean>(true);
  const [stats, setStats] = useState<StudentLearningStats>({
    totalActivitiesCompleted: 0,
    totalActiveStudyMinutes: 0,
    averageAccuracy: 0,
    formalExamsCount: 0,
    practiceSessionsCount: 0,
    oldExamReviewsCount: 0,
    journeyChallengesCount: 0,
    currentStreakDays: 0,
  });
  const [activities, setActivities] = useState<LearningActivity[]>([]);
  const [activePrograms, setActivePrograms] = useState<RevisionProgram[]>([]);
  const [todayTasks, setTodayTasks] = useState<RevisionTask[]>([]);
  const [topicMasteries, setTopicMasteries] = useState<TopicMastery[]>([]);
  const [recommendations, setRecommendations] = useState<LearningRecommendation[]>([]);
  const [selectedMasterySubject, setSelectedMasterySubject] = useState<string>("all");
  const [countdownTarget, setCountdownTarget] = useState<"thpt" | "dgnl">("thpt");

  // Load Roadmap Data without redundant Firestore reads
  const loadRoadmapData = useCallback(async (isCancelledCheck?: () => boolean) => {
    if (!studentUid) {
      setLoadingRoadmap(false);
      return;
    }
    setLoadingRoadmap(true);
    try {
      // 1. Fetch activities, programs, and mastery in parallel
      const [fetchedActivities, fetchedPrograms, fetchedMastery] = await Promise.all([
        getStudentLearningActivities({ studentUid, limitCount: 50 }),
        getStudentRevisionPrograms(studentUid),
        getStudentTopicMastery(studentUid),
      ]);

      if (isCancelledCheck?.()) return;

      // 2. Pure in-memory stats aggregation — 0 duplicate activity reads
      const fetchedStats = computeStudentLearningStats(fetchedActivities);

      // 3. Query today's tasks using the already-loaded active programs — 0 duplicate program reads
      const fetchedTasks = await getTodayTasks(studentUid, undefined, fetchedPrograms);

      if (isCancelledCheck?.()) return;

      setActivities(fetchedActivities);
      setStats(fetchedStats);
      setActivePrograms(fetchedPrograms);
      setTodayTasks(fetchedTasks);
      setTopicMasteries(fetchedMastery);

      // 4. Generate explainable recommendations from in-memory data
      const recs = generateLearningRecommendations({
        studentUid,
        topicMastery: fetchedMastery,
        recentActivities: fetchedActivities,
        activePrograms: fetchedPrograms,
        todayTasks: fetchedTasks,
      });
      setRecommendations(recs);
    } catch (err) {
      console.warn("[LearningJourney] Error loading roadmap data:", err);
    } finally {
      if (!isCancelledCheck?.()) {
        setLoadingRoadmap(false);
      }
    }
  }, [studentUid]);

  useEffect(() => {
    let isCancelled = false;
    loadRoadmapData(() => isCancelled);
    return () => {
      isCancelled = true;
    };
  }, [loadRoadmapData]);

  const handleCreateProgram = async (config: RevisionProgramConfigInput) => {
    await createRevisionProgram(config);
    showSuccessToast("🎉 Kích hoạt lộ trình ôn tập mới thành công!");
    await loadRoadmapData();
  };

  const handleCompleteTask = async (taskId: string) => {
    await completeTask(taskId, studentUid);
    showSuccessToast("Đã hoàn thành nhiệm vụ ôn tập!");
    // Optimistically update today tasks and program progress without full 5-collection reload
    setTodayTasks((prev) => prev.filter((t) => t.id !== taskId));
    setActivePrograms((prev) =>
      prev.map((p) => {
        const matches = todayTasks.some((t) => t.id === taskId && t.programId === p.id);
        if (matches) {
          const completed = p.progress.completedTasks + 1;
          const pending = Math.max(0, p.progress.pendingTasks - 1);
          const percent = p.progress.totalTasks > 0 ? Math.round((completed / p.progress.totalTasks) * 100) : 100;
          return {
            ...p,
            progress: { ...p.progress, completedTasks: completed, pendingTasks: pending, percentComplete: percent },
          };
        }
        return p;
      })
    );
  };

  const handleRescheduleTask = async (taskId: string) => {
    const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split("T")[0];
    await rescheduleTask(taskId, studentUid, tomorrowStr);
    showInfoToast("Đã hoãn nhiệm vụ sang ngày mai!");
    setTodayTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  // --- GAMIFIED 3D WORLD STATE & MECHANICS ---
  const [activeSubject, setActiveSubject] = useState<SubjectThemeType>(() => {
    const saved = localStorage.getItem("dktest_journey_active_tab");
    return (saved as SubjectThemeType) || "math";
  });

  const [levelsProgress, setLevelsProgress] = useState<Record<SubjectThemeType, number>>(() => {
    return {
      math: Math.max(1, parseInt(localStorage.getItem("dktest_journey_level_math") || "1", 10)),
      physics: Math.max(1, parseInt(localStorage.getItem("dktest_journey_level_physics") || "1", 10)),
      chemistry: Math.max(1, parseInt(localStorage.getItem("dktest_journey_level_chemistry") || "1", 10)),
    };
  });

  const currentLevel = levelsProgress[activeSubject] || 1;

  // Strict Heart Mechanics (1 heart per 5 mins, no free refills)
  const [hearts, setHearts] = useState<number>(() => {
    const saved = localStorage.getItem("dktest_journey_hearts");
    return saved !== null ? Math.min(MAX_HEARTS, Math.max(0, parseInt(saved, 10))) : MAX_HEARTS;
  });
  const [lastHeartLostAt, setLastHeartLostAt] = useState<number | null>(() => {
    const saved = localStorage.getItem("dktest_journey_last_heart_lost_at");
    return saved ? parseInt(saved, 10) : null;
  });
  const [secondsUntilNextHeart, setSecondsUntilNextHeart] = useState<number>(0);

  // Real Leaderboard from Firestore
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState<boolean>(true);

  // Active Challenge Modal State
  const [activeModalLevel, setActiveModalLevel] = useState<number | null>(null);
  const [quizIndex, setQuizIndex] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerChecked, setIsAnswerChecked] = useState<boolean>(false);
  const [isLevelCompleted, setIsLevelCompleted] = useState<boolean>(false);

  // 3D Quality Profile & Modals State
  const [quality, setQuality] = useState<QualityProfile>(() => {
    return (localStorage.getItem("dktest_journey_quality") as QualityProfile) || "high";
  });
  const [selectedNode, setSelectedNode] = useState<Journey3DNode | null>(null);
  const [isAtlasOpen, setIsAtlasOpen] = useState<boolean>(false);
  const [isCollectiblesOpen, setIsCollectiblesOpen] = useState<boolean>(false);
  const [isLegendOpen, setIsLegendOpen] = useState<boolean>(false);
  const [isReplayOpen, setIsReplayOpen] = useState<boolean>(false);
  const [isCampaignsOpen, setIsCampaignsOpen] = useState<boolean>(false);
  const [isConstellationOpen, setIsConstellationOpen] = useState<boolean>(false);
  const [isModesOpen, setIsModesOpen] = useState<boolean>(false);
  const [isExpeditionsOpen, setIsExpeditionsOpen] = useState<boolean>(false);
  const [isJournalOpen, setIsJournalOpen] = useState<boolean>(false);
  const [isEventsOpen, setIsEventsOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isFocusModalOpen, setIsFocusModalOpen] = useState<boolean>(false);
  const [focusTargetLevel, setFocusTargetLevel] = useState<number>(1);
  const [isMilestoneRecapOpen, setIsMilestoneRecapOpen] = useState<boolean>(false);
  const [milestoneRecapLevel, setMilestoneRecapLevel] = useState<number>(1);

  const handleOpenFocusModal = useCallback((lvl?: number) => {
    setFocusTargetLevel(lvl || currentLevel);
    setIsFocusModalOpen(true);
  }, [currentLevel]);

  const [reducedMotion, setReducedMotion] = useState<boolean>(
    () => localStorage.getItem("dktest_journey_reduced_motion") === "true"
  );
  const [ambientParticles, setAmbientParticles] = useState<boolean>(
    () => localStorage.getItem("dktest_journey_ambient_particles") !== "false"
  );
  const [accessibleMode, setAccessibleMode] = useState<boolean>(
    () => localStorage.getItem("dktest_journey_accessible_mode") === "true"
  );

  const handleToggleReducedMotion = useCallback(() => {
    setReducedMotion((prev) => {
      const next = !prev;
      localStorage.setItem("dktest_journey_reduced_motion", String(next));
      return next;
    });
  }, []);

  const handleToggleParticles = useCallback(() => {
    setAmbientParticles((prev) => {
      const next = !prev;
      localStorage.setItem("dktest_journey_ambient_particles", String(next));
      return next;
    });
  }, []);

  const handleToggleAccessibleMode = useCallback(() => {
    setAccessibleMode((prev) => {
      const next = !prev;
      localStorage.setItem("dktest_journey_accessible_mode", String(next));
      return next;
    });
  }, []);

  const handleQualityChange = useCallback((q: QualityProfile) => {
    setQuality(q);
    localStorage.setItem("dktest_journey_quality", q);
  }, []);

  const handleSelectNode = useCallback((node: Journey3DNode | null) => {
    setSelectedNode(node);
  }, []);

  // Collectibles & Missions
  const collectibles = useMemo(() => {
    return getStudentCollectibles(levelsProgress);
  }, [levelsProgress]);

  const dailyMissions = useMemo(() => {
    return generateDailyMissions({ activeSubject, currentLevel, stats });
  }, [activeSubject, currentLevel, stats]);

  // Construct 50 3D Nodes for current subject
  const journeyNodes: Journey3DNode[] = useMemo(() => {
    const nodes: Journey3DNode[] = [];
    for (let lvl = 1; lvl <= TOTAL_LEVELS; lvl++) {
      const questions = getSubjectJourneyQuestions(activeSubject, lvl);
      const firstQ = questions[0];
      const isCompleted = lvl < currentLevel;
      const isCurrent = lvl === currentLevel;
      const isCheckpoint = lvl === 10 || lvl === 25 || lvl === 40;
      const isBoss = lvl === 50;

      // Serpentine curve: x weaves from 20% to 80%
      const xPos = 50 + Math.sin((lvl - 1) * 0.78) * 32;
      const yPos = 90 + (lvl - 1) * 135;

      nodes.push({
        id: `node_${activeSubject}_${lvl}`,
        level: lvl,
        subject: activeSubject,
        title: `Màn ${lvl}`,
        topicName: firstQ?.title || `Chuyên đề Màn ${lvl}`,
        archetype: lvl === 1 ? "entrance" : isBoss ? "boss" : isCheckpoint ? "checkpoint" : "standard",
        state: isCompleted ? "completed" : isCurrent ? "current" : "locked",
        x: xPos,
        y: yPos,
        elevation: (lvl % 3) * 8,
        prerequisites: lvl > 1 ? [lvl - 1] : [],
        isCheckpoint,
        isBoss,
        questionCount: questions.length,
        estimatedMinutes: isBoss ? 10 : isCheckpoint ? 5 : 3,
      });
    }
    return nodes;
  }, [activeSubject, currentLevel]);

  // Current user info
  const currentUserInfo = useMemo(() => {
    return {
      username: studentUsername,
      displayName: userProfile?.displayName || user?.displayName || studentUsername,
    };
  }, [studentUsername, userProfile, user]);

  // Switch subject
  const handleSwitchSubject = useCallback((sub: SubjectThemeType) => {
    setActiveSubject(sub);
    localStorage.setItem("dktest_journey_active_tab", sub);
    setSelectedNode(null);
  }, []);

  // Sync level progress to Firestore & LocalStorage
  useEffect(() => {
    const lvlKey = `dktest_journey_level_${activeSubject}`;
    localStorage.setItem(lvlKey, String(currentLevel));

    if (currentUserInfo.username) {
      const syncToFirestore = async () => {
        try {
          const docId = `${currentUserInfo.username}_${activeSubject}`;
          const docRef = doc(db, "journey_progress", docId);
          await setDoc(
            docRef,
            {
              username: currentUserInfo.username,
              displayName: currentUserInfo.displayName,
              subject: activeSubject,
              level: currentLevel,
              avatar: currentUserInfo.displayName?.[0]?.toUpperCase() || "B",
              updatedAt: Date.now(),
            },
            { merge: true }
          );
        } catch {}
      };
      syncToFirestore();
    }
  }, [currentLevel, activeSubject, currentUserInfo]);

  // Heart recovery interval check (1 heart / 5 min)
  useEffect(() => {
    const checkHeartRecovery = () => {
      const now = Date.now();
      const storedHearts = parseInt(localStorage.getItem("dktest_journey_hearts") || String(MAX_HEARTS), 10);
      const lostAtStr = localStorage.getItem("dktest_journey_last_heart_lost_at");

      if (storedHearts >= MAX_HEARTS) {
        setHearts(MAX_HEARTS);
        setSecondsUntilNextHeart(0);
        return;
      }

      if (!lostAtStr) {
        localStorage.setItem("dktest_journey_last_heart_lost_at", String(now));
        setLastHeartLostAt(now);
        setSecondsUntilNextHeart(HEART_RECOVERY_INTERVAL_MS / 1000);
        return;
      }

      const lostAt = parseInt(lostAtStr, 10);
      const elapsed = now - lostAt;

      if (elapsed >= HEART_RECOVERY_INTERVAL_MS) {
        const heartsToAdd = Math.floor(elapsed / HEART_RECOVERY_INTERVAL_MS);
        const newHearts = Math.min(MAX_HEARTS, storedHearts + heartsToAdd);
        setHearts(newHearts);
        localStorage.setItem("dktest_journey_hearts", String(newHearts));

        if (newHearts >= MAX_HEARTS) {
          setLastHeartLostAt(null);
          localStorage.removeItem("dktest_journey_last_heart_lost_at");
          setSecondsUntilNextHeart(0);
          showSuccessToast("❤️ Bạn đã được hồi phục đầy đủ 5 tim!");
        } else {
          const nextLostAt = lostAt + heartsToAdd * HEART_RECOVERY_INTERVAL_MS;
          setLastHeartLostAt(nextLostAt);
          localStorage.setItem("dktest_journey_last_heart_lost_at", String(nextLostAt));
          const rem = Math.max(0, HEART_RECOVERY_INTERVAL_MS - (now - nextLostAt));
          setSecondsUntilNextHeart(Math.ceil(rem / 1000));
          showInfoToast("❤️ Bạn vừa được hồi phục thêm 1 tim!");
        }
      } else {
        const rem = Math.max(0, HEART_RECOVERY_INTERVAL_MS - elapsed);
        setSecondsUntilNextHeart(Math.ceil(rem / 1000));
      }
    };

    checkHeartRecovery();
    const interval = setInterval(checkHeartRecovery, 1000);
    return () => clearInterval(interval);
  }, [showSuccessToast, showInfoToast]);

  // Real Leaderboard from Firestore (Realtime Listener with In-Memory Sort to prevent missing composite index)
  useEffect(() => {
    let isCancelled = false;
    setLoadingLeaderboard(true);

    // Query by subject only (no orderBy in query to avoid requiring composite index on Firestore)
    const q = query(
      collection(db, "journey_progress"),
      where("subject", "==", activeSubject)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        if (isCancelled) return;
        const list: LeaderboardUser[] = [];
        let hasCurrentUser = false;

        snap.forEach((docSnap) => {
          const data = docSnap.data();
          const uname = data.username || docSnap.id;
          const isMe = uname === currentUserInfo.username;
          if (isMe) hasCurrentUser = true;

          list.push({
            username: uname,
            displayName: data.displayName || data.username || "Thí sinh",
            level: isMe ? Math.max(data.level || 1, currentLevel) : data.level || 1,
            avatar: data.avatar || (data.displayName?.[0] || data.username?.[0] || "B").toUpperCase(),
          });
        });

        // Ensure current user is always included even before first sync
        if (!hasCurrentUser && currentUserInfo.username) {
          list.push({
            username: currentUserInfo.username,
            displayName: currentUserInfo.displayName,
            level: currentLevel,
            avatar: currentUserInfo.displayName?.[0]?.toUpperCase() || "B",
          });
        }

        // Sort descending by level in memory
        const sorted = list
          .sort((a, b) => b.level - a.level)
          .slice(0, 10)
          .map((u, idx) => ({ ...u, rank: idx + 1 }));

        setLeaderboard(sorted);
        setLoadingLeaderboard(false);
      },
      (err) => {
        console.warn("[Leaderboard] Snapshot error, falling back to local:", err);
        if (isCancelled) return;
        setLeaderboard([
          {
            rank: 1,
            username: currentUserInfo.username,
            displayName: currentUserInfo.displayName,
            level: currentLevel,
            avatar: currentUserInfo.displayName?.[0]?.toUpperCase() || "B",
          },
        ]);
        setLoadingLeaderboard(false);
      }
    );

    return () => {
      isCancelled = true;
      unsub();
    };
  }, [activeSubject, currentLevel, currentUserInfo]);

  // Open Challenge Modal for a level
  const handleOpenLevelModal = useCallback((lvl: number) => {
    if (lvl > currentLevel) {
      showErrorToast(`Màn ${lvl} đang bị khóa. Hãy hoàn thành các màn trước!`);
      return;
    }
    if (hearts <= 0) {
      showErrorToast("Bạn đã hết tim! Vui lòng chờ hồi 1 tim mỗi 5 phút.");
      return;
    }
    setActiveModalLevel(lvl);
    setQuizIndex(0);
    setSelectedOption(null);
    setIsAnswerChecked(false);
    setIsLevelCompleted(false);
  }, [currentLevel, hearts, showErrorToast]);

  const getSubjectName = useCallback((sub: SubjectThemeType) => {
    switch (sub) {
      case "math":
        return "Toán Học";
      case "physics":
        return "Vật Lý";
      case "chemistry":
        return "Hóa Học";
    }
  }, []);

  // Check Quiz Answer
  const handleCheckAnswer = () => {
    if (selectedOption === null || !activeModalLevel) return;

    const questions = getSubjectJourneyQuestions(activeSubject, activeModalLevel);
    const currentQ = questions[quizIndex] || questions[0];

    setIsAnswerChecked(true);

    if (selectedOption === currentQ.correctIndex) {
      if (quizIndex + 1 < questions.length) {
        setTimeout(() => {
          setQuizIndex((prev) => prev + 1);
          setSelectedOption(null);
          setIsAnswerChecked(false);
        }, 1000);
      } else {
        // Hoàn thành Màn
        setIsLevelCompleted(true);
        const completedLvl = activeModalLevel;
        setMilestoneRecapLevel(completedLvl);
        if (completedLvl === currentLevel && currentLevel < TOTAL_LEVELS) {
          setLevelsProgress((prev) => ({
            ...prev,
            [activeSubject]: prev[activeSubject] + 1,
          }));
        }
        confetti({
          particleCount: 160,
          spread: 85,
          origin: { y: 0.6 },
        });
        showSuccessToast(`🎉 Tuyệt vời! Bạn đã chinh phục thành công Màn ${completedLvl} môn ${getSubjectName(activeSubject)}!`);

        setTimeout(() => {
          setActiveModalLevel(null);
          setIsMilestoneRecapOpen(true);
        }, 900);

        // Record into learning activities & topic mastery
        saveLearningActivity({
          id: `act_${studentUid}_journey_${activeSubject}_lvl_${activeModalLevel}_${Date.now()}`,
          studentUid,
          studentUsername,
          origin: "journey_challenge",
          title: `Chinh phục Màn ${activeModalLevel} môn ${getSubjectName(activeSubject)}`,
          subject: getSubjectName(activeSubject),
          status: "completed",
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          activeDurationSeconds: 120,
          totalDurationSeconds: 120,
          score: 10,
          maxScore: 10,
          scorePercentage: 100,
          totalQuestions: questions.length,
          answeredQuestions: questions.length,
          correctQuestions: questions.length,
          accuracy: 100,
          lifecycleEvents: [{ event: "complete", timestamp: new Date().toISOString() }],
          isCountedInStreak: true,
          isCountedInMastery: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }).catch(() => {});

        recordTopicEvidence(
          studentUid,
          studentUsername,
          getSubjectName(activeSubject),
          `chuong_1_man_${activeModalLevel}`,
          `Chương 1 - Màn ${activeModalLevel}`,
          questions.length,
          questions.length,
          `journey_${activeSubject}`
        ).catch(() => {});

        // Record into Discovery Journal
        recordMilestoneEntry({
          studentUid,
          milestoneType:
            activeModalLevel >= 50
              ? "campaign_completed"
              : activeModalLevel % 10 === 0
              ? "checkpoint_passed"
              : "first_step",
          title: `Chinh phục Màn ${activeModalLevel} (${getSubjectName(activeSubject)})`,
          summary: `Vượt qua thử thách Màn ${activeModalLevel} với kết quả xuất sắc 100%.`,
          topicOrSubject: getSubjectName(activeSubject),
          sourceActivityId: `act_${studentUid}_lvl_${activeModalLevel}`,
        });

        // Contribute to student's active expeditions
        const myExpeditions = getStudentExpeditions(studentUid);
        for (const exp of myExpeditions) {
          if (exp.status === "active") {
            contributeToExpedition({
              expeditionId: exp.id,
              studentUid,
              activityId: `act_${studentUid}_journey_${activeSubject}_lvl_${activeModalLevel}_${Date.now()}`,
            });
          }
        }
      }
    } else {
      // Trả lời sai -> Trừ 1 tim
      setHearts((prev) => {
        const next = Math.max(0, prev - 1);
        localStorage.setItem("dktest_journey_hearts", String(next));
        if (next < MAX_HEARTS) {
          const storedLost = localStorage.getItem("dktest_journey_last_heart_lost_at");
          if (!storedLost) {
            const now = Date.now();
            localStorage.setItem("dktest_journey_last_heart_lost_at", String(now));
            setLastHeartLostAt(now);
          }
        }
        return next;
      });
      showErrorToast("Chưa chính xác! Bạn bị trừ 1 tim ❤️.");
    }
  };

  // Filtered topics for topic mastery card section
  const filteredMasteries = useMemo(() => {
    if (selectedMasterySubject === "all") return topicMasteries;
    return topicMasteries.filter((m) => m.subject.toLowerCase() === selectedMasterySubject.toLowerCase());
  }, [topicMasteries, selectedMasterySubject]);

  const daysUntilThpt = useMemo(() => {
    const target = new Date("2027-06-11T00:00:00").getTime();
    return Math.max(0, Math.ceil((target - Date.now()) / (1000 * 60 * 60 * 24)));
  }, []);

  const daysUntilDgnl = useMemo(() => {
    const target = new Date("2027-04-05T00:00:00").getTime();
    return Math.max(0, Math.ceil((target - Date.now()) / (1000 * 60 * 60 * 24)));
  }, []);

  return (
    <div className="min-h-screen bg-[#fcfbfa] dark:bg-slate-950 py-6 px-3 sm:px-4 font-sans text-slate-800 dark:text-slate-100 transition-colors">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Header */}
        <RevealOnScroll direction="down" disabled={reducedMotion}>
          <div className="flex items-center justify-between flex-wrap gap-4 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 rounded-3xl shadow-xs">
            <div className="flex items-center gap-3">
              <Link
                to="/"
                className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 transition-colors"
                title="Về trang chủ"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    Hành Trình Học Tập 3D
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border uppercase bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300">
                    DkTEST 3D World
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Chinh phục thế giới học tập 3D, vượt qua các mốc kiến thức và giải cứu tri thức
                </p>
              </div>
            </div>

            {/* Mode Switcher Buttons */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => handleSwitchMode("gamified")}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                  journeyMode === "gamified"
                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Thế Giới 3D</span>
              </button>
              <button
                onClick={() => handleSwitchMode("roadmap")}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                  journeyMode === "roadmap"
                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                <Target className="w-3.5 h-3.5" />
                <span>Lộ Trình & Mục Tiêu</span>
              </button>
            </div>
          </div>
        </RevealOnScroll>

        {/* ======================================================== */}
        {/* MODE 1: GAMIFIED 3D FLOATING ISLAND WORLD               */}
        {/* ======================================================== */}
        {journeyMode === "gamified" && (
          <div className="space-y-6">
            {/* Top Toolbar: Subject Switchers, Heart Counter & Exploration Tools */}
            <RevealOnScroll direction="up" delayMs={50} disabled={reducedMotion}>
              <div className="flex flex-col gap-3 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-3.5 sm:p-4 rounded-3xl shadow-xs">
                {/* Row 1: 3 Subject Tabs + Heart Counter */}
                <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
                  {/* Subject tabs */}
                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => handleSwitchSubject("math")}
                      className={`min-h-[40px] py-2 px-3 sm:px-3.5 rounded-xl flex items-center gap-2 font-bold text-xs transition-all shrink-0 cursor-pointer ${
                        activeSubject === "math"
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                      }`}
                    >
                      <Calculator className="w-4 h-4" />
                      <span>Toán Học</span>
                      <span className="text-[10px] font-mono px-1 rounded-md bg-white/20">
                        {levelsProgress.math}/50
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSwitchSubject("physics")}
                      className={`min-h-[40px] py-2 px-3 sm:px-3.5 rounded-xl flex items-center gap-2 font-bold text-xs transition-all shrink-0 cursor-pointer ${
                        activeSubject === "physics"
                          ? "bg-sky-600 text-white shadow-sm"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                      }`}
                    >
                      <Atom className="w-4 h-4" />
                      <span>Vật Lý</span>
                      <span className="text-[10px] font-mono px-1 rounded-md bg-white/20">
                        {levelsProgress.physics}/50
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSwitchSubject("chemistry")}
                      className={`min-h-[40px] py-2 px-3 sm:px-3.5 rounded-xl flex items-center gap-2 font-bold text-xs transition-all shrink-0 cursor-pointer ${
                        activeSubject === "chemistry"
                          ? "bg-amber-600 text-white shadow-sm"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                      }`}
                    >
                      <FlaskConical className="w-4 h-4" />
                      <span>Hóa Học</span>
                      <span className="text-[10px] font-mono px-1 rounded-md bg-white/20">
                        {levelsProgress.chemistry}/50
                      </span>
                    </button>
                  </div>

                  {/* Heart Counter */}
                  <div className="flex items-center gap-2 bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 px-3 py-1.5 rounded-2xl shrink-0">
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: MAX_HEARTS }).map((_, idx) => (
                        <Heart
                          key={idx}
                          className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-all ${
                            idx < hearts
                              ? "fill-rose-500 text-rose-500 drop-shadow-xs"
                              : "fill-slate-200 text-slate-300 dark:fill-slate-800 dark:text-slate-700"
                          }`}
                        />
                      ))}
                    </div>

                    <div className="w-px h-4 bg-rose-200 dark:bg-rose-800/80 mx-0.5" />

                    <div className="text-right">
                      <span className="text-[11px] font-black text-rose-600 dark:text-rose-400 font-mono block leading-none">
                        {hearts}/{MAX_HEARTS}
                      </span>
                      {hearts < MAX_HEARTS && secondsUntilNextHeart > 0 ? (
                        <span className="text-[9px] text-rose-500 font-mono flex items-center gap-0.5" title="Hồi 1 tim mỗi 5 phút">
                          <Clock className="w-2 h-2 animate-spin-slow" />
                          {Math.floor(secondsUntilNextHeart / 60)}:
                          {String(secondsUntilNextHeart % 60).padStart(2, "0")}
                        </span>
                      ) : (
                        <span className="text-[8px] text-emerald-600 dark:text-emerald-400 font-bold block">
                          Đầy tim
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Row 2: Secondary Exploration actions as an accessible horizontally scrollable action row */}
                <div className="overflow-x-auto no-scrollbar py-1 flex items-center gap-1.5 -mx-1 px-1 border-t border-slate-100 dark:border-slate-800 pt-2.5">
                  {/* Campaigns button */}
                  <button
                    type="button"
                    onClick={() => setIsCampaignsOpen(true)}
                    className="min-h-[38px] px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>Chiến Dịch</span>
                  </button>

                  {/* Constellation button */}
                  <button
                    type="button"
                    onClick={() => setIsConstellationOpen(true)}
                    className="min-h-[38px] px-3 py-1.5 text-xs font-bold text-cyan-200 bg-cyan-950/60 border border-cyan-800/80 hover:bg-cyan-900 rounded-xl transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Chòm Sao</span>
                  </button>

                  {/* Modes button */}
                  <button
                    type="button"
                    onClick={() => setIsModesOpen(true)}
                    className="min-h-[38px] px-3 py-1.5 text-xs font-bold text-amber-200 bg-amber-950/60 border border-amber-800/80 hover:bg-amber-900 rounded-xl transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>Chế Độ Luyện</span>
                  </button>

                  {/* Expeditions button */}
                  <button
                    type="button"
                    onClick={() => setIsExpeditionsOpen(true)}
                    className="min-h-[38px] px-3 py-1.5 text-xs font-bold text-teal-200 bg-teal-950/60 border border-teal-800/80 hover:bg-teal-900 rounded-xl transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <Users className="w-3.5 h-3.5 text-teal-400" />
                    <span>Đoàn Thám Hiểm</span>
                  </button>

                  {/* Focus Session button */}
                  <button
                    type="button"
                    onClick={() => handleOpenFocusModal(currentLevel)}
                    className="min-h-[38px] px-3 py-1.5 text-xs font-bold text-purple-200 bg-purple-950/60 border border-purple-800/80 hover:bg-purple-900 rounded-xl transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <Target className="w-3.5 h-3.5 text-purple-400" />
                    <span>Tập Trung</span>
                  </button>

                  {/* Journal button */}
                  <button
                    type="button"
                    onClick={() => setIsJournalOpen(true)}
                    className="min-h-[38px] px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <BookMarked className="w-3.5 h-3.5 text-amber-500" />
                    <span>Nhật Ký</span>
                  </button>

                  {/* Atlas button */}
                  <button
                    type="button"
                    onClick={() => setIsAtlasOpen(true)}
                    className="min-h-[38px] px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Địa Dư</span>
                  </button>

                  {/* Collectibles button */}
                  <button
                    type="button"
                    onClick={() => setIsCollectiblesOpen(true)}
                    className="min-h-[38px] px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Kỷ Vật</span>
                  </button>

                  {/* Events button */}
                  <button
                    type="button"
                    onClick={() => setIsEventsOpen(true)}
                    className="min-h-[38px] px-3 py-1.5 text-xs font-bold text-purple-200 bg-purple-950/60 border border-purple-800/80 hover:bg-purple-900 rounded-xl transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <Calendar className="w-3.5 h-3.5 text-purple-400" />
                    <span>Sự Kiện</span>
                  </button>

                  {/* Settings button */}
                  <button
                    type="button"
                    onClick={() => setIsSettingsOpen(true)}
                    className="min-h-[38px] min-w-[38px] p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition-colors shrink-0 flex items-center justify-center cursor-pointer"
                    title="Cài đặt trực quan & trợ năng"
                    aria-label="Cài đặt trực quan & trợ năng"
                  >
                    <Sliders className="w-4 h-4" />
                  </button>

                  {/* Legend button */}
                  <button
                    type="button"
                    onClick={() => setIsLegendOpen(true)}
                    className="min-h-[38px] min-w-[38px] p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition-colors shrink-0 flex items-center justify-center cursor-pointer"
                    title="Chú giải bản đồ"
                    aria-label="Chú giải bản đồ"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </RevealOnScroll>

            {/* Mobile Continue Bar */}
            <MobileContinueBar
              subject={activeSubject}
              subjectName={getSubjectName(activeSubject)}
              currentLevel={currentLevel}
              totalLevels={TOTAL_LEVELS}
              hearts={hearts}
              onContinue={(lvl) => handleOpenLevelModal(lvl)}
              taskTitle={todayTasks[0]?.title}
            />

            {/* Main 3D World Viewport & Side Mission/Leaderboard Grid */}
            <RevealOnScroll direction="up" delayMs={100} disabled={reducedMotion}>
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
              {/* 3D Landscape Viewport or Accessible 2D Browser (3 cols) */}
              <div className="lg:col-span-3 space-y-3">
                <MobileMapOverviewHUD
                  currentLevel={currentLevel}
                  totalLevels={TOTAL_LEVELS}
                  currentTopicName={journeyNodes.find((n) => n.level === currentLevel)?.topicName}
                  onJumpCurrent={() => {
                    const node = journeyNodes.find((n) => n.level === currentLevel);
                    if (node) setSelectedNode(node);
                  }}
                  onJumpCheckpoint={() => {
                    const cp =
                      journeyNodes.find((n) => n.isCheckpoint && n.level >= currentLevel) ||
                      journeyNodes.find((n) => n.isCheckpoint) ||
                      journeyNodes[0];
                    if (cp) setSelectedNode(cp);
                  }}
                  onStartFocus={() => handleOpenFocusModal(currentLevel)}
                />
                {accessibleMode ? (
                  <AccessibleJourneyView
                    nodes={journeyNodes}
                    activeSubject={activeSubject}
                    currentLevel={currentLevel}
                    onSelectNode={handleSelectNode}
                    onStartChallenge={(lvl) => handleOpenLevelModal(lvl)}
                  />
                ) : (
                  <World3DViewport
                    nodes={journeyNodes}
                    activeSubject={activeSubject}
                    currentLevel={currentLevel}
                    selectedNodeId={selectedNode?.id || null}
                    onSelectNode={handleSelectNode}
                    quality={quality}
                    onQualityChange={handleQualityChange}
                    reducedMotion={reducedMotion}
                    ambientParticles={ambientParticles}
                  />
                )}
              </div>

              {/* Side Panels: Daily Missions & Real Leaderboard (1 col) */}
              <div className="space-y-5">
                {/* 1. Daily Missions */}
                <DailyMissionsWidget
                  missions={dailyMissions}
                  onStartMission={(lvl) => lvl && handleOpenLevelModal(lvl)}
                />

                {/* 2. Real Leaderboard */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-amber-500" />
                      <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                        Bảng Xếp Hạng Thật
                      </h3>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                      Top 10
                    </span>
                  </div>

                  {loadingLeaderboard ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      <div className="inline-block animate-spin w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full mb-2" />
                      <p>Đang tải dữ liệu thật từ Firestore...</p>
                    </div>
                  ) : leaderboard.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-6">
                      Chưa có học sinh nào tham gia môn này. Hãy là người đầu tiên!
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {leaderboard.map((u) => (
                        <div
                          key={u.username}
                          className={`flex items-center justify-between p-2 rounded-2xl border transition-all ${
                            u.username === currentUserInfo.username
                              ? "bg-indigo-50/70 border-indigo-200 dark:bg-indigo-950/40 dark:border-indigo-900 font-bold"
                              : "bg-slate-50 dark:bg-slate-800/60 border-slate-200/70 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                                u.rank === 1
                                  ? "bg-amber-400 text-amber-950 shadow-xs"
                                  : u.rank === 2
                                  ? "bg-slate-300 text-slate-900"
                                  : u.rank === 3
                                  ? "bg-amber-600 text-white"
                                  : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
                              }`}
                            >
                              {u.rank}
                            </span>
                            <div className="truncate">
                              <span className="text-xs font-bold text-slate-900 dark:text-white truncate block">
                                {u.displayName}
                              </span>
                              <span className="text-[10px] text-slate-400">@{u.username}</span>
                            </div>
                          </div>

                          <span className="text-xs font-black font-mono text-indigo-600 dark:text-indigo-400 shrink-0">
                            Màn {u.level}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </RevealOnScroll>
        </div>
      )}

        {/* ======================================================== */}
        {/* MODE 2: ROADMAP & LEARNING INTELLIGENCE DASHBOARD       */}
        {/* ======================================================== */}
        {journeyMode === "roadmap" && (
          <div className="space-y-6">
            {/* Countdown Exam Target Card */}
            <RevealOnScroll direction="up" delayMs={50} disabled={reducedMotion}>
              <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
                <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 pointer-events-none flex items-center justify-center">
                  <Target className="w-96 h-96 -mr-20" />
                </div>

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-white border border-white/20 uppercase tracking-wider">
                        Mục tiêu Trọng tâm
                      </span>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => setCountdownTarget("thpt")}
                          className={`text-xs px-2.5 py-0.5 rounded-lg font-semibold transition-all ${
                            countdownTarget === "thpt"
                              ? "bg-indigo-500 text-white"
                              : "bg-white/10 text-white/70 hover:bg-white/20"
                          }`}
                        >
                          THPT Quốc Gia
                        </button>
                        <button
                          onClick={() => setCountdownTarget("dgnl")}
                          className={`text-xs px-2.5 py-0.5 rounded-lg font-semibold transition-all ${
                            countdownTarget === "dgnl"
                              ? "bg-indigo-500 text-white"
                              : "bg-white/10 text-white/70 hover:bg-white/20"
                          }`}
                        >
                          ĐGNL VACT
                        </button>
                      </div>
                    </div>

                    <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                      {countdownTarget === "thpt" ? "Kỳ thi Tốt nghiệp THPT Quốc Gia" : "Kỳ thi Đánh Giá Năng Lực VACT"}
                    </h2>
                    <p className="text-xs sm:text-sm text-indigo-200 mt-1">
                      {countdownTarget === "thpt"
                        ? "Thời gian dự kiến: 11/06/2027 • Lên kế hoạch ôn tập khoa học ngay từ hôm nay"
                        : "Thời gian dự kiến: 05/04/2027 • Chú trọng tư duy logic, xử lý số liệu & đọc hiểu"}
                    </p>
                  </div>

                  {/* Big Countdown Number */}
                  <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/20 shrink-0">
                    <div className="text-center">
                      <span className="text-3xl sm:text-4xl font-black font-mono block leading-none text-amber-300">
                        {countdownTarget === "thpt" ? daysUntilThpt : daysUntilDgnl}
                      </span>
                      <span className="text-[10px] font-bold tracking-wider text-indigo-200 uppercase mt-1 block">
                        Ngày Còn Lại
                      </span>
                    </div>
                    <div className="w-px h-10 bg-white/20" />
                    <button
                      onClick={() => setIsWizardOpen(true)}
                      className="px-4 py-2.5 text-xs font-bold bg-white text-indigo-900 rounded-xl hover:bg-indigo-50 shadow-md transition-all flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Lên lộ trình</span>
                    </button>
                  </div>
                </div>
              </div>
            </RevealOnScroll>

            {/* Quick Stats Strip */}
            <RevealOnScroll direction="up" delayMs={100} disabled={reducedMotion}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs">
                  <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                    <Flame className="w-4 h-4 text-orange-500" />
                    <span>Chuỗi ngày học</span>
                  </div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                    {stats.currentStreakDays} <span className="text-xs font-normal text-slate-400">ngày liên tiếp</span>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs">
                  <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                    <Clock className="w-4 h-4 text-blue-500" />
                    <span>Thời gian học thực</span>
                  </div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                    {stats.totalActiveStudyMinutes} <span className="text-xs font-normal text-slate-400">phút</span>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs">
                  <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    <span>Độ chính xác TB</span>
                  </div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                    {stats.averageAccuracy}%
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs">
                  <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                    <CheckCircle2 className="w-4 h-4 text-indigo-500" />
                    <span>Bài tập hoàn thành</span>
                  </div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                    {stats.totalActivitiesCompleted}
                  </div>
                </div>
              </div>
            </RevealOnScroll>

            {/* Today's Tasks Section */}
            <RevealOnScroll direction="up" delayMs={150} disabled={reducedMotion}>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Target className="w-5 h-5 text-indigo-600" />
                      Nhiệm vụ hôm nay
                    </h3>
                    <p className="text-xs text-slate-500">
                      Thực hiện đều đặn mỗi ngày để duy trì phong độ và hoàn thành mục tiêu
                    </p>
                  </div>
                  <button
                    onClick={() => setIsWizardOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl hover:bg-indigo-100"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tạo lộ trình mới</span>
                  </button>
                </div>

                <TodayTasksWidget
                  tasks={todayTasks}
                  onCompleteTask={handleCompleteTask}
                  onRescheduleTask={handleRescheduleTask}
                />
              </div>
            </RevealOnScroll>

            {/* Smart Recommendations Section */}
            {recommendations.length > 0 && (
              <RevealOnScroll direction="up" delayMs={200} disabled={reducedMotion}>
                <div className="space-y-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-amber-500" />
                      Gợi ý Học tập Thông minh
                    </h3>
                    <p className="text-xs text-slate-500">
                      Đề xuất dựa trên dữ liệu làm bài và mức độ nắm vững kiến thức thực tế
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {recommendations.map((rec) => (
                      <div
                        key={rec.id}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                rec.priority === "high"
                                  ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                                  : "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300"
                              }`}
                            >
                              {rec.priority === "high" ? "Ưu tiên cao" : "Nên ôn tập"}
                            </span>
                            <span className="text-[11px] text-slate-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              ~{rec.estimatedMinutes} phút
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                            {rec.title}
                          </h4>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mb-2 leading-relaxed">
                            {rec.description}
                          </p>
                          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
                            <strong className="text-slate-700 dark:text-slate-300 block mb-0.5">
                              Lý do đề xuất:
                            </strong>
                            {rec.reasonExplanation}
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                          <Link
                            to={
                              rec.actionParams && !rec.actionRoute.includes("?")
                                ? `${rec.actionRoute}?${new URLSearchParams(
                                    Object.entries(rec.actionParams).reduce(
                                      (acc, [k, v]) => ({ ...acc, [k]: String(v) }),
                                      {}
                                    )
                                  ).toString()}`
                                : rec.actionRoute
                            }
                            className="inline-flex items-center gap-1 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-xs"
                          >
                            <span>{rec.actionLabel}</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </RevealOnScroll>
            )}

            {/* Topic Mastery Map Section */}
            <RevealOnScroll direction="up" delayMs={250} disabled={reducedMotion}>
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-emerald-600" />
                      Bản đồ Mức độ Vững vàng Kiến thức
                    </h3>
                    <p className="text-xs text-slate-500">
                      Đánh giá theo bằng chứng thực tế từ các bài luyện tập và kỳ thi
                    </p>
                  </div>

                  {/* Filter subject pills */}
                  <div className="flex gap-1.5 overflow-x-auto text-xs">
                    {["all", "Toán", "Vật Lý", "Hóa Học"].map((sub) => (
                      <button
                        key={sub}
                        onClick={() => setSelectedMasterySubject(sub)}
                        className={`px-3 py-1 rounded-xl font-medium transition-all ${
                          selectedMasterySubject === sub
                            ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                            : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50"
                        }`}
                      >
                        {sub === "all" ? "Tất cả môn" : sub}
                      </button>
                    ))}
                  </div>
                </div>

                {filteredMasteries.length === 0 ? (
                  <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
                    <BookOpen className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Chưa có đủ bằng chứng kiến thức
                    </p>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      Hãy làm ít nhất 5 câu hỏi ở từng chuyên đề để hệ thống phân tích mức độ vững vàng của bạn!
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {filteredMasteries.map((m) => (
                      <TopicMasteryCard key={m.id} mastery={m} />
                    ))}
                  </div>
                )}
              </div>
            </RevealOnScroll>

            {/* Longitudinal Learning Timeline */}
            <RevealOnScroll direction="up" delayMs={300} disabled={reducedMotion}>
              <div className="space-y-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    Dòng thời gian Hoạt động Học tập
                  </h3>
                  <p className="text-xs text-slate-500">
                    Lịch sử thi cử, luyện tập và ôn lại câu sai với thời gian học thực tế
                  </p>
                </div>

                <JourneyTimeline activities={activities} loading={loadingRoadmap} />
              </div>
            </RevealOnScroll>
          </div>
        )}

        {/* 3. Node Detail Panel (Sidebar on desktop, bottom sheet on mobile) */}
        <NodeDetailPanel
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
          onStartLevel={(lvl) => {
            setSelectedNode(null);
            handleOpenLevelModal(lvl);
          }}
          onStartFocus={(lvl) => {
            setSelectedNode(null);
            handleOpenFocusModal(lvl);
          }}
          hearts={hearts}
        />

        {/* 4. Knowledge Atlas Modal */}
        <KnowledgeAtlasModal
          isOpen={isAtlasOpen}
          onClose={() => setIsAtlasOpen(false)}
          nodes={journeyNodes}
          onSelectNode={(node) => {
            setSelectedNode(node);
          }}
          currentLevel={currentLevel}
          activeSubject={activeSubject}
        />

        {/* 5. Collectibles Modal */}
        <CollectiblesModal
          isOpen={isCollectiblesOpen}
          onClose={() => setIsCollectiblesOpen(false)}
          collectibles={collectibles}
        />

        {/* 6. Map Legend Modal */}
        <MapLegendModal isOpen={isLegendOpen} onClose={() => setIsLegendOpen(false)} />

        {/* 7. Progress Replay Modal */}
        <ProgressReplayModal
          isOpen={isReplayOpen}
          onClose={() => setIsReplayOpen(false)}
          currentLevel={currentLevel}
          activeSubject={activeSubject}
        />

        {/* 8. Challenge Quiz Modal for Levels */}
        {activeModalLevel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg p-6 space-y-5 shadow-2xl relative">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                    <Award className="w-5 h-5 text-indigo-600" />
                    Thử Thách Màn {activeModalLevel} ({getSubjectName(activeSubject)})
                  </h3>
                  <span className="text-xs text-slate-400">
                    Câu hỏi {quizIndex + 1}/
                    {getSubjectJourneyQuestions(activeSubject, activeModalLevel).length}
                  </span>
                </div>
                <button
                  onClick={() => setActiveModalLevel(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {(() => {
                const questions = getSubjectJourneyQuestions(activeSubject, activeModalLevel);
                const currentQ = questions[quizIndex] || questions[0];

                if (isLevelCompleted) {
                  return (
                    <div className="text-center py-6 space-y-4">
                      <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-inner">
                        <Check className="w-8 h-8 stroke-[3]" />
                      </div>
                      <h4 className="text-lg font-black text-slate-900 dark:text-white">
                        Chúc Mừng Bạn Đã Vượt Màn!
                      </h4>
                      <p className="text-xs text-slate-500 max-w-xs mx-auto">
                        Bạn đã trả lời xuất sắc toàn bộ câu hỏi của Màn {activeModalLevel}. Hãy tiếp tục tiến tới đỉnh vinh quang!
                      </p>
                      <button
                        onClick={() => setActiveModalLevel(null)}
                        className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                      >
                        Đóng & Tiếp tục hành trình
                      </button>
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    <div className="text-sm font-extrabold text-slate-900 dark:text-white leading-relaxed">
                      <LatexPreview content={currentQ.question} />
                    </div>

                    {/* Options */}
                    <div className="space-y-2">
                      {currentQ.options.map((opt, oIdx) => {
                        const isSelected = selectedOption === oIdx;
                        const isCorrect = currentQ.correctIndex === oIdx;
                        let btnStyle =
                          "bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100";

                        if (isAnswerChecked) {
                          if (isCorrect) {
                            btnStyle = "bg-emerald-500 text-white border-emerald-600 font-bold";
                          } else if (isSelected && !isCorrect) {
                            btnStyle = "bg-rose-500 text-white border-rose-600 font-bold";
                          }
                        } else if (isSelected) {
                          btnStyle =
                            "bg-indigo-50 border-indigo-400 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-bold";
                        }

                        return (
                          <button
                            key={oIdx}
                            type="button"
                            disabled={isAnswerChecked}
                            onClick={() => setSelectedOption(oIdx)}
                            className={`w-full p-3 rounded-2xl border text-left text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${btnStyle}`}
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="w-5 h-5 rounded-lg bg-black/10 dark:bg-white/10 flex items-center justify-center text-[10px] font-bold">
                                {String.fromCharCode(65 + oIdx)}
                              </span>
                              <LatexPreview content={opt} />
                            </div>
                            {isAnswerChecked && isCorrect && <Check className="w-4 h-4 shrink-0" />}
                            {isAnswerChecked && isSelected && !isCorrect && <X className="w-4 h-4 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>

                    {/* Explanation if checked */}
                    {isAnswerChecked && (
                      <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-2xl text-xs space-y-1">
                        <span className="font-extrabold text-blue-700 dark:text-blue-300">
                          Giải thích chi tiết:
                        </span>
                        <div className="text-slate-700 dark:text-slate-300">
                          <LatexPreview content={currentQ.explanation} />
                        </div>
                      </div>
                    )}

                    {/* Submit Button */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={handleCheckAnswer}
                        disabled={selectedOption === null || isAnswerChecked}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-extrabold text-xs rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Zap className="w-4 h-4" />
                        <span>Kiểm tra đáp án</span>
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* 9. Multi-step Revision Program Wizard Modal */}
        <RevisionProgramWizardModal
          isOpen={isWizardOpen}
          onClose={() => setIsWizardOpen(false)}
          studentUid={studentUid}
          studentUsername={studentUsername}
          onSubmit={handleCreateProgram}
        />

        {/* 10. Story Campaigns Modal */}
        <StoryCampaignsModal
          isOpen={isCampaignsOpen}
          onClose={() => setIsCampaignsOpen(false)}
          activeSubject={activeSubject}
          studentUid={studentUid}
          onLaunchNode={(node) => handleOpenLevelModal(currentLevel)}
        />

        {/* 11. Knowledge Constellation Modal */}
        <KnowledgeConstellationModal
          isOpen={isConstellationOpen}
          onClose={() => setIsConstellationOpen(false)}
          activeSubject={activeSubject}
        />

        {/* 12. Focused Journey Modes Modal */}
        <JourneyModesModal
          isOpen={isModesOpen}
          onClose={() => setIsModesOpen(false)}
          activeSubject={activeSubject}
          studentUid={studentUid}
          currentLevel={currentLevel}
          onStartSession={(mode) => handleOpenLevelModal(currentLevel)}
        />

        {/* 13. Cooperative Expeditions Modal */}
        <CooperativeExpeditionsModal
          isOpen={isExpeditionsOpen}
          onClose={() => setIsExpeditionsOpen(false)}
          activeSubject={activeSubject}
          studentUid={studentUid}
          studentName={studentUsername}
        />

        {/* 14. Personal Discovery Journal Modal */}
        <DiscoveryJournalModal
          isOpen={isJournalOpen}
          onClose={() => setIsJournalOpen(false)}
          studentUid={studentUid}
        />

        {/* 15. Discovery Events Modal */}
        <DiscoveryEventsModal
          isOpen={isEventsOpen}
          onClose={() => setIsEventsOpen(false)}
          activeSubject={activeSubject}
          onOpenCampaign={() => setIsCampaignsOpen(true)}
        />

        {/* 16. Journey Settings & Immersion Controls Modal */}
        <JourneySettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          qualityProfile={quality}
          onChangeQuality={handleQualityChange}
          reducedMotion={reducedMotion}
          onToggleReducedMotion={handleToggleReducedMotion}
          ambientParticles={ambientParticles}
          onToggleParticles={handleToggleParticles}
          accessibleMode={accessibleMode}
          onToggleAccessibleMode={handleToggleAccessibleMode}
        />

        {/* 17. Floating Study Companion Widget */}
        <StudyCompanionWidget
          studentUid={studentUid}
          activeSubject={activeSubject}
          currentLevel={currentLevel}
          stats={stats}
          dueTasks={todayTasks}
          weakTopics={topicMasteries.filter((m) => m.accuracy < 60)}
          onActionClick={(dest, nodeId) => {
            if (dest) {
              if (dest.includes("tab=revision")) {
                handleSwitchMode("roadmap");
              }
            } else {
              handleOpenLevelModal(currentLevel);
            }
          }}
        />

        {/* 18. Focus Session Modal */}
        <FocusSessionModal
          isOpen={isFocusModalOpen}
          onClose={() => setIsFocusModalOpen(false)}
          subjectName={getSubjectName(activeSubject)}
          level={focusTargetLevel}
          nodeTitle={journeyNodes.find((n) => n.level === focusTargetLevel)?.topicName}
          onStartQuiz={() => handleOpenLevelModal(focusTargetLevel)}
        />

        {/* 19. Milestone Recap Modal */}
        <MilestoneRecapModal
          isOpen={isMilestoneRecapOpen}
          onClose={() => setIsMilestoneRecapOpen(false)}
          level={milestoneRecapLevel}
          subjectName={getSubjectName(activeSubject)}
          totalLevels={TOTAL_LEVELS}
          topicName={journeyNodes.find((n) => n.level === milestoneRecapLevel)?.topicName}
          onContinueNext={(nextLvl) => handleOpenLevelModal(nextLvl)}
        />
      </div>
    </div>
  );
}
