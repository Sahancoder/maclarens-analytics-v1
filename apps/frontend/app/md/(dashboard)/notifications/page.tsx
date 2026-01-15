"use client";

import { useState } from "react";
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

type NotificationType = "all" | "alerts" | "reports" | "approvals" | "system";

interface Notification {
  id: number;
  type: "alert" | "report" | "approval" | "system" | "success";
  title: string;
  message: string;
  cluster?: string;
  time: string;
  read: boolean;
  priority: "high" | "medium" | "low";
}

const notifications: Notification[] = [
  {
    id: 1,
    type: "alert",
    title: "Critical Variance Alert",
    message: "IOE Group variance exceeds threshold at -325%. Immediate review recommended.",
    cluster: "Bunkering",
    time: "2 hours ago",
    read: false,
    priority: "high",
  },
  {
    id: 2,
    type: "approval",
    title: "Q3 Forecast Revision",
    message: "Q3 forecast revision submitted by Finance team pending your approval.",
    cluster: "Group",
    time: "5 hours ago",
    read: false,
    priority: "high",
  },
  {
    id: 3,
    type: "alert",
    title: "Underperformance Warning",
    message: "Carplan Lubricants YTD achievement at 67.3%, below 80% threshold.",
    cluster: "Lube 02",
    time: "1 day ago",
    read: false,
    priority: "medium",
  },
  {
    id: 4,
    type: "success",
    title: "Target Exceeded",
    message: "MLL-Automotive exceeded monthly target by 15%. Strong performance continues.",
    cluster: "Lube 01",
    time: "1 day ago",
    read: true,
    priority: "low",
  },
  {
    id: 5,
    type: "report",
    title: "Monthly Board Report Ready",
    message: "October 2025 consolidated board report is ready for review.",
    cluster: "Group",
    time: "2 days ago",
    read: true,
    priority: "medium",
  },
  {
    id: 6,
    type: "system",
    title: "Scenario Model Updated",
    message: "Best-case scenario model has been updated with latest market projections.",
    time: "2 days ago",
    read: true,
    priority: "low",
  },
  {
    id: 7,
    type: "alert",
    title: "Cash Flow Warning",
    message: "Strategic Investment cluster showing negative cash flow for 3 consecutive months.",
    cluster: "Strategic Investment",
    time: "3 days ago",
    read: true,
    priority: "high",
  },
  {
    id: 8,
    type: "approval",
    title: "Budget Reallocation Request",
    message: "Request to reallocate LKR 15M from Property to Manufacturing pending approval.",
    cluster: "Group",
    time: "3 days ago",
    read: true,
    priority: "medium",
  },
  {
    id: 9,
    type: "success",
    title: "YTD Target Achieved",
    message: "Warehouse & Logistics cluster achieved 110.8% of YTD target.",
    cluster: "Warehouse & Logistics",
    time: "4 days ago",
    read: true,
    priority: "low",
  },
  {
    id: 10,
    type: "report",
    title: "Risk Assessment Complete",
    message: "Q3 risk assessment report for all clusters has been finalized.",
    cluster: "Group",
    time: "5 days ago",
    read: true,
    priority: "medium",
  },
];

export default function CEONotificationsPage() {
  const [filter, setFilter] = useState<NotificationType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [notificationList, setNotificationList] = useState(notifications);

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

  const markAsRead = (id: number) => {
    setNotificationList((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
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
