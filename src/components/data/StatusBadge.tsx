import { Badge } from "@/components/ui/badge";

const toneForStatus: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  active: "default",
  approved: "default",
  confirmed: "default",
  completed: "default",
  published: "default",
  pending: "secondary",
  submitted: "secondary",
  paused: "secondary",
  draft: "outline",
  scheduled: "outline",
  skipped: "outline",
  suspended: "destructive",
  rejected: "destructive",
  failed: "destructive",
  cancelled: "destructive"
};

export function toneFor(status: string): "default" | "secondary" | "outline" | "destructive" {
  return toneForStatus[status.toLowerCase().replace(/[\s_]+/g, "")] ?? "outline";
}

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return <Badge variant={toneFor(status)}>{label ?? status}</Badge>;
}
