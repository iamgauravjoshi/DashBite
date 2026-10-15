import { ShellPlaceholder } from "@/components/data/ShellPlaceholder";

export const metadata = { title: "Orders" };

export default function OwnerOrdersPage() {
  return (
    <ShellPlaceholder
      eyebrow="Owner · Orders"
      title="Orders"
      description="The one-time order queue: confirm, track, and cancel per policy. Staff share this queue for their assignments. Arrives with Phase 5."
      phase="Arrives in Phase 5"
    />
  );
}
