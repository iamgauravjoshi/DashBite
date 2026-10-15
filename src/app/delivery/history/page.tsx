import { ShellPlaceholder } from "@/components/data/ShellPlaceholder";

export const metadata = { title: "History" };

export default function DeliveryHistoryPage() {
  return (
    <ShellPlaceholder
      eyebrow="Delivery · History"
      title="History"
      description="Completed deliveries with timestamps and completion records. Arrives with Phase 8."
      phase="Arrives in Phase 8"
    />
  );
}
