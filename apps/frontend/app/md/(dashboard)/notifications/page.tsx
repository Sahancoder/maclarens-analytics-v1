"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  FileText,
  CheckCircle,
  Clock,
  Filter,
  Search,
} from "lucide-react";
import {
  fetchNotifications,
  formatTimeAgo,
  markAllNotificationsRead,
  markNotificationRead,
  type BackendNotification,
} from "@/lib/notifications-client";

type NotificationType = "all" | "alerts" | "reports" | "approvals" | "system";

interface Notification {
  id: string;
  type: "alert" | "report" | "approval" | "system" | "success";
  title: string;
  message: string;
  cluster?: string;
  time: string;
  read: boolean;
  priority: "high" | "medium" | "low";
}

function mapType(type: string): Notification["type"] {
  if (type === "report_rejected") return "alert";
  if (type === "report_submitted") return "approval";
  if (type === "report_approved") return "success";
  if (type === "comment_added") return "report";
  return "system";
}

function mapPriority(type: Notification["type"]): Notification["priority"] {
  if (type === "alert" || type === "approval") return "high";
  if (type === "report") return "medium";
  return "low";
}

function mapNotification(item: BackendNotification): Notification {
  const mappedType = mapType(item.type);
  return {
    id: item.id,
    type: mappedType,
    title: item.title || "Notification",
    message: item.message || item.title || "Notification update",
    cluster: undefined,
    time: formatTimeAgo(item.created_at),
    read: item.is_read,
    priority: mapPriority(mappedType),
  };
}

export default function CEONotificationsPage() {
  const [filter, setFilter] = useState<NotificationType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [notificationList, setNotificationList] = useState<Notification[]>([]);

  useEffect(() => {
    let isMounted = true;

    const loadNotifications = async () => {
      try {
        const items = await fetchNotifications(100);
        if (!isMounted) return;
        setNotificationList(items.map(mapNotification));
      } catch (error) {
        console.error("Failed to load notifications", error);
        if (isMounted) setNotificationList([]);
      }
    };

    loadNotifications();
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredNotifications = notificationList.filter((n) => {
    const matchesFilter =
      filter === "all" ||
      (filter === "alerts" && (n.type === "alert" || n.type === "success")) ||
      (filter === "reports" && n.type === "report") ||
      (filter === "approvals" && n.type === "approval") ||
      (filter === "system" && n.type === "system");

    const matchesSearch =
      searchQuery === "" ||
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.message.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const unreadCount = notificationList.filter((n) => !n.read).length;

  const markAsRead = async (id: string) => {
    try {
      await markNotificationRead(id);
    } catch (error) {
      console.error("Failed to mark notification as read", error);
    }
    setNotificationList((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = async () => {
    try {
      await markAllNotificationsRead();
    } catch (error) {
      console.error("Failed to mark all notifications as read", error);
    }
    setNotificationList((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "alert":
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case "success":
        return <TrendingUp className="h-5 w-5 text-emerald-500" />;
      case "report":
        return <FileText className="h-5 w-5 text-blue-500" />;
      case "approval":
        return <Clock className="h-5 w-5 text-purple-500" />;
      case "system":
        return <Bell className="h-5 w-5 text-slate-500" />;
      default:
        return <Bell className="h-5 w-5 text-slate-500" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return (
          <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded">
            High
          </span>
        );
      case "medium":
        return (
          <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded">
            Medium
          </span>
        );
      case "low":
        return (
          <span className="px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-600 rounded">
            Low
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-full bg-slate-50">
      <div className="max-w-[1200px] mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Notifications</h1>
            <p className="text-base text-slate-500 mt-1">
              Stay updated with alerts, reports, and approvals
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#0b1f3a] bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <CheckCircle className="h-4 w-4" />
              Mark all as read
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center">
                <Bell className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{unreadCount}</p>
                <p className="text-xs text-slate-500">Unread</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {notificationList.filter((n) => n.type === "alert").length}
                </p>
                <p className="text-xs text-slate-500">Alerts</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {notificationList.filter((n) => n.type === "approval").length}
                </p>
                <p className="text-xs text-slate-500">Pending</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {notificationList.filter((n) => n.type === "success").length}
                </p>
                <p className="text-xs text-slate-500">Achievements</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <div className="flex gap-2">
                {(["all", "alerts", "reports", "approvals", "system"] as NotificationType[]).map(
                  (type) => (
                    <button
                      key={type}
                      onClick={() => setFilter(type)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                        filter === type
                          ? "bg-[#0b1f3a] text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  )
                )}
              </div>
            </div>
            <div className="flex-1 md:max-w-xs ml-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search notifications..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0b1f3a]/20 focus:border-[#0b1f3a]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Notifications List */}
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          {filteredNotifications.length === 0 ? (
            <div className="p-12 text-center">
              <Bell className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No notifications found</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => markAsRead(notification.id)}
                  className={`p-4 hover:bg-slate-50 cursor-pointer transition-colors ${
                    !notification.read ? "bg-blue-50/50" : ""
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 mt-0.5">
                      {getIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4
                          className={`text-sm font-semibold ${
                            !notification.read ? "text-slate-900" : "text-slate-700"
                          }`}
                        >
                          {notification.title}
                        </h4>
                        {!notification.read && (
                          <span className="h-2 w-2 rounded-full bg-blue-500" />
                        )}
                        {getPriorityBadge(notification.priority)}
                      </div>
                      <p className="text-sm text-slate-600 mb-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        {notification.cluster && (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                            {notification.cluster}
                          </span>
                        )}
                        <span>{notification.time}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
