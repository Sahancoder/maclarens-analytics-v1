"use client";

import { useState } from "react";
import { Send, Mail, FileText, User, Clock } from "lucide-react";

interface Message {
  id: string;
  from: string;
  fromRole: string;
  content: string;
  timestamp: string;
  isYou: boolean;
}

interface Thread {
  id: string;
  subject: string;
  company: string;
  month: string;
  status: "open" | "resolved";
  lastActivity: string;
  messages: Message[];
}

const threadsData: Thread[] = [
  {
    id: "1",
    subject: "Admin Expenses Clarification Required",
    company: "McLarens Maritime Academy",
    month: "December 2025",
    status: "open",
    lastActivity: "2 hours ago",
    messages: [
      {
        id: "1a",
        from: "Sahan Viranga",
        fromRole: "Company Director",
        content: "The admin expenses for December seem higher than usual. Can you please provide a breakdown of the major expense items? Also, I noticed the depreciation figure doesn't match with our asset register.",
        timestamp: "Dec 22, 2025 at 10:30 AM",
        isYou: true,
      },
      {
        id: "1b",
        from: "Sahan Hettiarachchi",
        fromRole: "Data Officer",
        content: "Thank you for the feedback. The increase in admin expenses is due to the annual software license renewal (LKR 450,000) and office equipment maintenance (LKR 180,000). I'll verify the depreciation calculation and update you shortly.",
        timestamp: "Dec 22, 2025 at 2:15 PM",
        isYou: false,
      },
      {
        id: "1c",
        from: "Sahan Hettiarachchi",
        fromRole: "Data Officer",
        content: "I've checked the depreciation calculation. There was a new asset addition in November that wasn't reflected in the previous month. The corrected figure is LKR 320,000. Should I resubmit the report?",
        timestamp: "Dec 22, 2025 at 4:30 PM",
        isYou: false,
      },
    ],
  },
  {
    id: "2",
    subject: "Exchange Rate Query",
    company: "McLarens Maritime Academy",
    month: "November 2025",
    status: "resolved",
    lastActivity: "5 days ago",
    messages: [
      {
        id: "2a",
        from: "Sahan Viranga",
        fromRole: "Company Director",
        content: "Please clarify the exchange rate used for the USD transactions. The rate seems different from the central bank rate.",
        timestamp: "Dec 15, 2025 at 9:00 AM",
        isYou: true,
      },
      {
        id: "2b",
        from: "Sahan Hettiarachchi",
        fromRole: "Data Officer",
        content: "We used the weighted average rate for the month as per company policy. The rate was 323.50 LKR/USD which is the average of daily rates from our bank statements.",
        timestamp: "Dec 15, 2025 at 11:30 AM",
        isYou: false,
      },
      {
        id: "2c",
        from: "Sahan Viranga",
        fromRole: "Company Director",
        content: "Understood. That makes sense. Please ensure this methodology is documented for audit purposes.",
        timestamp: "Dec 15, 2025 at 2:00 PM",
        isYou: true,
      },
    ],
  },
];

