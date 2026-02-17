"use client";

import { useEffect, useState } from "react";
import { Bell, CheckCircle, XCircle, MessageSquare, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import {
  deleteNotificationById,
  extractActor,
  extractCompanyAndPeriod,
  fetchNotifications,
  formatDateYYYYMMDD,
  formatTimeAgo,
  markAllNotificationsRead,
  markNotificationRead,
  type BackendNotification,
} from "@/lib/notifications-client";

interface Notification {
  id: string;
  date: string;
  company: string;
  month: string;
  type: "approved" | "rejected" | "comment";
  message: string;
  comment?: string;
  from: string;
  timeAgo: string;
  read: boolean;
}

function mapType(type: string): Notification["type"] {
  if (type === "report_approved") return "approved";
  if (type === "report_rejected") return "rejected";
  return "comment";
}

function mapNotification(item: BackendNotification): Notification {
  const combinedText = `${item.title || ""} ${item.message || ""}`.trim();
  const { company, period } = extractCompanyAndPeriod(combinedText);
  const type = mapType(item.type);
  const reasonMatch = combinedText.match(/rejected:\s*(.+)$/i);

  return {
    id: item.id,
    date: formatDateYYYYMMDD(item.created_at),
    company,
    month: period,
    type,
    message: item.title || item.message || "Notification",
    comment:
      reasonMatch?.[1] ||
      (type === "comment" ? item.message || undefined : undefined),
    from: extractActor(combinedText),
    timeAgo: formatTimeAgo(item.created_at),
    read: item.is_read,
  };
}

export default function NotificationsPage() {
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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

  const filteredNotifications = notifications.filter((n) => {
    if (filter === "unread" && n.read) return false;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleDelete = async (id: string) => {
    try {
      await deleteNotificationById(id);
    } catch (error) {
      console.error("Failed to delete notification", error);
    }
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await markNotificationRead(id);
    } catch (error) {
      console.error("Failed to mark notification as read", error);
    }
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsRead();
    } catch (error) {
      console.error("Failed to mark all notifications as read", error);
    }
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "approved": return <CheckCircle className="h-5 w-5 text-emerald-500" />;
      case "rejected": return <XCircle className="h-5 w-5 text-red-500" />;
      case "comment": return <MessageSquare className="h-5 w-5 text-blue-500" />;
      default: return <Bell className="h-5 w-5 text-slate-400" />;
    }
  };

  const getBgColor = (type: string) => {
    switch (type) {
      case "approved": return "bg-emerald-50";
      case "rejected": return "bg-red-50";
      case "comment": return "bg-blue-50";
      default: return "bg-slate-50";
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Notifications</h1>
            <p className="text-sm text-slate-500 mt-1">{unreadCount} unread notifications</p>
          </div>
          <button 
            onClick={handleMarkAllAsRead}
            className="text-sm font-medium text-[#0b1f3a] hover:underline"
          >
            Mark all as read
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-slate-200 px-6 py-3">
        <div className="flex gap-1 p-1 bg-slate-100 rounded-lg w-fit">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              filter === "all" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${
              filter === "unread" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Unread
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full">{unreadCount}</span>
            )}
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl space-y-3">
          {filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`bg-white rounded-xl border transition-all ${
                notification.read ? "border-slate-200" : "border-[#0b1f3a]/20 shadow-sm"
              }`}
            >
              <div 
                className="p-4 cursor-pointer"
                onClick={() => {
                  setExpandedId(expandedId === notification.id ? null : notification.id);
                  handleMarkAsRead(notification.id);
                }}
              >
                <div className="flex items-start gap-4">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${getBgColor(notification.type)}`}>
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className={`text-sm ${notification.read ? "text-slate-700" : "text-slate-900 font-semibold"}`}>
                          {notification.message}
                        </p>
                        <p className="text-sm text-slate-600 mt-1">
                          <span className="font-medium">{notification.company}</span> - {notification.month}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {!notification.read && <div className="h-2 w-2 rounded-full bg-[#0b1f3a]" />}
                        {notification.comment && (
                          expandedId === notification.id 
                            ? <ChevronUp className="h-4 w-4 text-slate-400" />
                            : <ChevronDown className="h-4 w-4 text-slate-400" />
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-slate-500">From: {notification.from}</span>
                      <span className="text-xs text-slate-400">• {notification.timeAgo}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Expanded Comment Section */}
              {expandedId === notification.id && notification.comment && (
                <div className="px-4 pb-4">
                  <div className={`p-4 rounded-lg ${
                    notification.type === "rejected" ? "bg-red-50 border border-red-100" : "bg-slate-50 border border-slate-100"
                  }`}>
                    <p className="text-xs font-medium text-slate-500 uppercase mb-2">
                      {notification.type === "rejected" ? "Rejection Reason" : "Comment"}
                    </p>
                    <p className="text-sm text-slate-700 leading-relaxed">{notification.comment}</p>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <button className="text-sm font-medium text-[#0b1f3a] hover:underline">
                      Reply via Email
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(notification.id); }}
                      className="flex items-center gap-1 text-sm text-slate-400 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" /> Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {filteredNotifications.length === 0 && (
            <div className="text-center py-16">
              <Bell className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">No notifications to show</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
