import React, { useState, useEffect, useRef } from "react";
import { Bell, Check, ExternalLink, Info, Award, ShieldAlert, HeartHandshake } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { fetchUserNotifications, markNotificationAsRead } from "../../services/notificationService";
import type { SystemNotification } from "../../types";
import { Link } from "react-router-dom";

export default function NotificationCenter() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    fetchUserNotifications(user.uid).then((list) => {
      setNotifications(list);
      setUnreadCount(list.filter((n) => !n.read).length);
    });
  }, [user]);

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
        onClick={() => setOpen(!open)}
        className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
        title="Thông báo"
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
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800">Thông báo ({notifications.length})</h4>
            {unreadCount > 0 && (
              <span className="text-[11px] font-semibold text-blue-600">
                {unreadCount} chưa đọc
              </span>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                Không có thông báo mới nào
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
                    <p className={`text-xs ${!notif.read ? "font-bold text-slate-900" : "font-medium text-slate-700"}`}>
                      {notif.title}
                    </p>
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
    </div>
  );
}
