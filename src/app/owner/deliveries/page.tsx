import { PackageSearch } from "lucide-react";
import Link from "next/link";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/data/PageHeader";
import { EmptyBlock } from "@/components/data/StateBlock";
import { DeliveryBoard } from "@/components/delivery/DeliveryBoard";
import { requireUsableAccount } from "@/lib/auth-guards";
import { redirect } from "next/navigation";

export const metadata = { title: "Deliveries" };

export default async function OwnerDeliveriesPage({
  searchParams
}: {
  searchParams: Promise<{ mess?: string }>;
}) {
  const user = await requireUsableAccount("/owner/deliveries");
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
          eyebrow="Owner · Deliveries"
          title="Deliveries"
          description="Handover operations."
        />
        <EmptyBlock
          icon={<PackageSearch />}
          title={user.role === "MESS_STAFF" ? "No assignment yet" : "No mess registered"}
          description={
            user.role === "MESS_STAFF"
              ? "Ask a mess owner to assign you."
              : "Register your mess to manage deliveries."
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
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Owner · Deliveries"
        title="Deliveries"
        description="Ready parcels, assignments, failed attempts, and completions — every move audited."
      />
      <DeliveryBoard
        key={selected.id}
        messes={messes}
        selectedId={selected.id}
        canAssign={user.role === "MESS_OWNER"}
      />
    </div>
  );
}
