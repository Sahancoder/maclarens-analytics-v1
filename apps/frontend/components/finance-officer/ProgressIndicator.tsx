"use client";

import { Check } from "lucide-react";

interface ProgressItem {
  label: string;
  isComplete: boolean;
  isAutoCalculated?: boolean;
}

interface ProgressIndicatorProps {
  items: ProgressItem[];
}

export function ProgressIndicator({ items }: ProgressIndicatorProps) {
  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div
          key={index}
          className={`flex items-center gap-3 transition-all duration-300 ${
            item.isComplete ? "opacity-100" : "opacity-60"
          }`}
        >
          <div
            className={`h-5 w-5 rounded-full flex items-center justify-center transition-all duration-300 ${
              item.isComplete
                ? "bg-green-500 scale-100"
                : "bg-slate-300 scale-90"
            }`}
          >
            {item.isComplete && (
              <Check className="h-3 w-3 text-white animate-in zoom-in duration-200" />
            )}
          </div>
          <span
            className={`text-sm transition-colors duration-300 ${
              item.isComplete ? "text-slate-800" : "text-slate-500"
            } ${item.isAutoCalculated ? "italic" : ""}`}
          >
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}
