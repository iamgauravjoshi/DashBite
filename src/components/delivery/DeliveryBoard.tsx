"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
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
import { EmptyBlock, LoadingBlock } from "@/components/data/StateBlock";
import { FAILURE_REASONS } from "@/lib/fulfillment-rules";
import { formatINR } from "@/lib/menu-rules";

interface Parcel {
  id: string;
  method: string;
  status: string;
  assigneeType: string | null;
  order: {
    id: string;
    serviceDate: string;
    fulfillment: string;
    payablePaise: number;
    customer: { name: string };
    items: Array<{ name: string; qty: number }>;
  };
  assignee: { name: string; email: string } | null;
  attempts: Array<{ action: string; reason: string | null }>;
}

const BUCKETS: Array<{ key: string; title: string; hint: string; statuses: string[] }> = [
  {
    key: "assign",
    title: "Needs assignment",
    hint: "Confirmed deliveries with no rider yet.",
    statuses: ["READY"]
  },
  {
    key: "active",
    title: "On the road",
    hint: "Assigned and dispatched parcels.",
    statuses: ["ASSIGNED", "DISPATCHED"]
  },
  {
    key: "done",
    title: "Completed",
    hint: "Handed over and reconciled.",
    statuses: ["PICKED_UP", "DELIVERED"]
  }
];

