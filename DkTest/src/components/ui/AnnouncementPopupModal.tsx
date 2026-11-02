import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { X, Sparkles, Megaphone, Gift, AlertTriangle, ArrowRight, Check } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getActiveAnnouncementsForUser } from "../../services/announcementService";
import type { SystemAnnouncement } from "../../types";

export default function AnnouncementPopupModal() {
  const { user } = useAuth();
  const [currentAnnouncement, setCurrentAnnouncement] = useState<SystemAnnouncement | null>(null);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function checkAnnouncements() {
      try {
        const list = await getActiveAnnouncementsForUser(user?.uid);
        if (!isMounted || !list || list.length === 0) return;

        // Find the first eligible announcement that hasn't exceeded its limits or been dismissed
        for (const a of list) {
          const dismissedKey = `dktest_announcement_dismissed_${a.id}`;
          if (localStorage.getItem(dismissedKey) === "true") {
            continue;
          }

          const viewsKey = `dktest_announcement_views_${a.id}`;
          const currentViews = parseInt(localStorage.getItem(viewsKey) || "0", 10);

          if (a.displayFrequency === "once" && currentViews >= 1) {
            continue;
          }

          if (
            a.displayFrequency === "custom" &&
            a.maxDisplayCount &&
            currentViews >= a.maxDisplayCount
          ) {
            continue;
          }

          // Eligible announcement found!
          setCurrentAnnouncement(a);
          // Increment views
          localStorage.setItem(viewsKey, String(currentViews + 1));
          break;
        }
      } catch (err) {
        console.warn("[AnnouncementPopupModal] checkAnnouncements error:", err);
      }
    }

    // Delay slightly after web load to give smooth UX
    const timer = setTimeout(checkAnnouncements, 800);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [user?.uid]);

  if (!currentAnnouncement) return null;

  const handleClose = () => {
    if (dontShowAgain && currentAnnouncement) {
      localStorage.setItem(`dktest_announcement_dismissed_${currentAnnouncement.id}`, "true");
    }
    setCurrentAnnouncement(null);
  };

  const getHeaderStyle = () => {
    switch (currentAnnouncement.type) {
      case "promo":
        return {
          gradient: "from-amber-500 via-rose-500 to-pink-600",
          icon: <Gift className="w-6 h-6 text-white" />,
          badge: "ƯU ĐÃI ĐẶC BIỆT",
        };
      case "warning":
        return {
          gradient: "from-amber-600 to-orange-700",
          icon: <AlertTriangle className="w-6 h-6 text-white" />,
          badge: "THÔNG BÁO QUAN TRỌNG",
        };
      case "info":
        return {
          gradient: "from-blue-600 to-indigo-700",
          icon: <Megaphone className="w-6 h-6 text-white" />,
          badge: "THÔNG TIN HỆ THỐNG",
        };
      default:
        return {
          gradient: "from-indigo-600 via-purple-600 to-pink-600",
          icon: <Sparkles className="w-6 h-6 text-white" />,
          badge: "SỰ KIỆN NỔI BẬT",
        };
    }
  };

  const header = getHeaderStyle();

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 relative animate-in zoom-in-95 duration-200">
        {/* Banner Header */}
        <div className={`p-6 bg-gradient-to-r ${header.gradient} text-white relative`}>
          <button
            type="button"
            onClick={handleClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-black uppercase tracking-wider text-white border border-white/20">
              {header.icon}
              <span>{header.badge}</span>
            </span>
            <h3 className="text-xl font-black text-white leading-tight">
              {currentAnnouncement.title}
            </h3>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          <div className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line font-medium max-h-60 overflow-y-auto">
            {currentAnnouncement.content}
          </div>

          {currentAnnouncement.linkUrl && (
            <Link
              to={currentAnnouncement.linkUrl}
              onClick={handleClose}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{currentAnnouncement.linkText || "Khám phá ngay"}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}

          {/* Don't show again checkbox & close action */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-500 hover:text-slate-700">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
              />
              <span>Không hiện lại</span>
            </label>

            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Đã hiểu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
