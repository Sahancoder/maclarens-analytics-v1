"use client";

import { useState } from "react";
import { Send, Mail, FileText, ChevronDown, ChevronUp } from "lucide-react";

interface EmailThread {
  id: string;
  subject: string;
  company: string;
  month: string;
  status: "open" | "resolved";
  messages: Message[];
}

interface Message {
  id: string;
  from: string;
  fromRole: string;
  to: string;
  content: string;
  timestamp: string;
  isYou: boolean;
}

const emailThreads: EmailThread[] = [
  {
    id: "1",
    subject: "Report Rejection - Admin Expenses Clarification",
    company: "GAC Shipping Limited",
    month: "November 2025",
    status: "open",
    messages: [
      {
        id: "1a",
        from: "Sahan Viranga",
        fromRole: "Company Director",
        to: "Sahan Hettiarachchi",
        content: "The admin expenses seem incorrect. Please verify the figures for November. The variance is too high compared to the budget. Also, please check the depreciation calculation as it doesn't match with the asset register.",
        timestamp: "Dec 22, 2025 at 10:30 AM",
        isYou: false,
      },
      {
        id: "1b",
        from: "Sahan Hettiarachchi",
        fromRole: "Data Officer",
        to: "Sahan Viranga",
        content: "Thank you for the feedback. I've reviewed the admin expenses and found that there was an additional one-time expense for office renovation that wasn't in the original budget. I'll update the report with proper notes.",
        timestamp: "Dec 22, 2025 at 2:15 PM",
        isYou: true,
      },
      {
        id: "1c",
        from: "Sahan Viranga",
        fromRole: "Company Director",
        to: "Sahan Hettiarachchi",
        content: "Please also include the supporting documents for the renovation expense. Once updated, resubmit the report for approval.",
        timestamp: "Dec 22, 2025 at 3:45 PM",
        isYou: false,
      },
    ],
  },
  {
    id: "2",
    subject: "Exchange Rate Clarification",
    company: "Spectra Logistics",
    month: "November 2025",
    status: "open",
    messages: [
      {
        id: "2a",
        from: "Sahan Viranga",
        fromRole: "Company Director",
        to: "Sahan Hettiarachchi",
        content: "Please clarify the exchange loss calculation. The rate used seems different from the central bank rate.",
        timestamp: "Dec 20, 2025 at 9:00 AM",
        isYou: false,
      },
    ],
  },
  {
    id: "3",
    subject: "Report Approved - October 2025",
    company: "McLarens Maritime Academy",
    month: "October 2025",
    status: "resolved",
    messages: [
      {
        id: "3a",
        from: "Sahan Viranga",
        fromRole: "Company Director",
        to: "Sahan Hettiarachchi",
        content: "Great work on the October report. All figures are accurate and well documented. Approved.",
        timestamp: "Dec 18, 2025 at 11:00 AM",
        isYou: false,
      },
      {
        id: "3b",
        from: "Sahan Hettiarachchi",
        fromRole: "Data Officer",
        to: "Sahan Viranga",
        content: "Thank you for the approval. I'll continue to maintain the same standards for future reports.",
        timestamp: "Dec 18, 2025 at 11:30 AM",
        isYou: true,
      },
    ],
  },
];

export default function CommentsPage() {
  const [threads] = useState(emailThreads);
  const [expandedThread, setExpandedThread] = useState<string | null>("1");
  const [replyText, setReplyText] = useState("");
  const [filter, setFilter] = useState<"all" | "open" | "resolved">("all");

  const filteredThreads = threads.filter((t) => {
    if (filter === "all") return true;
    return t.status === filter;
  });

  const handleSendReply = (threadId: string) => {
    if (!replyText.trim()) return;
    alert(`Reply sent: "${replyText}"`);
    setReplyText("");
  };

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Comments</h1>
            <p className="text-sm text-slate-500 mt-1">Email conversations with Company Director</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-slate-200 px-6 py-3">
        <div className="flex gap-1 p-1 bg-slate-100 rounded-lg w-fit">
          {["all", "open", "resolved"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as typeof filter)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all capitalize ${
                filter === f ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Threads List */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl space-y-4">
          {filteredThreads.map((thread) => (
            <div key={thread.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              {/* Thread Header */}
              <button
                onClick={() => setExpandedThread(expandedThread === thread.id ? null : thread.id)}
                className="w-full p-4 flex items-start gap-4 hover:bg-slate-50 transition-colors"
              >
                <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  thread.status === "open" ? "bg-amber-100" : "bg-emerald-100"
                }`}>
                  <Mail className={`h-5 w-5 ${thread.status === "open" ? "text-amber-600" : "text-emerald-600"}`} />
                </div>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">{thread.subject}</h3>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                      thread.status === "open" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                    }`}>
                      {thread.status}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 mt-1">
                    <FileText className="h-3.5 w-3.5 inline mr-1" />
                    {thread.company} - {thread.month}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">{thread.messages.length} messages</p>
                </div>
                {expandedThread === thread.id ? (
                  <ChevronUp className="h-5 w-5 text-slate-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-slate-400" />
                )}
              </button>

              {/* Expanded Messages */}
              {expandedThread === thread.id && (
                <div className="border-t border-slate-200">
                  {/* Messages */}
                  <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
                    {thread.messages.map((msg) => (
                      <div key={msg.id} className={`flex ${msg.isYou ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[80%] ${msg.isYou ? "order-2" : ""}`}>
                          <div className={`rounded-xl p-4 ${
                            msg.isYou ? "bg-[#0b1f3a] text-white" : "bg-slate-100 text-slate-800"
                          }`}>
                            <p className="text-sm leading-relaxed">{msg.content}</p>
                          </div>
                          <div className={`flex items-center gap-2 mt-1.5 ${msg.isYou ? "justify-end" : ""}`}>
                            <span className="text-xs text-slate-500">{msg.from}</span>
                            <span className="text-xs text-slate-400">• {msg.timestamp}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Reply Box */}
                  {thread.status === "open" && (
                    <div className="p-4 border-t border-slate-200 bg-slate-50">
                      <div className="flex gap-3">
                        <input
                          type="text"
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Type your reply..."
                          className="flex-1 h-10 px-4 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0b1f3a]/10 focus:border-[#0b1f3a]"
                          onKeyDown={(e) => e.key === "Enter" && handleSendReply(thread.id)}
                        />
                        <button
                          onClick={() => handleSendReply(thread.id)}
                          disabled={!replyText.trim()}
                          className="h-10 px-4 bg-[#0b1f3a] text-white rounded-lg hover:bg-[#0b1f3a]/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          <Send className="h-4 w-4" /> Send
                        </button>
                      </div>
                      <p className="text-xs text-slate-400 mt-2">
                        This reply will be sent via email to the Company Director
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {filteredThreads.length === 0 && (
            <div className="text-center py-16">
              <Mail className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">No conversations to show</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
