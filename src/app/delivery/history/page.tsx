import { PageHeader } from "@/components/data/PageHeader";
import { DeliveryHistory } from "@/components/delivery/DeliveryHistory";
import { requirePageAccess } from "@/lib/auth-guards";

export const metadata = { title: "History" };

export default async function DeliveryHistoryPage() {
  await requirePageAccess("/delivery/history");
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Delivery · History"
        title="History"
        description="Your completed handovers, reconciled against order records."
      />
      <DeliveryHistory />
    </div>
  );
}
