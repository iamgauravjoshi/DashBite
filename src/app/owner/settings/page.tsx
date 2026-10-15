import Link from "next/link";
import { Plus, Store } from "lucide-react";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/data/PageHeader";
import { StatusBadge } from "@/components/data/StatusBadge";
import { EmptyBlock } from "@/components/data/StateBlock";
import { MessEditor } from "@/components/mess/MessEditor";
import { FulfillmentCard } from "@/components/mess/FulfillmentCard";
import { StaffManager } from "@/components/mess/StaffManager";
import { requirePageAccess } from "@/lib/auth-guards";
import type { MessFormValues } from "@/components/mess/MessForm";

export const metadata = { title: "Settings" };

export default async function OwnerSettingsPage({
  searchParams
}: {
  searchParams: Promise<{ mess?: string }>;
}) {
  const user = await requirePageAccess("/owner/settings");
  const { mess: messParam } = await searchParams;
  const messes = await db.mess.findMany({
    where: { ownerId: user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      staff: { include: { user: { select: { id: true, name: true, email: true } } } }
    }
  });

  if (messes.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          eyebrow="Owner · Settings"
          title="Settings"
          description="Register your first mess to unlock the profile editor."
        />
        <EmptyBlock
          icon={<Store />}
          title="No mess registered"
          description="Registration takes a few minutes and saves as a private draft. Submit it for review when ready."
          action={
            <Button render={<Link href="/owner/messes/new" />}>
              <Plus data-icon="inline-start" />
              Register your mess
            </Button>
          }
        />
      </div>
    );
  }

  const selected = messes.find((m) => m.id === messParam) ?? messes[0];
  const events = await db.messVerificationEvent.findMany({
    where: { messId: selected.id },
    orderBy: { createdAt: "desc" },
    take: 20
  });

  const initial: MessFormValues = {
    name: selected.name,
    description: selected.description ?? "",
    phone: selected.phone,
    line1: selected.line1,
    locality: selected.locality,
    city: selected.city,
    state: selected.state,
    pincode: selected.pincode,
    vegType: selected.vegType as MessFormValues["vegType"],
    pickupAllowed: selected.pickupAllowed,
    deliveryAllowed: selected.deliveryAllowed,
    deliveryNote: selected.deliveryNote ?? "",
    areasText: selected.serviceAreas.join(", "),
    operatingDays: selected.operatingDays,
    opensAt: selected.opensAt,
    closesAt: selected.closesAt
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Owner · Settings"
        title="Mess profile"
        description="Maintain the listing customers will see. Verification and publication stay separate: approval never auto-publishes."
        actions={
          <Button variant="outline" render={<Link href="/owner/messes/new" />}>
            <Plus data-icon="inline-start" />
            New mess
          </Button>
        }
      />
      {messes.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Your messes</CardTitle>
            <CardDescription>Pick which listing you are editing.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {messes.map((m) => (
                <Button
                  key={m.id}
                  variant={m.id === selected.id ? "default" : "outline"}
                  size="sm"
                  render={<Link href={`/owner/settings?mess=${m.id}`} />}
                >
                  {m.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      <MessEditor
        mess={JSON.parse(
          JSON.stringify({
            id: selected.id,
            name: selected.name,
            verificationStatus: selected.verificationStatus,
            published: selected.published,
            verificationReason: selected.verificationReason,
            submittedAt: selected.submittedAt,
            decidedAt: selected.decidedAt
          })
        )}
        events={JSON.parse(JSON.stringify(events))}
        initial={initial}
      />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Verification
            <StatusBadge status={selected.verificationStatus} />
          </CardTitle>
          <CardDescription>
            Submitted{" "}
            {selected.submittedAt ? new Date(selected.submittedAt).toLocaleString("en-IN") : "—"}
            {selected.decidedAt
              ? ` · decided ${new Date(selected.decidedAt).toLocaleString("en-IN")}`
              : ""}
          </CardDescription>
        </CardHeader>
      </Card>
      <StaffManager
        messId={selected.id}
        initial={selected.staff.map((s) => ({ userId: s.userId, user: s.user }))}
      />
      <FulfillmentCard
        messId={selected.id}
        initial={{
          deliveryFeePaise: selected.deliveryFeePaise,
          pickupAllowed: selected.pickupAllowed,
          deliveryAllowed: selected.deliveryAllowed,
          deliveryNote: selected.deliveryNote
        }}
      />
    </div>
  );
}
