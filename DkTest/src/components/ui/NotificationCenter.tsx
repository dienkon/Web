import React, { useState, useEffect, useRef } from "react";
import { Bell, Check, ExternalLink, Info, Award, ShieldAlert, HeartHandshake, Loader2, Send, RotateCw } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { fetchUserNotifications, markNotificationAsRead } from "../../services/notificationService";
import type { SystemNotification } from "../../types";
import { Link } from "react-router-dom";
import AnnouncementManagerModal from "./AnnouncementManagerModal";
import { formatRelativeTime } from "../../utils/date";

export default function NotificationCenter() {
  const { user, role } = useAuth();
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isAdmin =
    role === "admin" ||
    role === "super_admin" ||
    Boolean(localStorage.getItem("admin_token") || localStorage.getItem("dktest:admin_token"));

  // Only load on demand when opened, fetched newest first
  const loadNotifications = async (forceRefresh: boolean = false) => {
    const targetUid = user?.uid || (isAdmin ? "admin_master" : "");
    if (!targetUid && !isAdmin) return;

    try {
      setLoading(true);
      const list = await fetchUserNotifications(targetUid, forceRefresh, isAdmin, 12);
      setNotifications(list);
      setUnreadCount(list.filter((n) => !n.read).length);
      setHasLoaded(true);
    } catch (err) {
      console.error("[NotificationCenter] Load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = () => {
    const nextState = !open;
    setOpen(nextState);
    if (nextState && !hasLoaded) {
      loadNotifications(false);
    }
  };

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAsRead = async (notif: SystemNotification) => {
    if (notif.read) return;
    await markNotificationAsRead(notif.id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "approval":
        return <Award className="w-4 h-4 text-emerald-600" />;
      case "security":
        return <ShieldAlert className="w-4 h-4 text-red-600" />;
      case "relationship":
        return <HeartHandshake className="w-4 h-4 text-indigo-600" />;
      default:
        return <Info className="w-4 h-4 text-blue-600" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={handleToggle}
        className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
        title="Thông báo hệ thống"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in duration-150">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span>Thông báo</span>
                <span className="text-[10px] text-slate-400 font-normal">(Mới nhất)</span>
              </h4>
            </div>
            <div className="flex items-center gap-1.5">
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setShowAnnouncementModal(true);
                  }}
                  className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                  title="Soạn thông báo / Popup gửi học sinh"
                >
                  <Send className="w-3 h-3" />
                  <span>Soạn thông báo</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => loadNotifications(true)}
                disabled={loading}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
                title="Làm mới"
              >
                <RotateCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-blue-600" : ""}`} />
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {loading && !hasLoaded ? (
              <div className="p-8 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                <span>Đang tải thông báo gần nhất...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 italic">
                Chưa có thông báo nào gần đây.
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleMarkAsRead(notif)}
                  className={`p-3.5 flex items-start gap-3 transition-colors cursor-pointer hover:bg-slate-50 ${
                    !notif.read ? "bg-blue-50/40" : ""
                  }`}
                >
                  <div className="mt-0.5 shrink-0">{getIcon(notif.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className={`text-xs truncate ${!notif.read ? "font-bold text-slate-900" : "font-medium text-slate-700"}`}>
                        {notif.title}
                      </p>
                      {notif.createdAt && (
                        <span className="text-[10px] text-slate-400 shrink-0 whitespace-nowrap">
                          {formatRelativeTime(notif.createdAt)}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
                      {notif.content}
                    </p>
                    {notif.link && (
                      <Link
                        to={notif.link}
                        onClick={() => setOpen(false)}
                        className="inline-flex items-center gap-1 text-[11px] text-blue-600 font-bold hover:underline mt-1"
                      >
                        <span>Xem chi tiết</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                  {!notif.read && (
                    <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-1.5" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {showAnnouncementModal && (
        <AnnouncementManagerModal onClose={() => setShowAnnouncementModal(false)} />
      )}
    </div>
  );
}
