"use client";

import { useState } from "react";
import { Download, Lock, MessageSquare, Calendar, FileText } from "lucide-react";

// Board report data
const boardReports = [
  { id: "1", period: "October 2025", status: "draft", lastUpdated: "Dec 23, 2025", author: "CEO", locked: false },
  { id: "2", period: "September 2025", status: "approved", lastUpdated: "Nov 15, 2025", author: "CEO", locked: true },
  { id: "3", period: "August 2025", status: "approved", lastUpdated: "Oct 12, 2025", author: "CEO", locked: true },
  { id: "4", period: "Q2 2025", status: "approved", lastUpdated: "Aug 5, 2025", author: "CEO", locked: true },
  { id: "5", period: "Q1 2025", status: "approved", lastUpdated: "May 10, 2025", author: "CEO", locked: true },
];

// CEO Commentary
const ceoCommentary = [
  { id: "1", period: "October 2025", text: "Group performance remains strong despite headwinds in Bunkering segment. Lube 01 continues to exceed expectations with MLL-Automotive leading growth.", date: "Dec 23, 2025", locked: false },
  { id: "2", period: "September 2025", text: "Shipping Services showing robust recovery. GAC Group maintaining steady performance. Focus areas: Lube 02 restructuring and Bunkering strategic review.", date: "Nov 15, 2025", locked: true },
];

// Key highlights for board
const keyHighlights = [
  { metric: "Group PBT", value: "LKR 847.5M", change: "+8.4%", status: "positive" },
  { metric: "YTD Achievement", value: "92.5%", change: "-7.5pp", status: "warning" },
  { metric: "Top Performer", value: "Lube 01", change: "+11.9%", status: "positive" },
  { metric: "Risk Cluster", value: "Bunkering", change: "-325%", status: "critical" },
];

