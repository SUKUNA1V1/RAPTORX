export default function RiskBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = score < 0.3 ? "bg-green-500" : score < 0.6 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="flex items-center justify-center gap-2 w-full">
      <div className="w-24 sm:w-28 bg-slate-700 rounded-full h-1.5">
        <div className={`h-1.5 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-slate-400 text-xs w-9 text-center tabular-nums">{pct}%</span>
    </div>
  );
}
