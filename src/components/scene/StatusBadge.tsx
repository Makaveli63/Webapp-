import { Badge } from "@/components/ui/Badge";
import { STATUS_META } from "@/data/scene-status";
import type { ExploitStatus } from "@/types";

export function StatusBadge({ status }: { status: ExploitStatus }) {
  const meta = STATUS_META[status];
  return (
    <Badge className={meta.className}>
      <span title={meta.description}>{meta.label}</span>
    </Badge>
  );
}