export default function BoardViewPage() {
  const [selectedReport, setSelectedReport] = useState(boardReports[0]);
  const [commentary, setCommentary] = useState(ceoCommentary[0]?.text || "");
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="min-h-full bg-slate-50">
      <div className="max-w-[1400px] mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Board View</h1>
            <p className="text-sm text-slate-500 mt-1">Board-ready reports and CEO commentary</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 h-10 px-4 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">
              <Download className="h-4 w-4" /> Export PDF
            </button>
            <button className="flex items-center gap-2 h-10 px-4 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">
              <Download className="h-4 w-4" /> Export Excel
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-5">
            {/* Key Highlights */}
            <div className="bg-white rounded-lg border border-slate-200 p-5">
              <h3 className="text-base font-semibold text-slate-900 mb-4">Key Highlights - {selectedReport.period}</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {keyHighlights.map((item) => (
                  <div key={item.metric} className={`p-4 rounded-lg border ${
                    item.status === "positive" ? "bg-emerald-50 border-emerald-200" :
                    item.status === "warning" ? "bg-amber-50 border-amber-200" :
                    "bg-red-50 border-red-200"
                  }`}>
                    <p className="text-xs text-slate-600 mb-1">{item.metric}</p>
                    <p className={`text-lg font-bold ${
                      item.status === "positive" ? "text-emerald-700" :
                      item.status === "warning" ? "text-amber-700" :
                      "text-red-700"
                    }`}>
                      {item.value}
                    </p>
                    <p className={`text-xs font-medium mt-1 ${
                      item.status === "positive" ? "text-emerald-600" :
                      item.status === "warning" ? "text-amber-600" :
                      "text-red-600"
                    }`}>
                      {item.change}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* CEO Commentary */}
            <div className="bg-white rounded-lg border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-slate-900">CEO Commentary</h3>
                {!selectedReport.locked && (
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="text-sm text-[#0b1f3a] hover:underline"
                  >
                    {isEditing ? "Cancel" : "Edit"}
                  </button>
                )}
                {selectedReport.locked && (
                  <span className="flex items-center gap-1 text-xs text-slate-500">
                    <Lock className="h-3 w-3" /> Locked
                  </span>
                )}
              </div>
              
              {isEditing ? (
                <div className="space-y-3">
                  <textarea
                    value={commentary}
                    onChange={(e) => setCommentary(e.target.value)}
                    className="w-full h-32 p-3 text-sm border border-slate-300 rounded-lg resize-none focus:outline-none focus:border-[#0b1f3a]"
                    placeholder="Enter CEO commentary for board review..."
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setIsEditing(false)}
                      className="h-9 px-4 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="h-9 px-4 text-sm font-medium text-white bg-[#0b1f3a] rounded-lg hover:bg-[#0b1f3a]/90"
                    >
                      Save Commentary
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-700 leading-relaxed">{commentary}</p>
                  <p className="text-xs text-slate-400 mt-3">Last updated: {ceoCommentary[0]?.date}</p>
                </div>
              )}
            </div>

            {/* Board Summary Table */}
            <div className="bg-white rounded-lg border border-slate-200 p-5">
              <h3 className="text-base font-semibold text-slate-900 mb-4">Cluster Performance Summary</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Cluster</th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-700">Month PBT</th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-700">YTD PBT</th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-700">Ach %</th>
                      <th className="px-4 py-3 text-center font-semibold text-slate-700">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { name: "Liner", month: 125800, ytd: 1258000, ach: 103.2, status: "on-track" },
                      { name: "Shipping Services", month: 97000, ytd: 970000, ach: 108.9, status: "exceeding" },
                      { name: "GAC Group", month: 109700, ytd: 1097000, ach: 99.7, status: "on-track" },
                      { name: "Lube 01", month: 114600, ytd: 1146000, ach: 111.9, status: "exceeding" },
                      { name: "Bunkering", month: -45000, ytd: -450000, ach: -225, status: "critical" },
                    ].map((row) => (
                      <tr key={row.name} className="border-b border-slate-100">
                        <td className="px-4 py-3 font-medium text-slate-800">{row.name}</td>
                        <td className={`px-4 py-3 text-right ${row.month >= 0 ? "text-slate-700" : "text-red-600"}`}>
                          {row.month.toLocaleString()}
                        </td>
                        <td className={`px-4 py-3 text-right ${row.ytd >= 0 ? "text-slate-700" : "text-red-600"}`}>
                          {row.ytd.toLocaleString()}
                        </td>
                        <td className={`px-4 py-3 text-right font-medium ${row.ach >= 100 ? "text-emerald-600" : row.ach >= 90 ? "text-amber-600" : "text-red-600"}`}>
                          {row.ach}%
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 text-xs font-medium rounded ${
                            row.status === "exceeding" ? "bg-emerald-100 text-emerald-700" :
                            row.status === "on-track" ? "bg-blue-100 text-blue-700" :
                            "bg-red-100 text-red-700"
                          }`}>
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Sidebar - Report History */}
          <div className="space-y-5">
            <div className="bg-white rounded-lg border border-slate-200 p-5">
              <h3 className="text-base font-semibold text-slate-900 mb-4">Report History</h3>
              <div className="space-y-3">
                {boardReports.map((report) => (
                  <div
                    key={report.id}
                    onClick={() => setSelectedReport(report)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedReport.id === report.id
                        ? "border-[#0b1f3a] bg-[#0b1f3a]/5"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-slate-800">{report.period}</p>
                      {report.locked && <Lock className="h-3 w-3 text-slate-400" />}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        report.status === "approved" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                      }`}>
                        {report.status}
                      </span>
                      <span className="text-xs text-slate-400">{report.lastUpdated}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-lg border border-slate-200 p-5">
              <h3 className="text-base font-semibold text-slate-900 mb-4">Actions</h3>
              <div className="space-y-2">
                <button className="w-full flex items-center gap-2 h-10 px-4 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200">
                  <Lock className="h-4 w-4" /> Lock for Board Review
                </button>
                <button className="w-full flex items-center gap-2 h-10 px-4 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200">
                  <MessageSquare className="h-4 w-4" /> Add Annotation
                </button>
                <button className="w-full flex items-center gap-2 h-10 px-4 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200">
                  <Calendar className="h-4 w-4" /> Schedule Review
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
