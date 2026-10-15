import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/data/PageHeader";
import { SubscribePanel } from "@/components/subscription/SubscribePanel";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const mess = await db.mess.findUnique({ where: { slug }, select: { name: true } });
  return { title: mess ? `Subscribe · ${mess.name}` : "Subscribe" };
}

export default async function SubscribePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const mess = await db.mess.findUnique({ where: { slug } });
  if (!mess || mess.verificationStatus !== "APPROVED" || !mess.published) notFound();
  const plans = await db.subscriptionPlan.findMany({
    where: { messId: mess.id, active: true },
    include: { slot: { select: { name: true, cutoffTime: true, active: true } } },
    orderBy: { pricePaise: "asc" }
  });
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 md:px-6">
      <PageHeader
        eyebrow="Subscription"
        title={mess.name}
        description="One plan, counted meals, full control to skip and pause."
      />
      <SubscribePanel
        slug={slug}
        plans={plans
          .filter((p) => p.slot.active)
          .map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            slotName: p.slot.name,
            cutoffTime: p.slot.cutoffTime,
            mealsTotal: p.mealsTotal,
            validityDays: p.validityDays,
            pricePaise: p.pricePaise
          }))}
      />
    </div>
  );
}
