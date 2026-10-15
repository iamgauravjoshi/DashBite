"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

export function MockPayPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order") ?? "";
  const subscriptionId = searchParams.get("subscription") ?? "";
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<"capture" | "fail" | null>(null);
  const doneHref = orderId ? `/app/orders/${orderId}` : `/app/subscriptions/${subscriptionId}`;

  async function act(action: "capture" | "fail") {
    setError(null);
    setPending(action);
    const res = await fetch("/api/payments/mock", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        orderId: orderId || undefined,
        subscriptionId: subscriptionId || undefined,
        action
      })
    });
    const body = (await res.json().catch(() => null)) as { outcome?: string } | null;
    setPending(null);
    if (!res.ok) {
      setError("Payment simulator failed. Try again or pick another meal.");
      return;
    }
    if (body?.outcome === "SOLD_OUT") {
      router.push(orderId ? `/app/orders/${orderId}?notice=soldout` : "/app/subscriptions");
      return;
    }
    router.push(doneHref);
  }

  if (!orderId && !subscriptionId) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Order missing</AlertTitle>
        <AlertDescription>Start again from the kitchen menu.</AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Test payment</CardTitle>
        <CardDescription>
          Sandbox stand-in for Razorpay: no real money moves. Capture succeeds only if the kitchen
          still has room; otherwise the order cancels cleanly.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Simulation failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <Button disabled={pending !== null} onClick={() => void act("capture")}>
          {pending === "capture" && <Spinner data-icon="inline-start" />}
          Simulate successful payment
        </Button>
        <Button variant="outline" disabled={pending !== null} onClick={() => void act("fail")}>
          {pending === "fail" && <Spinner data-icon="inline-start" />}
          Simulate failed payment
        </Button>
        <Button variant="ghost" render={<Link href={doneHref} />}>
          Skip to status
        </Button>
      </CardContent>
    </Card>
  );
}
