import { Inbox } from "lucide-react";
import { db } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/data/PageHeader";
import { StatusBadge } from "@/components/data/StatusBadge";
import { EmptyBlock } from "@/components/data/StateBlock";
import { DecisionButtons } from "@/components/admin/DecisionButtons";
import { requirePageAccess } from "@/lib/auth-guards";

export const metadata = { title: "Verifications" };

export default async function AdminVerificationsPage() {
  await requirePageAccess("/admin/verifications");
  const queue = await db.mess.findMany({
    where: { verificationStatus: { in: ["SUBMITTED", "UNDER_REVIEW"] } },
    include: { owner: { select: { name: true, email: true } } },
    orderBy: { submittedAt: "asc" }
  });
  const recent = await db.mess.findMany({
    where: { verificationStatus: { in: ["APPROVED", "REJECTED", "SUSPENDED"] } },
    include: { owner: { select: { name: true, email: true } } },
    orderBy: { decidedAt: "desc" },
    take: 10
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Admin · Verifications"
        title="Verifications"
        description="Oldest submissions first. Every decision records actor, timestamp, and reason."
      />
      {queue.length === 0 ? (
        <EmptyBlock
          icon={<Inbox />}
          title="Queue is clear"
          description="New submissions from mess owners will appear here oldest-first."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {queue.map((mess) => (
            <Card key={mess.id}>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2">
                  {mess.name}
                  <StatusBadge status={mess.verificationStatus} />
                </CardTitle>
                <CardDescription>
                  {mess.locality}, {mess.city} · {mess.owner.name} ({mess.owner.email}) ·{" "}
                  {mess.vegType.toLowerCase().replace("_", "-")} ·{" "}
                  {mess.pickupAllowed && mess.deliveryAllowed
                    ? "pickup + delivery"
                    : mess.pickupAllowed
                      ? "pickup only"
                      : "delivery only"}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {mess.description && (
                  <p className="text-sm text-muted-foreground">{mess.description}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Serves: {mess.serviceAreas.join(", ") || "—"} · {mess.opensAt}–{mess.closesAt} ·{" "}
                  {mess.phone}
                </p>
                <DecisionButtons messId={mess.id} status={mess.verificationStatus} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {recent.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold tracking-tight">Recently decided</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {recent.map((mess) => (
              <Card key={mess.id}>
                <CardHeader>
                  <CardTitle className="flex flex-wrap items-center gap-2">
                    {mess.name}
                    <StatusBadge status={mess.verificationStatus} />
                  </CardTitle>
                  <CardDescription>
                    {mess.locality}, {mess.city} · {mess.owner.email}
                    {mess.verificationReason ? ` · “${mess.verificationReason}”` : ""}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DecisionButtons messId={mess.id} status={mess.verificationStatus} />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
