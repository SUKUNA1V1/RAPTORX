import type { Decision } from "@/lib/types";
import { DECISION_COLORS } from "@/lib/constants";

export default function DecisionBadge({ decision }: { decision: Decision }) {
  return (
    <span
      className={`
      inline-flex items-center px-2.5 py-0.5 rounded-md
      text-xs font-medium border capitalize
      ${DECISION_COLORS[decision]}
    `}
    >
      {decision}
    </span>
  );
}