export function DeliveryBoard({
  messes,
  selectedId,
  canAssign
}: {
  messes: Array<{ id: string; name: string }>;
  selectedId: string;
  canAssign: boolean;
}) {
  const router = useRouter();
  const [parcels, setParcels] = useState<Parcel[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [assignee, setAssignee] = useState("");
  const [assigneeType, setAssigneeType] = useState("AGENT");
  const [reason, setReason] = useState("CUSTOMER_UNAVAILABLE");
  const [note, setNote] = useState("");

  async function load() {
    const res = await fetch(`/api/messes/${selectedId}/fulfillment`, { cache: "no-store" });
    if (!res.ok) {
      setError("Could not load parcels.");
      return;
    }
    setParcels(((await res.json()) as { fulfillments: Parcel[] }).fulfillments);
  }

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/messes/${selectedId}/fulfillment`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("load");
        const body = (await res.json()) as { fulfillments: Parcel[] };
        if (!cancelled) setParcels(body.fulfillments);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load parcels.");
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  async function advance(parcel: Parcel, to: string, extra: Record<string, unknown> = {}) {
    setError(null);
    setPending(`${parcel.id}:${to}`);
    const res = await fetch(`/api/messes/${selectedId}/fulfillment/${parcel.id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ to, ...extra })
    });
    setPending(null);
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: { code?: string } } | null;
      setError(
        body?.error?.code === "ASSIGNEE_UNKNOWN"
          ? "No account uses that email."
          : body?.error?.code === "NOT_AGENT"
            ? "That account is not a delivery agent."
            : body?.error?.code === "STAFF_NOT_ASSIGNED"
              ? "That staff member is not assigned to this mess."
              : "Move failed. Reload and try again."
      );
      return;
    }
    await load();
  }

  async function fail(parcel: Parcel) {
    if (!reason) {
      setError("Pick a failure reason.");
      return;
    }
    setError(null);
    setPending(`${parcel.id}:fail`);
    const res = await fetch(`/api/messes/${selectedId}/fulfillment/${parcel.id}/fail`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reason, note: note.trim() || undefined })
    });
    setPending(null);
    if (!res.ok) {
      setError("Could not record. Reload and try again.");
      return;
    }
    setNote("");
    await load();
  }

  if (error && parcels === null) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Deliveries unavailable</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }
  if (parcels === null) return <LoadingBlock label="Loading parcels…" />;

  const byStatus = (statuses: string[]) => parcels.filter((p) => statuses.includes(p.status));
  const attention = parcels.filter(
    (p) =>
      (p.status === "ASSIGNED" || p.status === "DISPATCHED") &&
      p.attempts.filter((a) => a.action === "FAILED_ATTEMPT").length >= 2
  );

  function actions(parcel: Parcel) {
    const busy = pending !== null;
    const buttons = [];
    if (parcel.status === "PENDING") {
      buttons.push(
        <Button key="ready" size="sm" disabled={busy} onClick={() => void advance(parcel, "READY")}>
          Mark ready
        </Button>
      );
    }
    if (parcel.status === "READY" && parcel.method === "PICKUP") {
      buttons.push(
        <Button
          key="picked"
          size="sm"
          disabled={busy}
          onClick={() => void advance(parcel, "PICKED_UP")}
        >
          Confirm handover
        </Button>
      );
    }
    if (parcel.status === "DISPATCHED") {
      buttons.push(
        <Button
          key="delivered"
          size="sm"
          disabled={busy}
          onClick={() => void advance(parcel, "DELIVERED")}
        >
          Mark delivered
        </Button>
      );
    }
    return buttons;
  }

  function parcelCard(parcel: Parcel) {
    const failed = parcel.attempts.filter((a) => a.action === "FAILED_ATTEMPT").length;
    return (
      <Card key={parcel.id}>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            {parcel.order.customer.name}
            <StatusBadge status={parcel.status} />
            {failed >= 2 && <Badge variant="destructive">Needs review</Badge>}
          </CardTitle>
          <CardDescription>
            <span className="tnum">{parcel.order.serviceDate.slice(0, 10)}</span> ·{" "}
            {parcel.method === "DELIVERY" ? "Delivery" : "Pickup"} ·{" "}
            <span className="tnum">{formatINR(parcel.order.payablePaise)}</span>
            {parcel.assignee && (
              <>
                {" "}
                · {parcel.assignee.name} ({parcel.assigneeType?.toLowerCase()})
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <p className="text-muted-foreground">
            {parcel.order.items.map((i) => `${i.name} × ${i.qty}`).join(" · ")}
          </p>
          {failed > 0 && (
            <p className="text-muted-foreground">
              Failed attempts: {failed} —{" "}
              {parcel.attempts
                .filter((a) => a.action === "FAILED_ATTEMPT")
                .map((a) => a.reason)
                .join("; ")}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {actions(parcel)}
            {parcel.status === "READY" && parcel.method === "DELIVERY" && canAssign && (
              <Dialog>
                <DialogTrigger
                  render={
                    <Button size="sm" variant="outline">
                      Assign rider
                    </Button>
                  }
                />
                <DialogContent aria-describedby={undefined}>
                  <DialogHeader>
                    <DialogTitle>Assign this parcel</DialogTitle>
                    <DialogDescription>
                      Staff must already be assigned to this mess; agents need a verified delivery
                      account.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex flex-col gap-3">
                    <Field>
                      <FieldLabel htmlFor={`asg-type-${parcel.id}`}>Assign to</FieldLabel>
                      <select
                        id={`asg-type-${parcel.id}`}
                        value={assigneeType}
                        onChange={(e) => setAssigneeType(e.target.value)}
                        className="h-9 rounded-lg border border-input bg-transparent px-2 text-sm"
                      >
                        <option value="SELF">Myself (owner)</option>
                        <option value="STAFF">Staff member</option>
                        <option value="AGENT">Delivery agent</option>
                      </select>
                    </Field>
                    {assigneeType !== "SELF" && (
                      <Field>
                        <FieldLabel htmlFor={`asg-email-${parcel.id}`}>Account email</FieldLabel>
                        <Input
                          id={`asg-email-${parcel.id}`}
                          type="email"
                          value={assignee}
                          onChange={(e) => setAssignee(e.target.value)}
                          placeholder="rider@example.com"
                        />
                      </Field>
                    )}
                  </div>
                  <DialogFooter>
                    <Button
                      disabled={pending !== null}
                      onClick={() =>
                        void advance(parcel, "ASSIGNED", {
                          assigneeType,
                          ...(assigneeType === "SELF" ? {} : { assigneeEmail: assignee })
                        })
                      }
                    >
                      {pending && <Spinner data-icon="inline-start" />}
                      Assign
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
            {(parcel.status === "ASSIGNED" || parcel.status === "DISPATCHED") && (
              <Dialog>
                <DialogTrigger
                  render={
                    <Button size="sm" variant="ghost">
                      Record failed attempt
                    </Button>
                  }
                />
                <DialogContent aria-describedby={undefined}>
                  <DialogHeader>
                    <DialogTitle>What went wrong?</DialogTitle>
                    <DialogDescription>
                      The parcel stays actionable — this log is what the owner reviews.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex flex-col gap-3">
                    <Field>
                      <FieldLabel htmlFor={`fail-${parcel.id}`}>Reason</FieldLabel>
                      <select
                        id={`fail-${parcel.id}`}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="h-9 rounded-lg border border-input bg-transparent px-2 text-sm"
                      >
                        {FAILURE_REASONS.map((r) => (
                          <option key={r} value={r}>
                            {r.toLowerCase().replace(/_/g, " ")}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor={`note-${parcel.id}`}>
                        Note{" "}
                        <span className="font-normal text-muted-foreground">
                          (required for “other”)
                        </span>
                      </FieldLabel>
                      <Input
                        id={`note-${parcel.id}`}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Gate locked, guard called…"
                      />
                    </Field>
                  </div>
                  <DialogFooter>
                    <Button disabled={pending !== null} onClick={() => void fail(parcel)}>
                      Record attempt
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
          {pending?.startsWith(parcel.id) && <Spinner data-icon="inline-start" />}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Choose mess">
        {messes.map((m) => (
          <Button
            key={m.id}
            variant={m.id === selectedId ? "default" : "outline"}
            size="sm"
            onClick={() => router.push(`/owner/deliveries?mess=${m.id}`)}
          >
            {m.name}
          </Button>
        ))}
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Action failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {attention.length > 0 && (
        <Alert variant="destructive">
          <AlertTitle>
            {attention.length} parcel{attention.length === 1 ? "" : "s"} need review
          </AlertTitle>
          <AlertDescription>
            Two or more failed attempts. Reassign, contact the customer via support (Phase 9), or
            cancel with a refund.
          </AlertDescription>
        </Alert>
      )}
      {parcels.filter((p) => p.status === "PENDING").length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              Freshly confirmed · {parcels.filter((p) => p.status === "PENDING").length}
            </CardTitle>
            <CardDescription>Mark packed parcels ready.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 lg:grid-cols-2">
            {byStatus(["PENDING"]).map(parcelCard)}
          </CardContent>
        </Card>
      )}
      {BUCKETS.map((bucket) => {
        const rows = byStatus(bucket.statuses);
        if (rows.length === 0) return null;
        return (
          <div key={bucket.key} className="flex flex-col gap-3">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">{bucket.title}</h2>
              <p className="text-sm text-muted-foreground">{bucket.hint}</p>
            </div>
            <div className="grid gap-3 lg:grid-cols-2">{rows.map(parcelCard)}</div>
          </div>
        );
      })}
      {parcels.length === 0 && (
        <EmptyBlock
          title="No parcels yet"
          description="Confirmed orders appear here for packing, assignment, and handover."
        />
      )}
    </div>
  );
}
