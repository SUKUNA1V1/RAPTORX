"use client";

import { useState, useEffect } from "react";

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
    <header className="relative h-16 min-h-[64px] bg-[color:var(--surface)] border-b border-[color:var(--border)] flex items-center justify-between px-6 flex-shrink-0 shadow-[0_14px_40px_rgba(0,0,0,0.35)]">
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

      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 pointer-events-none">
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

      <div className="flex items-center gap-4">
        <span className="font-mono text-sm text-slate-300">
          {time
            ? time.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })
            : "--:--:--"}
        </span>
      </div>
    </header>
  );
}
