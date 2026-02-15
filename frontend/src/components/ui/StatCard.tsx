import type { LucideIcon } from "lucide-react";

interface Props {
  label: string;
  value: number | string;
  icon: LucideIcon;
  iconBg: string;
  valueColor?: string;
  pulse?: boolean;
}

export default function StatCard({ label, value, icon: Icon, iconBg, valueColor, pulse }: Props) {
  return (
    <div className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-xl p-5 shadow-[0_18px_36px_rgba(0,0,0,0.3)]">
      <div className="flex items-center justify-between mb-3">
        <span className="text-slate-400 text-xs font-medium uppercase tracking-wide">{label}</span>
        {pulse && Number(value) > 0 && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
      </div>
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg}`}>
          <Icon size={18} className="text-white" />
        </div>
        <span className={`text-2xl font-bold ${valueColor || "text-white"}`}>{value}</span>
      </div>
    </div>
  );
}
