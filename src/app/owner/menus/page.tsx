import Link from "next/link";
import { Store } from "lucide-react";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/data/PageHeader";
import { EmptyBlock } from "@/components/data/StateBlock";
import { MenuConsole } from "@/components/mess/MenuConsole";
import { requirePageAccess } from "@/lib/auth-guards";

export const metadata = { title: "Menus" };

export default async function OwnerMenusPage({
  searchParams
}: {
  searchParams: Promise<{ mess?: string }>;
}) {
  const user = await requirePageAccess("/owner/menus");
  const { mess: messParam } = await searchParams;
  const messes = await db.mess.findMany({
    where: { ownerId: user.id },
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, verificationStatus: true }
  });
  if (messes.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader eyebrow="Owner · Menus" title="Menus" description="Register a mess first." />
        <EmptyBlock
          icon={<Store />}
          title="No mess registered"
          description="Menus belong to a mess. Register yours first, then plan slots, items, and schedules."
          action={<Button render={<Link href="/owner/messes/new" />}>Register your mess</Button>}
        />
      </div>
    );
  }
  const selected = messes.find((m) => m.id === messParam) ?? messes[0];
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Owner · Menus"
        title="Menus"
        description="Slots, items, weekly plans, date changes, and holidays. Catalog edits never rewrite existing date snapshots."
      />
      <MenuConsole messes={messes} selectedId={selected.id} />
    </div>
  );
}
