"use client";

import { useEffect, useState } from "react";
import { Bell, Check, Trash2, AlertTriangle, Info, CheckCircle, XCircle, Clock, Filter } from "lucide-react";
import {
  deleteNotificationById,
  fetchNotifications,
  formatTimeAgo,
  markAllNotificationsRead,
  markNotificationRead,
  type BackendNotification,
} from "@/lib/notifications-client";

interface Notification {
  id: string;
  type: "info" | "success" | "warning" | "error";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  source: string;
}

function mapType(type: string): Notification["type"] {
  if (type === "report_approved") return "success";
  if (type === "report_rejected") return "warning";
  if (type === "system") return "info";
  return "info";
}

function mapNotification(item: BackendNotification): Notification {
  const mappedType = mapType(item.type);
  return {
    id: item.id,
    type: mappedType,
    title: item.title || "Notification",
    message: item.message || item.title || "Notification update",
    timestamp: formatTimeAgo(item.created_at),
    read: item.is_read,
    source: mappedType === "info" ? "System" : "Reports",
  };
}

const typeIcons = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: XCircle,
};

const typeColors = {
  info: "bg-blue-100 text-blue-600 border-blue-200",
  success: "bg-emerald-100 text-emerald-600 border-emerald-200",
  warning: "bg-amber-100 text-amber-600 border-amber-200",
  error: "bg-red-100 text-red-600 border-red-200",
};

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    let isMounted = true;

    const loadNotifications = async () => {
      try {
        const items = await fetchNotifications(100);
        if (!isMounted) return;
        setNotifications(items.map(mapNotification));
      } catch (error) {
        console.error("Failed to load notifications", error);
        if (isMounted) setNotifications([]);
      }
    };

    loadNotifications();
    return () => {
      isMounted = false;
    };
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const filteredNotifications = notifications.filter((n) => {
    if (filter === "all") return true;
    if (filter === "unread") return !n.read;
    return n.type === filter;
  });

  const markAsRead = async (id: string) => {
    try {
      await markNotificationRead(id);
    } catch (error) {
      console.error("Failed to mark notification as read", error);
    }
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = async () => {
    try {
      await markAllNotificationsRead();
    } catch (error) {
      console.error("Failed to mark all notifications as read", error);
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const deleteNotification = async (id: string) => {
    try {
      await deleteNotificationById(id);
    } catch (error) {
      console.error("Failed to delete notification", error);
    }
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Notifications</h1>
            <p className="text-base text-slate-500 mt-2">
              {unreadCount > 0 ? `You have ${unreadCount} unread notifications` : "All caught up!"}
            </p>
          </div>
          <button
            onClick={markAllAsRead}
            className="flex items-center gap-2 h-11 px-5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Check className="h-4 w-4" /> Mark All Read
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {["all", "unread", "info", "success", "warning", "error"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`h-9 px-4 text-sm font-medium rounded-lg transition-colors ${
                filter === f
                  ? "bg-[#0b1f3a] text-white"
                  : "bg-white text-slate-600 border border-slate-300 hover:bg-slate-50"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        <div className="space-y-4">
          {filteredNotifications.map((notification) => {
            const Icon = typeIcons[notification.type];
            return (
              <div
                key={notification.id}
                className={`bg-white rounded-xl border p-5 transition-all ${
                  notification.read ? "border-slate-200" : "border-l-4 border-l-[#0b1f3a] border-slate-200"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 ${typeColors[notification.type]}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className={`text-sm font-semibold ${notification.read ? "text-slate-700" : "text-slate-900"}`}>
                          {notification.title}
                        </h3>
                        <p className="text-sm text-slate-600 mt-1">{notification.message}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {notification.timestamp}
                          </span>
                          <span className="text-xs text-slate-400">•</span>
                          <span className="text-xs text-slate-500">{notification.source}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {!notification.read && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Mark as read"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteNotification(notification.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredNotifications.length === 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <Bell className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No notifications found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
