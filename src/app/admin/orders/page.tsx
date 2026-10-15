import { ShellPlaceholder } from "@/components/data/ShellPlaceholder";

export const metadata = { title: "Orders" };

export default function AdminOrdersPage() {
  return (
    <ShellPlaceholder
      eyebrow="Admin · Orders"
      title="Orders"
      description="Marketplace-wide orders for oversight and dispute handling. Owner queues are live in Phase 5; the admin overview arrives with Phase 10 reporting."
      phase="Arrives in Phase 10"
    />
  );
}
