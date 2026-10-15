import Link from "next/link";
import { Store } from "lucide-react";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/data/PageHeader";
import { EmptyBlock } from "@/components/data/StateBlock";
import { KitchenBoard } from "@/components/kitchen/KitchenBoard";
import { requireUsableAccount } from "@/lib/auth-guards";
import { redirect } from "next/navigation";

export const metadata = { title: "Kitchen" };

export default async function OwnerKitchenPage({
  searchParams
}: {
  searchParams: Promise<{ mess?: string }>;
}) {
  const user = await requireUsableAccount("/owner/kitchen");
  if (user.role !== "MESS_OWNER" && user.role !== "MESS_STAFF") redirect("/forbidden");
  const { mess: messParam } = await searchParams;
  const messes =
    user.role === "MESS_OWNER"
      ? await db.mess.findMany({
          where: { ownerId: user.id },
          orderBy: { updatedAt: "desc" },
          select: { id: true, name: true }
        })
      : (
          await db.messStaff.findMany({
            where: { userId: user.id },
            include: { mess: { select: { id: true, name: true } } },
            orderBy: { createdAt: "asc" }
          })
        ).map((r) => r.mess);
  if (messes.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          eyebrow="Owner · Kitchen"
          title="Kitchen"
          description="Daily preparation sheets."
        />
        <EmptyBlock
          icon={<Store />}
          title={user.role === "MESS_STAFF" ? "No assignment yet" : "No mess registered"}
          description={
            user.role === "MESS_STAFF"
              ? "Ask a mess owner to assign you."
              : "Register your mess to plan production."
          }
          action={
            user.role === "MESS_OWNER" ? (
              <Button render={<Link href="/owner/messes/new" />}>Register your mess</Button>
            ) : undefined
          }
        />
      </div>
    );
  }
  const selected = messes.find((m) => m.id === messParam) ?? messes[0];
  const slots = await db.menuSlot.findMany({
    where: { messId: selected.id, active: true },
    orderBy: { sortOrder: "asc" }
  });
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Owner · Kitchen"
        title="Kitchen"
        description="Confirmed orders plus committed subscriber meals. Pending payments stay out of the counts."
      />
      <KitchenBoard
        key={selected.id}
        messes={messes}
        selectedId={selected.id}
        slots={slots.map((s) => ({ id: s.id, name: s.name }))}
      />
    </div>
  );
}
