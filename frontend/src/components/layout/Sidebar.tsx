"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { NavItemDividerType, NavItemType } from "@/components/application/app-navigation/config";
import { SidebarNavigationSectionDividers } from "@/components/application/app-navigation/sidebar-navigation/sidebar-section-dividers";
import { getOverview } from "@/lib/api";
import {
  LayoutDashboard,
  ScrollText,
  AlertTriangle,
  Users,
  DoorOpen,
  TestTube2,
  Bot,
  Activity,
  Brain,
} from "lucide-react";

const buildNavItems = (activeAlerts: number | null): (NavItemType | NavItemDividerType)[] => [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Access Logs", href: "/logs", icon: ScrollText },
  {
    label: "Alerts",
    href: "/alerts",
    icon: AlertTriangle,
    badge: activeAlerts && activeAlerts > 0 ? activeAlerts : undefined,
  },
  { label: "Users", href: "/users", icon: Users },
  { label: "Access Points", href: "/access-points", icon: DoorOpen },
  { divider: true },
  { label: "Simulator", href: "/simulator", icon: TestTube2 },
  { label: "ML Status", href: "/ml-status", icon: Bot },
  { label: "Explainability", href: "/explainability", icon: Brain },
  { label: "Performance", href: "/performance", icon: Activity },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [activeAlerts, setActiveAlerts] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadActiveAlerts = async () => {
      try {
        const overview = await getOverview();
        if (!cancelled) {
          setActiveAlerts(overview.active_alerts_count);
        }
      } catch {
        if (!cancelled) {
          setActiveAlerts(null);
        }
      }
    };

    loadActiveAlerts();
    const id = setInterval(loadActiveAlerts, 60000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const navItemsWithDividers = buildNavItems(activeAlerts);

  return (
    <aside className="w-60 min-w-[240px] bg-[color:var(--surface)] border-r border-[color:var(--border)] flex flex-col h-screen shadow-[0_24px_60px_rgba(0,0,0,0.45)]">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-[color:var(--border)]">
        <div>
          <h1 className="font-aretha italic font-bold text-white text-lg leading-none">RAPTOR X</h1>
          <p className="text-[color:var(--muted)] text-xs mt-0.5">Security Console</p>
        </div>
      </div>

      <SidebarNavigationSectionDividers activeUrl={pathname} items={navItemsWithDividers} />

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
