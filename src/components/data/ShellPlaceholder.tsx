import type { ReactNode } from "react";
import { Inbox } from "lucide-react";
import { EmptyBlock } from "@/components/data/StateBlock";
import { PageHeader } from "@/components/data/PageHeader";
import { Badge } from "@/components/ui/badge";

export function ShellPlaceholder({
  eyebrow,
  title,
  description,
  phase,
  icon = <Inbox />
}: {
  eyebrow: string;
  title: string;
  description: string;
  phase: string;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow={eyebrow} title={title} description={description} />
      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">{phase}</Badge>
        <Badge variant="outline">Shell preview — no data yet</Badge>
      </div>
      <EmptyBlock
        icon={icon}
        title="Nothing here yet"
        description="This workspace is structurally ready. Real records, actions, and policies land with the implementing phase — nothing on this screen is faked."
      />
    </div>
  );
}
