import Link from "next/link";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatINR } from "@/lib/menu-rules";

export async function PlansTeaser({ messId, slug }: { messId: string; slug: string }) {
  const plans = await db.subscriptionPlan.findMany({
    where: { messId, active: true },
    include: { slot: { select: { name: true, active: true } } },
    orderBy: { pricePaise: "asc" },
    take: 3
  });
  const live = plans.filter((p) => p.slot.active);
  if (live.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Subscriptions</CardTitle>
        <CardDescription>
          Counted meals with skip and pause control — from{" "}
          <span className="tnum">{formatINR(Math.min(...live.map((p) => p.pricePaise)))}</span>.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="mb-3 flex flex-col gap-1 text-sm text-muted-foreground">
          {live.map((p) => (
            <li key={p.id}>
              {p.name} · {p.mealsTotal} meals / {p.validityDays} days ·{" "}
              <span className="tnum">{formatINR(p.pricePaise)}</span>
            </li>
          ))}
        </ul>
        <Button render={<Link href={`/discover/${slug}/subscribe`} />}>View plans</Button>
      </CardContent>
    </Card>
  );
}
