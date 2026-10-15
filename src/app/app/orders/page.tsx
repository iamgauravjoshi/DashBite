import { ShellPlaceholder } from "@/components/data/ShellPlaceholder";

export const metadata = { title: "Orders" };

export default function CustomerOrdersPage() {
  return (
    <ShellPlaceholder
      eyebrow="Customer · Orders"
      title="Orders"
      description="One-time orders with checkout, payment status, and tracking. Ordering and payment arrive with Phase 5."
      phase="Arrives in Phase 5"
    />
  );
}
