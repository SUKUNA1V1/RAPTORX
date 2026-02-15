"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ScrollText,
  AlertTriangle,
  Users,
  DoorOpen,
  TestTube2,
  Bot,
  Shield,
} from "lucide-react";

const NAV = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/logs", icon: ScrollText, label: "Access Logs" },
  { href: "/alerts", icon: AlertTriangle, label: "Alerts", badge: 3 },
  { href: "/users", icon: Users, label: "Users" },
  { href: "/access-points", icon: DoorOpen, label: "Access Points" },
  { href: "/simulator", icon: TestTube2, label: "Simulator" },
  { href: "/ml-status", icon: Bot, label: "ML Status" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 min-w-[240px] bg-[color:var(--surface)] border-r border-[color:var(--border)] flex flex-col h-screen shadow-[0_24px_60px_rgba(0,0,0,0.45)]">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-[color:var(--border)]">
        <div className="w-9 h-9 bg-[color:var(--accent)] rounded-lg flex items-center justify-center flex-shrink-0 shadow-[0_0_18px_rgba(46,211,255,0.45)]">
          <Shield size={18} className="text-white" />
        </div>
        <div>
          <h1 className="font-bold text-white text-lg leading-none">RaptorX</h1>
          <p className="text-[color:var(--muted)] text-xs mt-0.5">Security Console</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV.map(({ href, icon: Icon, label, badge }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`
                flex items-center gap-3 px-4 py-2.5 rounded-lg
                text-sm font-semibold transition-all duration-150
                border border-transparent
                ${
                  active
                    ? "bg-[color:var(--accent-ghost)] text-white border-[color:var(--accent)]/55 shadow-[0_10px_20px_rgba(0,0,0,0.25),inset_0_0_14px_rgba(46,211,255,0.25)]"
                    : "text-[color:var(--muted)] bg-[color:var(--surface-2)]/40 hover:bg-[color:var(--surface-2)] hover:text-white"
                }
              `}
            >
              <Icon size={17} className="flex-shrink-0" />
              <span className="flex-1">{label}</span>
              {badge ? (
                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="px-6 py-4 border-t border-[color:var(--border)]">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[color:var(--muted)] text-xs">System Online</span>
        </div>
        <p className="text-[color:var(--muted)] text-xs">v1.0.0 - RaptorX AI</p>
      </div>
    </aside>
  );
}
