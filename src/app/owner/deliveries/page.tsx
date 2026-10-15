import { ShellPlaceholder } from "@/components/data/ShellPlaceholder";

export const metadata = { title: "Deliveries" };

export default function OwnerDeliveriesPage() {
  return (
    <ShellPlaceholder
      eyebrow="Owner · Deliveries"
      title="Deliveries"
      description="Assign self, staff, or agents. Track pickup, dispatch, completion, and failures. Arrives with Phase 8."
      phase="Arrives in Phase 8"
    />
  );
}
