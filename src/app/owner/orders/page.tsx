import Link from "next/link";
import { Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/data/PageHeader";
import { EmptyBlock } from "@/components/data/StateBlock";
import { OrderQueue } from "@/components/order/OrderQueue";
import { requireUsableAccount } from "@/lib/auth-guards";
import { listOwnerMesses, listStaffMesses } from "@/lib/messes";

export const metadata = { title: "Orders" };

export default async function OwnerOrdersPage({
  searchParams
}: {
  searchParams: Promise<{ mess?: string }>;
}) {
  const user = await requireUsableAccount("/owner/orders");
  if (user.role !== "MESS_OWNER" && user.role !== "MESS_STAFF") {
    const { redirect } = await import("next/navigation");
    redirect("/forbidden");
  }
  const { mess: messParam } = await searchParams;
  const messes =
    user.role === "MESS_OWNER" ? await listOwnerMesses(user.id) : await listStaffMesses(user.id);
  if (messes.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          eyebrow="Owner · Orders"
          title="Orders"
          description="No kitchen assigned yet."
        />
        <EmptyBlock
          icon={<Store />}
          title={user.role === "MESS_STAFF" ? "No assignment yet" : "No mess registered"}
          description={
            user.role === "MESS_STAFF"
              ? "Ask a mess owner to assign you from their settings."
              : "Register your mess to start receiving orders."
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
        eyebrow="Owner · Orders"
        title="Orders"
        description="Confirmed queue first, every status filterable."
      />
      <OrderQueue
        messes={messes.map((m) => ({ id: m.id, name: m.name }))}
        selectedId={selected.id}
      />
    </div>
  );
}
