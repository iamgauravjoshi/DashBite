"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { formatINR } from "@/lib/menu-rules";

interface Plan {
  id: string;
  name: string;
  description: string | null;
  slotName: string;
  cutoffTime: string;
  mealsTotal: number;
  validityDays: number;
  pricePaise: number;
}

export function SubscribePanel({ slug, plans }: { slug: string; plans: Plan[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string>(plans[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const plan = plans.find((p) => p.id === selected);

  async function subscribe() {
    if (!plan) return;
    setError(null);
    setPending(true);
    const res = await fetch("/api/subscriptions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ planId: plan.id })
    });
    const body = (await res.json().catch(() => null)) as {
      subscriptionId?: string;
      provider?: string;
      error?: { code?: string };
    } | null;
    if (res.status === 401) {
      router.push(`/sign-in?next=${encodeURIComponent(`/discover/${slug}/subscribe`)}`);
      return;
    }
    setPending(false);
    if (!res.ok || !body?.subscriptionId) {
      setError(
        body?.error?.code === "PLAN_UNAVAILABLE"
          ? "This plan just went off sale. Pick another."
          : "Could not start the subscription. Reload and try again."
      );
      return;
    }
    if (body.provider === "RAZORPAY") {
      setError("Subscription created — complete payment from your subscriptions list.");
      return;
    }
    router.push(`/order/mock-pay?subscription=${body.subscriptionId}`);
  }

  if (plans.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No plans on sale</CardTitle>
          <CardDescription>This kitchen has not published subscription plans yet.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {plans.map((p) => (
          <Card
            key={p.id}
            className={p.id === selected ? "ring-2 ring-primary" : undefined}
            aria-current={p.id === selected}
          >
            <CardHeader>
              <CardTitle>{p.name}</CardTitle>
              <CardDescription>
                {p.slotName} · cutoff <span className="tnum">{p.cutoffTime}</span> IST
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {p.description && <p className="text-sm text-muted-foreground">{p.description}</p>}
              <p className="tnum text-sm">
                {p.mealsTotal} meals / {p.validityDays} days ·{" "}
                <span className="text-base font-semibold">{formatINR(p.pricePaise)}</span>
              </p>
              <Button
                variant={p.id === selected ? "default" : "outline"}
                size="sm"
                onClick={() => setSelected(p.id)}
              >
                {p.id === selected ? "Selected" : "Choose"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      {plan && (
        <Card>
          <CardHeader>
            <CardTitle>What you are agreeing to</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <ul className="flex list-disc flex-col gap-1.5 pl-5 text-muted-foreground">
              <li>
                {plan.mealsTotal} {plan.slotName.toLowerCase()} meals usable over{" "}
                {plan.validityDays} days starting today.
              </li>
              <li>
                Skip any day before the {plan.cutoffTime} IST cutoff — skipped meals stay usable.
              </li>
              <li>Pause starts tomorrow and extends validity by paused days. No cash value.</li>
              <li>Cancelling forfeits the balance with no cash refund.</li>
            </ul>
            {error && (
              <Alert variant="destructive">
                <AlertTitle>Could not subscribe</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div>
              <Button disabled={pending} onClick={() => void subscribe()}>
                {pending && <Spinner data-icon="inline-start" />}
                {pending ? "Starting…" : `Subscribe · ${formatINR(plan.pricePaise)}`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
