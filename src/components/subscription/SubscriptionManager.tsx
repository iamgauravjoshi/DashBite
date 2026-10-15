"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/data/StatusBadge";
import { formatINR } from "@/lib/menu-rules";

export interface ManagerView {
  id: string;
  messId: string;
  messName: string;
  planName: string;
  slotId: string;
  slotName: string;
  status: string;
  startDate: string;
  endDate: string;
  mealsTotal: number;
  used: number;
  remaining: number;
  upcoming: string[];
  cutoffTime: string;
  pricePaise: number;
  expiringSoon: boolean;
  skips: Array<{ date: string; reason: string | null }>;
  pauses: Array<{ start: string; end: string | null; extensionDays: number }>;
  adjustments: Array<{
    kind: string;
    reason: string;
    days: number | null;
    meals: number | null;
    at: string;
  }>;
}

async function post(path: string, body: unknown) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = (await res.json().catch(() => null)) as {
    error?: { code?: string; date?: string };
  } | null;
  return { res, data };
}

export function SubscriptionManager({ initial }: { initial: ManagerView }) {
  const router = useRouter();
  const [view, setView] = useState<ManagerView>(initial);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch(`/api/subscriptions/${view.id}`, { cache: "no-store" });
    if (!res.ok) return;
    const body = (await res.json()) as { subscription: ManagerView };
    setView(body.subscription);
    setSelected({});
  }

  async function skip(dates: string[]) {
    setError(null);
    setPending("skip");
    const { res, data } = await post(`/api/subscriptions/${view.id}/skip`, { dates });
    setPending(null);
    if (!res.ok) {
      setError(
        data?.error?.code === "CUTOFF_PASSED"
          ? `Past the ${view.cutoffTime} IST cutoff — this one stays on the plan.`
          : data?.error?.code === "ALREADY_SKIPPED"
            ? "Already skipped."
            : "Could not skip. Reload and try again."
      );
      return;
    }
    await refresh();
    router.refresh();
  }

  async function pause() {
    setError(null);
    setPending("pause");
    const { res } = await post(`/api/subscriptions/${view.id}/pause`, {});
    setPending(null);
    if (!res.ok) {
      setError("Could not pause. It may already be paused or ending.");
      return;
    }
    await refresh();
  }

  async function resume() {
    setError(null);
    setPending("resume");
    const { res } = await post(`/api/subscriptions/${view.id}/resume`, {});
    setPending(null);
    if (!res.ok) {
      setError("Could not resume. Reload and try again.");
      return;
    }
    await refresh();
  }

  async function cancel() {
    setError(null);
    setPending("cancel");
    const { res } = await post(`/api/subscriptions/${view.id}/cancel`, {});
    setPending(null);
    if (!res.ok) {
      setError("Could not cancel. Reload and try again.");
      return;
    }
    await refresh();
  }

  async function renew() {
    setError(null);
    setPending("renew");
    const res = await fetch(`/api/subscriptions/${view.id}/renew`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({})
    });
    const body = (await res.json().catch(() => null)) as {
      subscriptionId?: string;
      provider?: string;
    } | null;
    setPending(null);
    if (!res.ok || !body?.subscriptionId) {
      setError("Could not start renewal. Reload and try again.");
      return;
    }
    if (body.provider === "RAZORPAY") {
      setError("Renewal created — complete payment from your subscriptions list.");
      return;
    }
    router.push(`/order/mock-pay?subscription=${body.subscriptionId}`);
  }

  const live = view.status === "ACTIVE" || view.status === "PAUSED";
  const picked = Object.keys(selected).filter((d) => selected[d]);
  const skipped = new Set(view.skips.map((s) => s.date));

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            Balance
            <StatusBadge status={view.status} />
            {view.expiringSoon && <Badge>Expiring soon</Badge>}
          </CardTitle>
          <CardDescription>
            <span className="tnum">
              {view.startDate} → {view.endDate}
            </span>{" "}
            · cutoff <span className="tnum">{view.cutoffTime}</span> IST · paid{" "}
            <span className="tnum">{formatINR(view.pricePaise)}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="tnum text-2xl font-semibold">
            {view.remaining}{" "}
            <span className="text-sm font-normal text-muted-foreground">
              of {view.mealsTotal} left
            </span>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {view.used} served so far
            {view.status === "CANCELLED" ? " · cancelled — balance forfeited" : ""}.
          </p>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Action failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {live && (
        <Card>
          <CardHeader>
            <CardTitle>Upcoming meals</CardTitle>
            <CardDescription>
              Tick dates to skip them together — skipped meals stay usable until {view.endDate}.
              Skips close at the {view.cutoffTime} IST cutoff.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {view.upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing scheduled.</p>
            ) : (
              <>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {view.upcoming.slice(0, 14).map((date) => (
                    <li
                      key={date}
                      className="flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm"
                    >
                      <Checkbox
                        id={`skip-${date}`}
                        checked={Boolean(selected[date])}
                        onCheckedChange={(v) =>
                          setSelected((prev) => ({ ...prev, [date]: v === true }))
                        }
                      />
                      <Label htmlFor={`skip-${date}`} className="tnum">
                        {date}
                      </Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-auto"
                        disabled={pending !== null}
                        onClick={() => void skip([date])}
                      >
                        Skip
                      </Button>
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    disabled={picked.length === 0 || pending !== null}
                    onClick={() => void skip(picked)}
                  >
                    {pending === "skip" && <Spinner data-icon="inline-start" />}
                    Skip {picked.length > 0 ? `${picked.length} selected` : "selected"}
                  </Button>
                </div>
              </>
            )}
            {view.skips.length > 0 && (
              <p className="text-sm text-muted-foreground">
                Skipped: {view.skips.map((s) => s.date).join(", ")}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {live && (
        <Card>
          <CardHeader>
            <CardTitle>Pause or end</CardTitle>
            <CardDescription>
              Pause starts tomorrow and extends validity by paused service days — never a cash
              refund. Cancelling forfeits the balance with no refund.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {view.status === "ACTIVE" ? (
              <Button variant="outline" disabled={pending !== null} onClick={() => void pause()}>
                {pending === "pause" && <Spinner data-icon="inline-start" />}
                Pause from tomorrow
              </Button>
            ) : (
              <Button variant="outline" disabled={pending !== null} onClick={() => void resume()}>
                {pending === "resume" && <Spinner data-icon="inline-start" />}
                Resume now
              </Button>
            )}
            <Dialog>
              <DialogTrigger
                render={
                  <Button variant="ghost" size="sm">
                    Cancel plan
                  </Button>
                }
              />
              <DialogContent aria-describedby={undefined}>
                <DialogHeader>
                  <DialogTitle>Cancel this plan?</DialogTitle>
                  <DialogDescription>
                    {view.remaining} meals will be forfeited with no cash refund. This cannot be
                    undone — renew afterwards if you change your mind.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    variant="outline"
                    disabled={pending !== null}
                    onClick={() => void cancel()}
                  >
                    {pending === "cancel" && <Spinner data-icon="inline-start" />}
                    Yes, forfeit {view.remaining} meals
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            {(view.expiringSoon || view.status === "EXPIRED" || view.status === "COMPLETED") && (
              <Button disabled={pending !== null} onClick={() => void renew()}>
                {pending === "renew" && <Spinner data-icon="inline-start" />}
                Renew plan
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {!live && view.status !== "PENDING_PAYMENT" && (
        <Card>
          <CardHeader>
            <CardTitle>Renew</CardTitle>
            <CardDescription>Start a fresh plan chained after this one.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button disabled={pending !== null} onClick={() => void renew()}>
              {pending === "renew" && <Spinner data-icon="inline-start" />}
              Renew plan
            </Button>
          </CardContent>
        </Card>
      )}

      {view.status === "PENDING_PAYMENT" && (
        <Card>
          <CardHeader>
            <CardTitle>Payment pending</CardTitle>
            <CardDescription>Complete payment to activate your meals.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button render={<Link href={`/order/mock-pay?subscription=${view.id}`} />}>
              Continue to payment
            </Button>
          </CardContent>
        </Card>
      )}

      {(view.pauses.length > 0 || view.adjustments.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>History</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
            {view.pauses.map((p, i) => (
              <p key={i}>
                Paused {p.start} → {p.end ?? "open"} (+{p.extensionDays} days validity)
              </p>
            ))}
            {view.adjustments.map((a, i) => (
              <p key={i}>
                {a.kind === "EXTEND_VALIDITY"
                  ? `Extended ${a.days} days`
                  : `Added ${a.meals} meals`}
                : {a.reason}
              </p>
            ))}
          </CardContent>
        </Card>
      )}
      <Separator />
    </div>
  );
}
