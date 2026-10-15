import { Store } from "lucide-react";
import Link from "next/link";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/data/PageHeader";
import { EmptyBlock } from "@/components/data/StateBlock";
import { SubscriberBoard } from "@/components/mess/SubscriberBoard";
import { PlansManager } from "@/components/mess/PlansManager";
import { requirePageAccess } from "@/lib/auth-guards";

export const metadata = { title: "Subscribers" };

export default async function OwnerSubscribersPage({
  searchParams
}: {
  searchParams: Promise<{ mess?: string }>;
}) {
  const user = await requirePageAccess("/owner/subscribers");
  const { mess: messParam } = await searchParams;
  const messes = await db.mess.findMany({
    where: { ownerId: user.id },
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true }
  });
  if (messes.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          eyebrow="Owner · Subscribers"
          title="Subscribers"
          description="Plans, subscriber states, and upcoming demand."
        />
        <EmptyBlock
          icon={<Store />}
          title="No mess registered"
          description="Register your mess to sell subscriptions."
          action={<Button render={<Link href="/owner/messes/new" />}>Register your mess</Button>}
        />
      </div>
    );
  }
  const selected = messes.find((m) => m.id === messParam) ?? messes[0];
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Owner · Subscribers"
        title="Subscribers"
        description="Live plans, who holds them, and how many meals each coming day needs."
      />
      <SubscriberBoard messes={messes} selectedId={selected.id} />
      <PlansManager messId={selected.id} key={`plans-${selected.id}`} />
    </div>
  );
}
