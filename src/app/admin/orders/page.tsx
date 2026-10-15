import { ShellPlaceholder } from "@/components/data/ShellPlaceholder";

export const metadata = { title: "Orders" };

export default function AdminOrdersPage() {
  return (
    <ShellPlaceholder
      eyebrow="Admin · Orders"
      title="Orders"
      description="Marketplace-wide orders for oversight and dispute handling. Arrives with Phases 5 and 10."
      phase="Arrives in Phase 5 + 10"
    />
  );
}
