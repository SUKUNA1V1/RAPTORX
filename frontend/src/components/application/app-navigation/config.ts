import type { ComponentType, ReactNode } from "react";

export type NavItemSubItemType = {
  label: string;
  href: string;
  badge?: number;
};

export type NavItemType = {
  label: string;
  href: string;
  icon?: ComponentType<{ className?: string }>;
  items?: NavItemSubItemType[];
  badge?: number | ReactNode;
};

export type NavItemDividerType = {
  divider: true;
};
