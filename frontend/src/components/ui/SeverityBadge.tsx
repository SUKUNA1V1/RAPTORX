import type { AlertSeverity } from "@/lib/types";
import { SEVERITY_COLORS } from "@/lib/constants";

export default function SeverityBadge({ severity }: { severity: AlertSeverity }) {
  return (
    <span
      className={`
      inline-flex items-center px-2.5 py-0.5 rounded-md
      text-xs font-medium border capitalize
      ${SEVERITY_COLORS[severity]}
    `}
    >
      {severity}
    </span>
  );
}
