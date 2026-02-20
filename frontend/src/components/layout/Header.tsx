"use client";

import { useState, useEffect } from "react";
import { Bell } from "lucide-react";

export default function Header() {
  const [time, setTime] = useState<Date | null>(null);
  const [online, setOnline] = useState(true);
  const [mlMode, setMlMode] = useState("ensemble");

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    fetch((process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000") + "/api/ml/status", {
      signal: AbortSignal.timeout(3000),
    })
      .then((r) => r.json())
      .then((d) => {
        setOnline(true);
        setMlMode(d.mode);
      })
      .catch(() => setOnline(false));
  }, []);

  return (
    <header className="h-16 min-h-[64px] bg-[color:var(--surface)] border-b border-[color:var(--border)] flex items-center justify-between px-6 flex-shrink-0 shadow-[0_14px_40px_rgba(0,0,0,0.35)]">
      <div>
        <p className="text-slate-400 text-sm">
          {time
            ? time.toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })
            : "Loading date"}
        </p>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          {online ? (
            <>
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-green-400 text-xs font-medium">
                {mlMode === "ensemble" ? "Ensemble Active" : "AI Active"}
              </span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-amber-400 text-xs font-medium">Demo Mode</span>
            </>
          )}
        </div>

        <span className="font-mono text-sm text-slate-300">
          {time
            ? time.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })
            : "--:--:--"}
        </span>

        <button className="relative p-2 rounded-lg bg-[color:var(--surface-2)] hover:bg-[color:var(--accent-ghost)] transition-colors shadow-[0_0_14px_rgba(46,211,255,0.15)]">
          <Bell size={16} className="text-slate-400" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>
      </div>
    </header>
  );
}
