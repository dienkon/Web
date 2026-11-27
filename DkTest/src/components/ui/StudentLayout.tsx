import React, { useState, useEffect, useMemo } from "react";
import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { getGamificationStats, recordDailyStreak, subscribeToStreakUpdates } from "../../services/gamificationService";
import {
  LogOut,
  ArrowLeft,
  User,
  ShieldCheck,
  History,
  BookOpen,
  Settings,
  Flame,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Clock,
  HeartHandshake,
  BrainCircuit,
  MapPin,
  Wallet,
  Swords,
  MessageSquare,
  PlayCircle,
  Download,
  Smartphone,
  ShoppingBag,
  Trophy,
  Library,
} from "lucide-react";
import { getAppVersionMetadata } from "../../services/appLinks";
import { isCoursePlayerTheaterUrl } from "../../services/courseService";
import ConfirmModal from "./ConfirmModal";
import BrandLogo from "./BrandLogo";
import AnnouncementPopupModal from "./AnnouncementPopupModal";
import AccountSuspendedView from "../auth/AccountSuspendedView";
import { hasActiveExamInProgress, clearActiveExamSession } from "../../services/examSessionService";
import { isAdminAuthenticated, clearStudentSession, clearAdminSession } from "../../services/authService";
import { useAuth } from "../../context/AuthContext";
import { isNativeAndroid } from '../../services/offline/sync';
import { useOnline } from '../../hooks/useOnline';
import OpenInAppBanner from '../student/OpenInAppBanner';
import UserAvatar from "../common/UserAvatar";
import ThemeToggle from "./ThemeToggle";
import { subscribeToAvatarUpdates } from "../../utils/avatarSync";
import {
  StudentOnboardingProvider,
  useStudentOnboarding,
} from "../../features/student-onboarding/StudentOnboardingContext";
import { TOUR_DATA_IDS } from "../../features/student-onboarding/StudentOnboardingTypes";
import { AppInstallModal } from "../student/AppInstallModal";

function StudentLayoutContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const online = useOnline();
  useEffect(() => {
    if (isNativeAndroid() && !online && (['/', '/exams', '/student/online'].includes(location.pathname) || /^\/(?:student\/)?exam\/[^/]+$/.test(location.pathname))) navigate('/student/offline', { replace: true });
  }, [online, location.pathname, navigate]);
  const { userProfile, role, logout, isSuspended } = useAuth();
  const { triggerAction } = useStudentOnboarding();
  const [studentInfo, setStudentInfo] = useState<{ username?: string; displayName?: string; avatarUrl?: string } | null>(null);
  const [liveAvatar, setLiveAvatar] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isBottomMenuOpen, setIsBottomMenuOpen] = useState(false);
  const [showAppInstallModal, setShowAppInstallModal] = useState(false);

  // Synchronize active account: Prioritize Firebase Auth userProfile, fallback to localStorage
  const effectiveAvatar = liveAvatar || userProfile?.photoURL || studentInfo?.avatarUrl || "";

  const currentAccount = userProfile
    ? {
        username: userProfile.username || userProfile.email?.split("@")[0] || "user",
        displayName: userProfile.displayName || userProfile.fullName || "Người dùng",
        avatarUrl: effectiveAvatar,
        role: userProfile.role || role || "student",
      }
    : (studentInfo
        ? {
            ...studentInfo,
            avatarUrl: effectiveAvatar,
            role: "student",
          }
        : null);

  const [streakTick, setStreakTick] = useState(0);

  const appDownloadMeta = useMemo(() => getAppVersionMetadata(), []);
  const renderAppDownloadTile = (onDismiss: () => void) =>
    !isNativeAndroid() ? (
      <button
        type="button"
        onClick={() => {
          onDismiss();
          setShowAppInstallModal(true);
        }}
        className="w-full text-left flex items-center justify-between gap-3 p-3.5 rounded-2xl text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 mb-3 cursor-pointer"
      >
        <div className="flex items-center gap-3 min-w-0">
          <Smartphone className="w-5 h-5 shrink-0 text-blue-600" />
          <div className="min-w-0">
            <div className="font-black truncate">
              Tải Ứng Dụng DkTEST v{appDownloadMeta.version}
            </div>
            <div className="text-[11px] font-normal text-blue-600/80 dark:text-blue-400 truncate">
              Hỗ trợ iOS (iPhone/iPad) &amp; Android APK
            </div>
          </div>
        </div>
        <Download className="w-4 h-4 shrink-0" />
      </button>
    ) : null;

  const gameStats = useMemo(
    () => getGamificationStats(currentAccount?.username || ""),
    [currentAccount?.username, streakTick]
  );

  // Subscribe to real-time streak updates
  useEffect(() => {
    const unsub = subscribeToStreakUpdates(() => {
      setStreakTick((prev) => prev + 1);
    });
    return unsub;
  }, []);

  // Record active streak if student is active today
  useEffect(() => {
    if (currentAccount?.username) {
      recordDailyStreak(currentAccount.username);
    }
  }, [currentAccount?.username]);

  // Real-time listener for avatar changes across the application
  useEffect(() => {
    const unsub = subscribeToAvatarUpdates(({ avatarUrl }) => {
      if (avatarUrl) {
        setLiveAvatar(avatarUrl);
        setStudentInfo((prev: any) => (prev ? { ...prev, avatarUrl } : prev));
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    setIsAdmin(isAdminAuthenticated());

    const infoStr = localStorage.getItem("student_info") || localStorage.getItem("current_student_session");
    if (infoStr) {
      try {
        const parsed = JSON.parse(infoStr);
        setStudentInfo(parsed);

        // Fetch fresh avatar and profile from Firestore to ensure permanent sync
        const username = parsed.username || parsed.name || parsed.displayName;
        if (username && navigator.onLine && !isNativeAndroid()) {
          import("../../services/studentService").then(({ getStudent }) => {
            return getStudent(username).then((studentDoc) => {
              if (studentDoc && studentDoc.avatarUrl) {
                const updated = {
                  ...parsed,
                  avatarUrl: studentDoc.avatarUrl,
                  displayName: studentDoc.name || parsed.displayName || parsed.name,
                };
                setStudentInfo(updated);
                localStorage.setItem("student_info", JSON.stringify(updated));
              }
            });
          }).catch(() => {});
        }
      } catch (e) {
        // ignore
      }
    } else {
      setStudentInfo(null);
    }
  }, [location.pathname]);

  // Close mobile drawer and bottom menu on route change
  useEffect(() => {
    setIsMobileDrawerOpen(false);
    setIsBottomMenuOpen(false);
  }, [location.pathname]);

  // Check for active in-progress exam session and redirect student back immediately
  useEffect(() => {
    if (!location.pathname.includes("/take") && !location.pathname.includes("/result/")) {
      const activeSession = hasActiveExamInProgress();
      if (activeSession) {
        navigate(`/student/exam/${activeSession.examId}/take`, { replace: true });
      }
    }
  }, [location.pathname, navigate]);

  const handleConfirmLogout = async () => {
    clearActiveExamSession();
    clearStudentSession();
    clearAdminSession();
    try {
      await logout();
    } catch (e) {}
    setStudentInfo(null);
    setIsAdmin(false);
    setShowLogoutModal(false);
    navigate("/login", { replace: true });
  };

  const isTakingExam = location.pathname.includes("/take") || location.pathname.includes("/tutorial/exam");
  const isExamResult = location.pathname.includes("/result/") || location.pathname.includes("/tutorial/result");
  const isCourseTheater = isCoursePlayerTheaterUrl(location.pathname, location.search);
  const isParentViewing = isExamResult && localStorage.getItem("auth_role") === "parent";
  const hideStudentNav = isTakingExam || isExamResult || isCourseTheater;

  const navItems = [
    { to: "/", label: "Đề thi", icon: BookOpen, tourId: TOUR_DATA_IDS.NAV_EXAMS, actionKey: "click_exams" },
    ...(isNativeAndroid() ? [{ to: "/student/offline", label: "Kho đề offline", icon: BookOpen }] : []),
    { to: "/student/practice", label: "Luyện tập", icon: BrainCircuit, iconColor: "text-blue-500", tourId: TOUR_DATA_IDS.NAV_PRACTICE, actionKey: "click_practice" },
    { to: "/student/courses", label: "Khóa học", icon: PlayCircle, iconColor: "text-rose-500", actionKey: "click_courses" },
    { to: "/student/documents", label: "Kho Tài Liệu", icon: Library, iconColor: "text-teal-600", actionKey: "click_documents" },
    { to: "/student/history", label: "Lịch sử bài làm", icon: History, tourId: TOUR_DATA_IDS.NAV_HISTORY, actionKey: "click_history" },
    { to: "/journey", label: "Hành trình", icon: MapPin, iconColor: "text-emerald-500", actionKey: "click_journey" },
    { to: "/student/arena", label: "Đấu Trường", icon: Swords, iconColor: "text-amber-500", actionKey: "click_arena" },
    { to: "/student/chat", label: "Kênh Thế Giới", icon: MessageSquare, iconColor: "text-sky-500", actionKey: "click_chat" },
    { to: "/student/ai-tutor", label: "Hỏi Gia sư AI", icon: Sparkles, iconColor: "text-indigo-500", tourId: TOUR_DATA_IDS.NAV_AI, actionKey: "click_ai" },
    { to: "/student/ai-shop", label: "Mua Acc AI", icon: ShoppingBag, iconColor: "text-blue-600", actionKey: "click_ai_shop" },
    { to: "/student/minigame", label: "Minigame Phúc Lợi", icon: Trophy, iconColor: "text-amber-500", actionKey: "click_minigame" },
    { to: "/student/community", label: "Cộng đồng", icon: Flame, iconColor: "text-amber-500", tourId: TOUR_DATA_IDS.NAV_COMMUNITY, actionKey: "click_community" },
    { to: "/student/wallet", label: "Ví DkTEST", icon: Wallet, iconColor: "text-emerald-600", actionKey: "click_wallet" },
    { to: "/student/profile", label: "Hồ sơ & Avatar", icon: User, tourId: TOUR_DATA_IDS.NAV_PROFILE, actionKey: "click_profile" },
    { to: "/legal-policy", label: "Bản quyền & Pháp lý", icon: ShieldCheck },
  ];

  const isDocumentLibraryRoute =
    location.pathname.startsWith("/student/documents") ||
    location.pathname.startsWith("/documents") ||
    location.pathname.startsWith("/tai-lieu");

  const isSecondaryCategoryRoute =
    isDocumentLibraryRoute ||
    location.pathname.startsWith("/student/ai-tutor") ||
    location.pathname.startsWith("/ai-tutor") ||
    location.pathname.startsWith("/student/community") ||
    location.pathname.startsWith("/student/arena") ||
    location.pathname.startsWith("/arena") ||
    location.pathname.startsWith("/student/ai-shop") ||
    location.pathname.startsWith("/ai-shop") ||
    location.pathname.startsWith("/student/minigame") ||
    location.pathname.startsWith("/minigame") ||
    ["/journey", "/student/journey", "/student/chat", "/chat", "/student/wallet", "/wallet", "/student/profile", "/legal-policy", "/student/offline"].some(
      (p) => location.pathname === p
    );

  if (isSuspended) {
    return <AccountSuspendedView />;
  }

  return (
    <div className="min-h-dvh h-dvh w-full max-w-[100vw] overflow-hidden bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-200">
      {!hideStudentNav && (
        <header className="h-14 sm:h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 px-2.5 sm:px-6 shadow-2xs shrink-0 z-30 transition-colors duration-200 overflow-hidden">
          <div className="flex items-center gap-0.5 sm:gap-3 min-w-0 shrink-0">
            {/* Mobile Hamburger Drawer Button */}
            <button
              type="button"
              onClick={() => setIsMobileDrawerOpen(true)}
              className="md:hidden p-1.5 sm:p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer shrink-0"
              title="Mở menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <Link
              to="/"
              className="flex items-center gap-1 sm:gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 p-1 sm:p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
              title="Về trang chủ"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500" />
            </Link>

            <Link
              to="/"
              data-tour-id={TOUR_DATA_IDS.BRAND_LOGO}
              onClick={() => triggerAction("click_logo_home")}
              className="flex items-center group shrink-0"
            >
              <BrandLogo size="sm" badgeText="Thi Trực Tuyến" theme="blue" hideBadgeOnMobile />
            </Link>
          </div>

          <div className="flex items-center gap-1 sm:gap-3 min-w-0 shrink-0">
            {/* Quick Portal Switcher */}
            <div className="hidden sm:flex items-center bg-slate-100 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/60 p-1 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400">
              <Link
                to="/parent/dashboard"
                className="px-2.5 py-1 text-slate-600 dark:text-slate-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-white/60 dark:hover:bg-slate-700/50 rounded-lg transition-all flex items-center gap-1.5"
                title="Cổng Phụ huynh & Soạn đề ChatGPT"
              >
                <HeartHandshake className="w-3.5 h-3.5 text-indigo-600" />
                <span className="hidden md:inline">Phụ huynh</span>
              </Link>
              {isAdmin && (
                <Link
                  to="/admin/exams"
                  className="px-2.5 py-1 text-slate-600 dark:text-slate-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-white/60 dark:hover:bg-slate-700/50 rounded-lg transition-all flex items-center gap-1.5"
                  title="Cổng Quản trị Viên"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                  <span className="hidden md:inline">Quản trị</span>
                </Link>
              )}
            </div>

            {isAdmin && (
              <Link
                to="/admin/exams"
                className="sm:hidden text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 p-2 rounded-xl transition-colors border border-blue-200 flex items-center justify-center"
                title="Trang quản trị"
              >
                <ShieldCheck className="w-4 h-4" />
              </Link>
            )}

            {/* Theme Switcher */}
            <ThemeToggle variant="icon" />

            {currentAccount ? (
              <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                {/* Gamification Streak & XP Badge (Visible on all viewports) */}
                <Link
                  to="/student/profile"
                  className="flex items-center gap-1 sm:gap-1.5 px-1.5 py-1 sm:px-2.5 sm:py-1 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 border border-amber-200/80 dark:border-amber-800/60 rounded-xl transition-colors text-xs font-bold text-amber-800 dark:text-amber-300 shadow-2xs shrink-0"
                  title={`Chuỗi học tập liên tục: ${gameStats.currentStreak} ngày | Cấp độ: ${gameStats.levelTitle} (${gameStats.totalXP} XP)`}
                >
                  <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500 animate-pulse" />
                  <span>{gameStats.currentStreak}</span>
                  <span className="hidden sm:inline text-[10px] text-amber-600 dark:text-amber-400 font-medium ml-0.5">Lv.{gameStats.level}</span>
                </Link>

                <Link
                  to="/student/profile"
                  data-tour-id={TOUR_DATA_IDS.HEADER_AVATAR}
                  onClick={() => triggerAction("click_profile")}
                  className="flex items-center gap-1.5 sm:gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 px-1.5 sm:px-2.5 py-1 rounded-xl transition-colors cursor-pointer border border-slate-200/60 dark:border-slate-700 min-w-0 shrink"
                  title="Chỉnh sửa hồ sơ cá nhân"
                >
                  <UserAvatar
                    src={currentAccount.avatarUrl}
                    name={currentAccount.displayName || currentAccount.username}
                    size="xs"
                    shape="circle"
                  />
                  <span className="hidden min-[420px]:inline text-xs font-bold text-slate-800 dark:text-slate-200 max-w-[72px] sm:max-w-[120px] truncate">
                    {currentAccount.displayName || "Học sinh"}
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={() => setShowLogoutModal(true)}
                  className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors cursor-pointer shrink-0"
                  title="Đăng xuất"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              !isAdmin && (
                <Link
                  to="/login"
                  className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-3.5 py-1.5 rounded-xl transition-all shadow-xs"
                >
                  Đăng nhập
                </Link>
              )
            )}
          </div>
        </header>
      )}

      {/* Main Container with Isolated Layer Collapsible Sidebar on Desktop */}
      <div className="flex-1 flex overflow-hidden relative">
        {!hideStudentNav && (
          <aside
            className={`bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 hidden md:flex flex-col shrink-0 transition-all duration-200 ease-in-out z-20 shadow-xs select-none relative ${
              isSidebarCollapsed ? "w-16 p-2.5" : "w-60 p-4"
            }`}
          >
            {/* Header with Title and Modern Collapse / Expand Toggle Button */}
            <div
              className={`flex items-center mb-2 pb-2 border-b border-slate-100 dark:border-slate-800 ${
                isSidebarCollapsed ? "justify-center" : "justify-between px-1"
              }`}
            >
              {!isSidebarCollapsed && (
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Thí sinh
                </div>
              )}
              <button
                type="button"
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 flex items-center justify-center transition-all cursor-pointer border border-slate-200/60 dark:border-slate-700 shrink-0"
                title={isSidebarCollapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
              >
                {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </button>
            </div>

            <div className="space-y-1.5 flex-1 overflow-y-auto">

              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.to === "/"
                    ? location.pathname === "/" || location.pathname === "/exams" || location.pathname === "/student/online"
                    : item.to === "/student/courses"
                    ? location.pathname.startsWith("/student/courses") || location.pathname.startsWith("/courses")
                    : item.to === "/student/documents"
                    ? isDocumentLibraryRoute
                    : item.to === "/student/practice"
                    ? location.pathname.startsWith("/student/practice") || location.pathname.startsWith("/practice")
                    : item.to === "/student/ai-shop"
                    ? location.pathname.startsWith("/student/ai-shop") || location.pathname.startsWith("/ai-shop")
                    : item.to === "/student/minigame"
                    ? location.pathname.startsWith("/student/minigame") || location.pathname.startsWith("/minigame")
                    : location.pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    data-tour-id={item.tourId}
                    onClick={() => {
                      if (item.actionKey) triggerAction(item.actionKey);
                    }}
                    title={isSidebarCollapsed ? item.label : undefined}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      isActive
                        ? "bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 shadow-2xs border border-blue-100 dark:border-blue-800"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
                    } ${isSidebarCollapsed ? "justify-center px-2" : ""}`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${item.iconColor || ""}`} />
                    {!isSidebarCollapsed && <span>{item.label}</span>}
                  </Link>
                );
              })}
            </div>

            {/* Bottom Profile & Download App card */}
            <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
              {!isNativeAndroid() && (
                <button
                  type="button"
                  onClick={() => setShowAppInstallModal(true)}
                  title={`Tải DkTEST v${appDownloadMeta.version} cho iOS & Android`}
                  className={`w-full text-left flex items-center gap-2.5 p-2 rounded-2xl bg-blue-50/80 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-950/70 border border-blue-200/80 dark:border-blue-800/60 text-blue-700 dark:text-blue-300 transition-colors cursor-pointer ${
                    isSidebarCollapsed ? "justify-center" : ""
                  }`}
                >
                  <Smartphone className="w-4 h-4 shrink-0" />
                  {!isSidebarCollapsed && (
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-black truncate">
                        Tải App v{appDownloadMeta.version}
                      </div>
                      <div className="text-[9px] font-semibold text-blue-600/80 dark:text-blue-400 truncate">
                        iOS (iPhone/iPad) &amp; Android
                      </div>
                    </div>
                  )}
                </button>
              )}
              {currentAccount && (
                <Link
                  to="/student/profile"
                  className={`p-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 rounded-2xl flex items-center gap-2.5 transition-colors cursor-pointer border border-slate-200/50 dark:border-slate-700/60 ${
                    isSidebarCollapsed ? "justify-center" : ""
                  }`}
                  title="Hồ sơ cá nhân"
                >
                  <UserAvatar
                    src={currentAccount.avatarUrl}
                    name={currentAccount.displayName || currentAccount.username}
                    size="sm"
                    shape="rounded"
                  />
                  {!isSidebarCollapsed && (
                    <div className="truncate flex-1">
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{currentAccount.displayName || "Thí sinh"}</div>
                      <div className="text-[10px] text-slate-400 truncate">@{currentAccount.username || "student"}</div>
                    </div>
                  )}
                </Link>
              )}
            </div>
          </aside>
        )}

        {/* Mobile Slide-Over Drawer */}
        {!hideStudentNav && isMobileDrawerOpen && (
          <div className="fixed inset-0 z-50 md:hidden animate-in fade-in duration-200">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
              onClick={() => setIsMobileDrawerOpen(false)}
            />

            {/* Drawer (Fixed full height with dedicated scrollable navigation body) */}
            <div className="fixed inset-y-0 left-0 max-w-xs w-[82vw] sm:w-80 h-dvh max-h-dvh bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-2xl z-10 flex flex-col overflow-hidden">
              <div className="shrink-0 flex items-center justify-between px-4 py-3.5 border-b border-slate-100 dark:border-slate-800">
                <BrandLogo size="xs" badgeText="Phòng thi" theme="blue" />
                <div className="flex items-center gap-1.5">
                  <ThemeToggle variant="icon" />
                  <button
                    type="button"
                    onClick={() => setIsMobileDrawerOpen(false)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Scrollable Drawer Body (Profile + All Navigation Links + App Download) */}
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-3.5 space-y-3">
                {/* Student Profile Preview */}
                {currentAccount ? (
                  <Link
                    to="/student/profile"
                    onClick={() => setIsMobileDrawerOpen(false)}
                    className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl flex items-center gap-3 border border-slate-200/70 dark:border-slate-700/60"
                  >
                    <UserAvatar
                      src={currentAccount.avatarUrl}
                      name={currentAccount.displayName || currentAccount.username}
                      size="md"
                      shape="rounded"
                    />
                    <div className="truncate flex-1">
                      <div className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{currentAccount.displayName || "Thí sinh"}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate">@{currentAccount.username || "student"}</div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-bold">
                          <Flame className="w-3 h-3 text-amber-500 fill-amber-500" />
                          <span>Chuỗi {gameStats.currentStreak} ngày</span>
                        </span>
                        <span className="text-[10px] font-semibold text-slate-400">Lv.{gameStats.level}</span>
                      </div>
                    </div>
                  </Link>
                ) : (
                  <Link
                    to="/login"
                    onClick={() => setIsMobileDrawerOpen(false)}
                    className="block p-3 bg-blue-50 dark:bg-blue-950/50 rounded-2xl text-center text-xs font-bold text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800"
                  >
                    Đăng nhập tài khoản
                  </Link>
                )}

                {/* Navigation Links */}
                <div className="space-y-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                      item.to === "/"
                        ? location.pathname === "/" || location.pathname === "/exams" || location.pathname === "/student/online"
                        : item.to === "/student/courses"
                        ? location.pathname.startsWith("/student/courses") || location.pathname.startsWith("/courses")
                        : item.to === "/student/documents"
                        ? isDocumentLibraryRoute
                        : item.to === "/student/practice"
                        ? location.pathname.startsWith("/student/practice") || location.pathname.startsWith("/practice")
                        : item.to === "/student/ai-shop"
                        ? location.pathname.startsWith("/student/ai-shop") || location.pathname.startsWith("/ai-shop")
                        : item.to === "/student/minigame"
                        ? location.pathname.startsWith("/student/minigame") || location.pathname.startsWith("/minigame")
                        : location.pathname === item.to;
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        data-tour-id={item.tourId}
                        onClick={() => {
                          setIsMobileDrawerOpen(false);
                          if (item.actionKey) triggerAction(item.actionKey);
                        }}
                        className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                          isActive
                            ? "bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800 shadow-2xs"
                            : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        <Icon className={`w-4 h-4 shrink-0 ${item.iconColor || ""}`} />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}

                  <div className="pt-2">
                    {renderAppDownloadTile(() => setIsMobileDrawerOpen(false))}
                  </div>

                  {isAdmin && (
                    <Link
                      to="/admin/exams"
                      onClick={() => setIsMobileDrawerOpen(false)}
                      className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-800 mt-1"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>Trang Quản Trị Viên</span>
                    </Link>
                  )}
                </div>
              </div>

              {currentAccount && (
                <div className="shrink-0 px-4 py-3 border-t border-slate-100 dark:border-slate-800 safe-area-bottom">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileDrawerOpen(false);
                      setShowLogoutModal(true);
                    }}
                    className="w-full py-2.5 px-4 bg-red-50 hover:bg-red-100 dark:bg-red-950/50 dark:hover:bg-red-900/60 text-red-700 dark:text-red-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Đăng xuất</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        <main className={`flex-1 overflow-y-auto overflow-x-hidden bg-slate-50/50 dark:bg-slate-950/60 ${isCourseTheater ? "pb-0 flex flex-col overflow-hidden" : "pb-24 md:pb-6"}`}>
          {!hideStudentNav && <OpenInAppBanner />}
          <Outlet />
        </main>
      </div>

      {/* Modern Compact Mobile Bottom Navigation Bar & 3-Gạch Drawer */}
      {!hideStudentNav && (
        <>
          {/* Bottom Sheet Menu for 3-gạch button */}
          {isBottomMenuOpen && (
            <div className="fixed inset-0 z-50 md:hidden animate-in fade-in duration-200">
              {/* Backdrop */}
              <div
                className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
                onClick={() => setIsBottomMenuOpen(false)}
              />

              {/* Bottom Sheet Modal */}
              <div className="fixed inset-x-0 bottom-0 bg-white dark:bg-slate-900 rounded-t-[28px] shadow-2xl z-10 p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] border-t border-slate-200 dark:border-slate-800 animate-in slide-in-from-bottom duration-300 max-h-[85vh] overflow-y-auto">
                {/* Pull handle indicator */}
                <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-4" />

                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                      <Menu className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">Danh mục tính năng</h3>
                      <p className="text-[11px] text-slate-400">Chọn tiện ích bạn muốn truy cập</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <ThemeToggle variant="icon" />
                    <button
                      type="button"
                      onClick={() => setIsBottomMenuOpen(false)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Profile snippet if logged in */}
                {currentAccount && (
                  <Link
                    to="/student/profile"
                    onClick={() => setIsBottomMenuOpen(false)}
                    className="p-3 mb-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl flex items-center gap-3 border border-slate-200/70 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <UserAvatar
                      src={currentAccount.avatarUrl}
                      name={currentAccount.displayName || currentAccount.username}
                      size="md"
                      shape="rounded"
                    />
                    <div className="truncate flex-1">
                      <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {currentAccount.displayName || "Thí sinh"}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        @{currentAccount.username || "student"}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-bold">
                          <Flame className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />
                          <span>Chuỗi {gameStats.currentStreak} ngày</span>
                        </span>
                        <span className="text-[10px] text-slate-400">Lv.{gameStats.level}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </Link>
                )}

                {/* Grid of Requested Categories */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-4">
                  {/* 0. Kho Tài Liệu Khổng Lồ */}
                  <Link
                    to="/student/documents"
                    onClick={() => {
                      setIsBottomMenuOpen(false);
                      triggerAction("click_documents");
                    }}
                    className={`flex items-center gap-3.5 p-3 rounded-2xl border transition-all sm:col-span-2 ${
                      isDocumentLibraryRoute
                        ? "bg-teal-50/80 border-teal-300 dark:bg-teal-950/40 dark:border-teal-800 shadow-2xs"
                        : "bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:bg-teal-50/50"
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/50 text-teal-600 dark:text-teal-300 flex items-center justify-center shrink-0 shadow-2xs">
                      <Library className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>Kho Tài Liệu</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300 font-bold">5.400+ PDF</span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        Cây thư mục chuẩn gốc, Độc quyền DkTEST &amp; tải trọn bộ
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                  </Link>

                  {/* 0a. Gia sư AI */}
                  <Link
                    to="/student/ai-tutor"
                    data-tour-id={TOUR_DATA_IDS.NAV_AI}
                    onClick={() => {
                      setIsBottomMenuOpen(false);
                      triggerAction("click_ai");
                    }}
                    className={`flex items-center gap-3.5 p-3 rounded-2xl border transition-all ${
                      location.pathname.startsWith("/student/ai-tutor") || location.pathname.startsWith("/ai-tutor")
                        ? "bg-indigo-50/80 border-indigo-300 dark:bg-indigo-950/40 dark:border-indigo-800 shadow-2xs"
                        : "bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:bg-indigo-50/50"
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 flex items-center justify-center shrink-0 shadow-2xs">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>Gia sư AI</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-bold">24/7</span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        Giải bài tập &amp; hỏi đáp từng bước thông minh
                      </div>
                    </div>
                  </Link>

                  {/* 0a2. Cộng đồng */}
                  <Link
                    to="/student/community"
                    data-tour-id={TOUR_DATA_IDS.NAV_COMMUNITY}
                    onClick={() => {
                      setIsBottomMenuOpen(false);
                      triggerAction("click_community");
                    }}
                    className={`flex items-center gap-3.5 p-3 rounded-2xl border transition-all ${
                      location.pathname.startsWith("/student/community")
                        ? "bg-amber-50/80 border-amber-300 dark:bg-amber-950/40 dark:border-amber-800 shadow-2xs"
                        : "bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:bg-amber-50/50"
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-300 flex items-center justify-center shrink-0 shadow-2xs">
                      <Flame className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        Cộng đồng học tập
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        Thảo luận bài khó &amp; chia sẻ kinh nghiệm thi
                      </div>
                    </div>
                  </Link>

                  {/* 0a3. Đấu Trường */}
                  <Link
                    to="/student/arena"
                    onClick={() => {
                      setIsBottomMenuOpen(false);
                      triggerAction("click_arena");
                    }}
                    className={`flex items-center gap-3.5 p-3 rounded-2xl border transition-all ${
                      location.pathname.startsWith("/student/arena") || location.pathname.startsWith("/arena")
                        ? "bg-amber-50/80 border-amber-300 dark:bg-amber-950/40 dark:border-amber-800 shadow-2xs"
                        : "bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:bg-amber-50/50"
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-300 flex items-center justify-center shrink-0 shadow-2xs">
                      <Swords className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>Đấu Trường</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 font-bold">PvP</span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        Thi đấu tốc độ thời gian thực cùng bạn bè
                      </div>
                    </div>
                  </Link>

                  {/* 0b. Mua Acc AI tự động */}
                  <Link
                    to="/student/ai-shop"
                    onClick={() => {
                      setIsBottomMenuOpen(false);
                      triggerAction("click_ai_shop");
                    }}
                    className={`flex items-center gap-3.5 p-3 rounded-2xl border transition-all ${
                      location.pathname.startsWith("/student/ai-shop") || location.pathname.startsWith("/ai-shop")
                        ? "bg-blue-50/80 border-blue-300 dark:bg-blue-950/40 dark:border-blue-800 shadow-2xs"
                        : "bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:bg-blue-50/50"
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 flex items-center justify-center shrink-0 shadow-2xs">
                      <ShoppingBag className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>Mua Acc AI</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-bold">Tự động</span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        ChatGPT Plus, Gemini Pro, YouTube Premium...
                      </div>
                    </div>
                  </Link>

                  {/* 0c. Minigame Phúc Lợi */}
                  <Link
                    to="/student/minigame"
                    onClick={() => {
                      setIsBottomMenuOpen(false);
                      triggerAction("click_minigame");
                    }}
                    className={`flex items-center gap-3.5 p-3 rounded-2xl border transition-all ${
                      location.pathname.startsWith("/student/minigame") || location.pathname.startsWith("/minigame")
                        ? "bg-amber-50/80 border-amber-300 dark:bg-amber-950/40 dark:border-amber-800 shadow-2xs"
                        : "bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:bg-amber-50/50"
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-300 flex items-center justify-center shrink-0 shadow-2xs">
                      <Trophy className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>Minigame Phúc Lợi</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 font-bold">0đ</span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        Đua ngựa, đua ong, tài xỉu, bầu cua nhận quà
                      </div>
                    </div>
                  </Link>

                  {/* 1. Hành trình */}
                  <Link
                    to="/journey"
                    onClick={() => {
                      setIsBottomMenuOpen(false);
                      triggerAction("click_journey");
                    }}
                    className={`flex items-center gap-3.5 p-3 rounded-2xl border transition-all ${
                      location.pathname === "/journey" || location.pathname === "/student/journey"
                        ? "bg-emerald-50/80 border-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800 shadow-2xs"
                        : "bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:bg-emerald-50/50"
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-300 flex items-center justify-center shrink-0 shadow-2xs">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>Hành trình</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 font-bold">3D Map</span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        Chặng đường chinh phục & bản đồ học tập
                      </div>
                    </div>
                  </Link>

                  {/* 2. Kênh Thế Giới */}
                  <Link
                    to="/student/chat"
                    onClick={() => {
                      setIsBottomMenuOpen(false);
                      triggerAction("click_chat");
                    }}
                    className={`flex items-center gap-3.5 p-3 rounded-2xl border transition-all ${
                      location.pathname === "/student/chat" || location.pathname === "/chat"
                        ? "bg-sky-50/80 border-sky-300 dark:bg-sky-950/40 dark:border-sky-800 shadow-2xs"
                        : "bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:bg-sky-50/50"
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-900/50 text-sky-600 dark:text-sky-300 flex items-center justify-center shrink-0 shadow-2xs">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>Kênh Thế Giới</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300 font-bold">Chat</span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        Giao lưu & hỏi đáp trực tiếp
                      </div>
                    </div>
                  </Link>

                  {/* 3. Ví DkTEST */}
                  <Link
                    to="/student/wallet"
                    onClick={() => {
                      setIsBottomMenuOpen(false);
                      triggerAction("click_wallet");
                    }}
                    className={`flex items-center gap-3.5 p-3 rounded-2xl border transition-all ${
                      location.pathname === "/student/wallet" || location.pathname === "/wallet"
                        ? "bg-emerald-50/80 border-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800 shadow-2xs"
                        : "bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:bg-emerald-50/50"
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-300 flex items-center justify-center shrink-0 shadow-2xs">
                      <Wallet className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        Ví DkTEST
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        Số dư, Voucher & mời bạn nhận thưởng
                      </div>
                    </div>
                  </Link>

                  {/* 3b. Hồ sơ */}
                  <Link
                    to="/student/profile"
                    onClick={() => {
                      setIsBottomMenuOpen(false);
                      triggerAction("click_profile");
                    }}
                    className={`flex items-center gap-3.5 p-3 rounded-2xl border transition-all ${
                      location.pathname === "/student/profile"
                        ? "bg-blue-50/80 border-blue-300 dark:bg-blue-950/40 dark:border-blue-800 shadow-2xs"
                        : "bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:bg-blue-50/50"
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 flex items-center justify-center shrink-0 shadow-2xs">
                      <User className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        Hồ sơ & Avatar
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        Quản lý tài khoản & thành tích cá nhân
                      </div>
                    </div>
                  </Link>

                  {/* 4. Chính sách */}
                  <Link
                    to="/legal-policy"
                    onClick={() => setIsBottomMenuOpen(false)}
                    className={`flex items-center gap-3.5 p-3 rounded-2xl border transition-all ${
                      location.pathname === "/legal-policy"
                        ? "bg-slate-100 border-slate-300 dark:bg-slate-800 dark:border-slate-700 shadow-2xs"
                        : "bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:bg-slate-100/60"
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0 shadow-2xs">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        Chính sách & Điều khoản
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        Bản quyền nội dung & bảo mật người dùng
                      </div>
                    </div>
                  </Link>
                </div>

                {renderAppDownloadTile(() => setIsBottomMenuOpen(false))}

                {isAdmin && (
                  <Link
                    to="/admin/exams"
                    onClick={() => setIsBottomMenuOpen(false)}
                    className="flex items-center gap-3 p-3 rounded-2xl text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 mb-3"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Trang Quản Trị Viên</span>
                  </Link>
                )}

                {studentInfo && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsBottomMenuOpen(false);
                      setShowLogoutModal(true);
                    }}
                    className="w-full py-2.5 px-4 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Đăng xuất tài khoản</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Compact Bottom Navigation Bar: Đề thi, Luyện tập, Khóa học, Lịch sử, Danh mục */}
          <nav
            aria-label="Thanh điều hướng di động"
            className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-2 pt-1.5 pb-[max(0.4rem,env(safe-area-inset-bottom))] flex items-center justify-around shadow-lg z-30"
          >
            {/* 1. Đề thi */}
            <Link
              to="/"
              data-tour-id={TOUR_DATA_IDS.NAV_EXAMS}
              onClick={() => triggerAction("click_exams")}
              className={`flex flex-col items-center gap-0.5 px-2.5 py-1 rounded-2xl transition-all cursor-pointer ${
                location.pathname === "/" ||
                location.pathname === "/exams" ||
                location.pathname === "/student/online" ||
                location.pathname.startsWith("/student/exam/") ||
                location.pathname.startsWith("/exam/")
                  ? "text-blue-600 dark:text-blue-400 font-bold scale-105"
                  : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
            >
              <BookOpen className="w-5 h-5" />
              <span className="text-[10px]">Đề thi</span>
            </Link>

            {/* 2. Luyện tập */}
            <Link
              to="/student/practice"
              data-tour-id={TOUR_DATA_IDS.NAV_PRACTICE}
              onClick={() => triggerAction("click_practice")}
              className={`flex flex-col items-center gap-0.5 px-2.5 py-1 rounded-2xl transition-all cursor-pointer ${
                location.pathname.startsWith("/student/practice") || location.pathname.startsWith("/practice")
                  ? "text-blue-600 dark:text-blue-400 font-bold scale-105"
                  : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
            >
              <BrainCircuit className="w-5 h-5" />
              <span className="text-[10px]">Luyện tập</span>
            </Link>

            {/* 3. Khóa học */}
            <Link
              to="/student/courses"
              onClick={() => triggerAction("click_courses")}
              className={`flex flex-col items-center gap-0.5 px-2.5 py-1 rounded-2xl transition-all cursor-pointer ${
                location.pathname.startsWith("/student/courses") || location.pathname.startsWith("/courses")
                  ? "text-rose-600 dark:text-rose-400 font-bold scale-105"
                  : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
            >
              <PlayCircle className="w-5 h-5" />
              <span className="text-[10px]">Khóa học</span>
            </Link>

            {/* 4. Lịch sử */}
            <Link
              to="/student/history"
              data-tour-id={TOUR_DATA_IDS.NAV_HISTORY}
              onClick={() => triggerAction("click_history")}
              className={`flex flex-col items-center gap-0.5 px-2.5 py-1 rounded-2xl transition-all cursor-pointer ${
                location.pathname === "/student/history"
                  ? "text-cyan-600 dark:text-cyan-400 font-bold scale-105"
                  : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
            >
              <History className="w-5 h-5" />
              <span className="text-[10px]">Lịch sử</span>
            </Link>

            {/* 5. Danh mục */}
            <button
              type="button"
              onClick={() => setIsBottomMenuOpen(true)}
              className={`flex flex-col items-center gap-0.5 px-2.5 py-1 rounded-2xl transition-all cursor-pointer relative ${
                isBottomMenuOpen || isSecondaryCategoryRoute
                  ? "text-blue-600 dark:text-blue-400 font-bold scale-105"
                  : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
            >
              <div className="relative">
                <Menu className="w-5 h-5" />
                {isSecondaryCategoryRoute && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                )}
              </div>
              <span className="text-[10px]">Danh mục</span>
            </button>
          </nav>
        </>
      )}


      <ConfirmModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleConfirmLogout}
        title="Đăng xuất"
        message="Bạn có chắc chắn muốn đăng xuất khỏi tài khoản học sinh?"
        confirmText="Đăng xuất"
        cancelText="Ở lại"
        variant="danger"
      />

      <AppInstallModal
        open={showAppInstallModal}
        onClose={() => setShowAppInstallModal(false)}
      />

      {!isNativeAndroid() && <AnnouncementPopupModal />}
    </div>
  );
}

export default function StudentLayout() {
  return (
    <StudentOnboardingProvider>
      <StudentLayoutContent />
    </StudentOnboardingProvider>
  );
}
