import Link from "next/link";
import { Repeat2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/data/PageHeader";
import { StatusBadge } from "@/components/data/StatusBadge";
import { EmptyBlock } from "@/components/data/StateBlock";
import { requirePageAccess } from "@/lib/auth-guards";
import { subscriptionView } from "@/lib/subscriptions";
import { db } from "@/lib/db";

export const metadata = { title: "Subscriptions" };

export default async function CustomerSubscriptionsPage() {
  const user = await requirePageAccess("/app/subscriptions");
  const subs = await db.subscription.findMany({
    where: { customerId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50
  });
  const views = (await Promise.all(subs.map((s) => subscriptionView(s.id)))).filter(
    (v) => v !== null
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Customer · Subscriptions"
        title="Subscriptions"
        description="Remaining meals, validity, and what happens next — always computed from the same records as the kitchen."
      />
      {views.length === 0 ? (
        <EmptyBlock
          icon={<Repeat2 />}
          title="No subscriptions yet"
          description="Pick a verified kitchen, choose a plan, and your meals appear here with skip and pause controls."
          action={<Button render={<Link href="/discover" />}>Find a mess</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {views.map((view) => (
            <Card key={view.id}>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2">
                  {view.planName}
                  <StatusBadge status={view.status} />
                  {view.expiringSoon && <Badge>Expiring soon</Badge>}
                </CardTitle>
                <CardDescription>
                  {view.messName} · {view.slotName}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-2">
                <p className="tnum text-sm text-muted-foreground">
                  <span className="text-base font-semibold text-foreground">{view.remaining}</span>{" "}
                  of {view.mealsTotal} left · till {view.endDate}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  render={<Link href={`/app/subscriptions/${view.id}`} />}
                >
                  Manage
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
