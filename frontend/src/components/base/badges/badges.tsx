import type { ReactNode } from "react";

type BadgeWithDotProps = {
  children: ReactNode;
  color?: "success" | "warning" | "danger" | "neutral";
  type?: "modern" | "simple";
  size?: "sm" | "md";
};

const COLOR_MAP: Record<NonNullable<BadgeWithDotProps["color"]>, string> = {
  success: "bg-green-500 text-white",
  warning: "bg-yellow-500 text-black",
  danger: "bg-red-500 text-white",
  neutral: "bg-slate-500 text-white",
};

const DOT_MAP: Record<NonNullable<BadgeWithDotProps["color"]>, string> = {
  success: "bg-green-200",
  warning: "bg-yellow-200",
  danger: "bg-red-200",
  neutral: "bg-slate-200",
};

const SIZE_MAP: Record<NonNullable<BadgeWithDotProps["size"]>, string> = {
  sm: "text-[10px] px-2 py-1",
  md: "text-xs px-2.5 py-1",
};

export function BadgeWithDot({
  children,
  color = "neutral",
  size = "md",
}: BadgeWithDotProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold leading-none ${COLOR_MAP[color]} ${SIZE_MAP[size]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${DOT_MAP[color]}`} />
      {children}
    </span>
  );
}
