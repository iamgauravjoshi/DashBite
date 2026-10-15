import { notFound } from "next/navigation";
import { PageHeader } from "@/components/data/PageHeader";
import { SubscriptionManager } from "@/components/subscription/SubscriptionManager";
import { requirePageAccess } from "@/lib/auth-guards";
import { subscriptionAccess, subscriptionView } from "@/lib/subscriptions";
import { db } from "@/lib/db";

export const metadata = { title: "Subscription" };

export default async function CustomerSubscriptionDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requirePageAccess(`/app/subscriptions/${id}`);
  if (!(await subscriptionAccess(id, user.id, user.role))) notFound();
  const mine = await db.subscription.findUnique({ where: { id } });
  if (!mine || mine.customerId !== user.id) notFound();
  const view = await subscriptionView(id);
  if (!view) notFound();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Customer · Subscription"
        title={view.planName}
        description={`${view.messName} · ${view.slotName}`}
      />
      <SubscriptionManager initial={JSON.parse(JSON.stringify(view))} />
    </div>
  );
}