export default function CommentsPage() {
  const [threads, setThreads] = useState(threadsData);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(threads[0]);
  const [replyText, setReplyText] = useState("");

  const handleSendReply = () => {
    if (!replyText.trim() || !selectedThread) return;

    const newMessage: Message = {
      id: `${selectedThread.id}-${Date.now()}`,
      from: "Sahan Viranga",
      fromRole: "Company Director",
      content: replyText,
      timestamp: new Date().toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }),
      isYou: true,
    };

    setThreads((prev) =>
      prev.map((t) =>
        t.id === selectedThread.id
          ? { ...t, messages: [...t.messages, newMessage], lastActivity: "Just now" }
          : t
      )
    );

    setSelectedThread((prev) =>
      prev ? { ...prev, messages: [...prev.messages, newMessage], lastActivity: "Just now" } : null
    );

    setReplyText("");
  };

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-6">
        <h1 className="text-3xl font-bold text-slate-900">Comments</h1>
        <p className="text-base text-slate-500 mt-2">Email conversations with your Data Officer</p>
      </div>

      {/* Main Content - Full Width Split */}
      <div className="flex-1 flex overflow-hidden">
        {/* Thread List */}
        <div className="w-96 bg-white border-r border-slate-200 flex flex-col">
          <div className="p-4 border-b border-slate-200">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Conversations</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {threads.map((thread) => (
              <button
                key={thread.id}
                onClick={() => setSelectedThread(thread)}
                className={`w-full p-5 text-left border-b border-slate-100 transition-all ${
                  selectedThread?.id === thread.id
                    ? "bg-[#0b1f3a]/5 border-l-4 border-l-[#0b1f3a]"
                    : "hover:bg-slate-50"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-sm font-semibold text-slate-900 line-clamp-1">{thread.subject}</h3>
                  <span
                    className={`px-2 py-0.5 text-xs font-medium rounded-full flex-shrink-0 ${
                      thread.status === "open"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {thread.status}
                  </span>
                </div>
                <p className="text-sm text-slate-500">{thread.company}</p>
                <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                  <FileText className="h-3 w-3" />
                  {thread.month}
                  <span className="mx-1">•</span>
                  {thread.lastActivity}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Message Area - Full Width */}
        <div className="flex-1 flex flex-col">
          {selectedThread ? (
            <>
              {/* Thread Header */}
              <div className="bg-white border-b border-slate-200 px-8 py-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">{selectedThread.subject}</h2>
                    <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        {selectedThread.company}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {selectedThread.month}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 text-sm font-medium rounded-full ${
                      selectedThread.status === "open"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {selectedThread.status === "open" ? "Open" : "Resolved"}
                  </span>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-8">
                <div className="space-y-6">
                  {selectedThread.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.isYou ? "justify-end" : "justify-start"}`}
                    >
                      <div className={`max-w-[70%] ${msg.isYou ? "order-2" : ""}`}>
                        {/* Sender Info */}
                        <div className={`flex items-center gap-2 mb-2 ${msg.isYou ? "justify-end" : ""}`}>
                          <div
                            className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                              msg.isYou ? "bg-[#0b1f3a] text-white" : "bg-slate-200 text-slate-600"
                            }`}
                          >
                            {msg.from.split(" ").map((n) => n[0]).join("")}
                          </div>
                          <span className="text-sm font-medium text-slate-700">{msg.from}</span>
                          <span className="text-xs text-slate-400">{msg.fromRole}</span>
                        </div>

                        {/* Message Bubble */}
                        <div
                          className={`rounded-2xl px-5 py-4 ${
                            msg.isYou
                              ? "bg-[#0b1f3a] text-white rounded-tr-sm"
                              : "bg-white border border-slate-200 text-slate-700 rounded-tl-sm"
                          }`}
                        >
                          <p className="text-sm leading-relaxed">{msg.content}</p>
                        </div>

                        {/* Timestamp */}
                        <p className={`text-xs text-slate-400 mt-2 ${msg.isYou ? "text-right" : ""}`}>
                          {msg.timestamp}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reply Box */}
              {selectedThread.status === "open" && (
                <div className="bg-white border-t border-slate-200 p-6">
                  <div className="flex gap-4">
                    <div className="h-10 w-10 rounded-full bg-[#0b1f3a] flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                      SV
                    </div>
                    <div className="flex-1">
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Type your reply..."
                        rows={3}
                        className="w-full px-4 py-3 text-sm border border-slate-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-[#0b1f3a]/10 focus:border-[#0b1f3a]"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSendReply();
                          }
                        }}
                      />
                      <div className="flex items-center justify-between mt-3">
                        <p className="text-xs text-slate-400">
                          <Mail className="h-3 w-3 inline mr-1" />
                          Reply will be sent via email to {selectedThread.messages.find((m) => !m.isYou)?.from || "Data Officer"}
                        </p>
                        <button
                          onClick={handleSendReply}
                          disabled={!replyText.trim()}
                          className="flex items-center gap-2 h-10 px-5 text-sm font-medium text-white bg-[#0b1f3a] rounded-lg hover:bg-[#0b1f3a]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <Send className="h-4 w-4" /> Send Reply
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Mail className="h-16 w-16 text-slate-200 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900">Select a conversation</h3>
                <p className="text-sm text-slate-500 mt-1">Choose a thread from the left to view messages</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
