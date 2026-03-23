"use client";

import Link from "next/link";
import type { NavItemDividerType, NavItemType } from "@/components/application/app-navigation/config";

type Props = {
  activeUrl: string;
  items: (NavItemType | NavItemDividerType)[];
};

const isDivider = (item: NavItemType | NavItemDividerType): item is NavItemDividerType => {
  return "divider" in item && item.divider === true;
};

const isActive = (href: string, activeUrl: string) => {
  if (href === "/") {
    return activeUrl === "/";
  }
  return activeUrl === href || activeUrl.startsWith(`${href}/`);
};

export function SidebarNavigationSectionDividers({ activeUrl, items }: Props) {
  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4">
      <div className="space-y-1">
        {items.map((item, index) => {
          if (isDivider(item)) {
            return <div key={`divider-${index}`} className="my-3 border-t border-[color:var(--border)]" />;
          }

          const Icon = item.icon;
          const active = isActive(item.href, activeUrl);

          return (
            <div key={`${item.href}-${item.label}`} className="space-y-1">
              <Link
                href={item.href}
                target={item.href.startsWith("http") ? "_blank" : undefined}
                rel={item.href.startsWith("http") ? "noreferrer" : undefined}
                className={`flex items-center gap-3 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-all duration-150 ${
                  active
                    ? "border-[color:var(--accent)]/55 bg-[color:var(--accent-ghost)] text-white"
                    : "border-transparent bg-[color:var(--surface-2)]/40 text-[color:var(--muted)] hover:bg-[color:var(--surface-2)] hover:text-white"
                }`}
              >
                {Icon ? <Icon className="h-4 w-4 flex-shrink-0" /> : null}
                <span className="flex-1">{item.label}</span>
                {typeof item.badge === "number" ? (
                  <span className="rounded-full bg-slate-700 px-2 py-0.5 text-[10px] font-bold text-slate-100">
                    {item.badge}
                  </span>
                ) : (
                  item.badge
                )}
              </Link>

              {item.items?.length ? (
                <div className="ml-7 space-y-1 border-l border-[color:var(--border)] pl-3">
                  {item.items.map((subItem) => {
                    const subActive = isActive(subItem.href, activeUrl);
                    return (
                      <Link
                        key={subItem.href}
                        href={subItem.href}
                        className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs transition-colors ${
                          subActive
                            ? "bg-[color:var(--accent-ghost)] text-white"
                            : "text-[color:var(--muted)] hover:bg-[color:var(--surface-2)] hover:text-white"
                        }`}
                      >
                        <span className="flex-1">{subItem.label}</span>
                        {typeof subItem.badge === "number" ? (
                          <span className="rounded-full bg-slate-700 px-1.5 py-0.5 text-[10px] font-semibold text-slate-100">
                            {subItem.badge}
                          </span>
                        ) : null}
                      </Link>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
