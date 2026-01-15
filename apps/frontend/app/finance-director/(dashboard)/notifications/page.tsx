"use client";

import { useState } from "react";
import { Bell, CheckCircle, XCircle, MessageSquare, FileText, Clock, Trash2, ChevronRight } from "lucide-react";

interface Notification {
  id: string;
  type: "approved" | "submitted" | "comment" | "reminder";
  title: string;
  description: string;
  company: string;
  month: string;
  from: string;
  time: string;
  read: boolean;
}

const notificationsData: Notification[] = [
  {
    id: "1",
    type: "submitted",
    title: "New Report Submitted",
    description: "Actual report for December 2025 has been submitted and is awaiting your review",
    company: "McLarens Maritime Academy",
    month: "December 2025",
    from: "Sahan Hettiarachchi",
    time: "2 hours ago",
    read: false,
  },
  {
    id: "2",
    type: "comment",
    title: "New Comment Received",
    description: "Data Officer has responded to your query about admin expenses",
    company: "McLarens Maritime Academy",
    month: "November 2025",
    from: "Sahan Hettiarachchi",
    time: "5 hours ago",
    read: false,
  },
  {
    id: "3",
    type: "reminder",
    title: "Budget Entry Reminder",
    description: "Budget entry for January 2026 is due in 3 days",
    company: "McLarens Maritime Academy",
    month: "January 2026",
    from: "System",
    time: "1 day ago",
    read: false,
  },
  {
    id: "4",
    type: "approved",
    title: "Report Approved Successfully",
    description: "You approved the actual report for October 2025",
    company: "McLarens Maritime Academy",
    month: "October 2025",
    from: "You",
    time: "3 days ago",
    read: true,
  },
  {
    id: "5",
    type: "submitted",
    title: "Report Resubmitted",
    description: "Corrected actual report has been resubmitted after your feedback",
    company: "McLarens Maritime Academy",
    month: "September 2025",
    from: "Sahan Hettiarachchi",
    time: "5 days ago",
    read: true,
  },
  {
    id: "6",
    type: "comment",
    title: "Query Response",
    description: "Clarification provided for exchange rate calculation",
    company: "McLarens Maritime Academy",
    month: "September 2025",
    from: "Sahan Hettiarachchi",
    time: "1 week ago",
    read: true,
  },
];

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState(notificationsData);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const unreadCount = notifications.filter((n) => !n.read).length;

  const filteredNotifications = notifications.filter((n) => {
    if (filter === "unread") return !n.read;
    return true;
  });

  const handleMarkAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleDelete = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "approved":
        return <CheckCircle className="h-5 w-5 text-emerald-500" />;
      case "submitted":
        return <FileText className="h-5 w-5 text-blue-500" />;
      case "comment":
        return <MessageSquare className="h-5 w-5 text-purple-500" />;
      case "reminder":
        return <Clock className="h-5 w-5 text-amber-500" />;
      default:
        return <Bell className="h-5 w-5 text-slate-400" />;
    }
  };

  const getBgColor = (type: string) => {
    switch (type) {
      case "approved":
        return "bg-emerald-50";
      case "submitted":
        return "bg-blue-50";
      case "comment":
        return "bg-purple-50";
      case "reminder":
        return "bg-amber-50";
      default:
        return "bg-slate-50";
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      <div className="p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Notifications</h1>
            <p className="text-base text-slate-500 mt-2">
              {unreadCount > 0 ? `You have ${unreadCount} unread notifications` : "All caught up!"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleMarkAllAsRead}
              className="text-sm font-medium text-[#0b1f3a] hover:underline"
            >
              Mark all as read
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilter("all")}
            className={`px-5 py-2.5 text-sm font-medium rounded-lg transition-all ${
              filter === "all"
                ? "bg-[#0b1f3a] text-white"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            All Notifications
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={`px-5 py-2.5 text-sm font-medium rounded-lg transition-all flex items-center gap-2 ${
              filter === "unread"
                ? "bg-[#0b1f3a] text-white"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            Unread
            {unreadCount > 0 && (
              <span className={`px-2 py-0.5 text-xs rounded-full ${
                filter === "unread" ? "bg-white/20 text-white" : "bg-red-500 text-white"
              }`}>
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* Notifications List - Full Width */}
        <div className="space-y-4">
          {filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              onClick={() => handleMarkAsRead(notification.id)}
              className={`bg-white rounded-xl border p-6 cursor-pointer transition-all hover:shadow-md ${
                notification.read ? "border-slate-200" : "border-[#0b1f3a]/30 shadow-sm"
              }`}
            >
              <div className="flex items-start gap-5">
                {/* Icon */}
                <div className={`h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0 ${getBgColor(notification.type)}`}>
                  {getIcon(notification.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className={`text-base ${notification.read ? "text-slate-700" : "text-slate-900 font-semibold"}`}>
                          {notification.title}
                        </h3>
                        {!notification.read && (
                          <span className="h-2 w-2 rounded-full bg-[#0b1f3a]" />
                        )}
                      </div>
                      <p className="text-sm text-slate-500 mt-1">{notification.description}</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(notification.id);
                      }}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Meta Info */}
                  <div className="flex flex-wrap items-center gap-4 mt-4">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <FileText className="h-4 w-4 text-slate-400" />
                      {notification.company}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Clock className="h-4 w-4 text-slate-400" />
                      {notification.month}
                    </div>
                    <div className="text-sm text-slate-400">
                      From: {notification.from}
                    </div>
                    <div className="text-sm text-slate-400">
                      {notification.time}
                    </div>
                  </div>

                  {/* Action */}
                  {notification.type === "submitted" && !notification.read && (
                    <div className="mt-4">
                      <button className="flex items-center gap-1 text-sm font-medium text-[#0b1f3a] hover:underline">
                        Review Report <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {filteredNotifications.length === 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-16 text-center">
              <Bell className="h-16 w-16 text-slate-200 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900">No notifications</h3>
              <p className="text-sm text-slate-500 mt-1">
                {filter === "unread" ? "You've read all your notifications" : "You don't have any notifications yet"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
