"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { LoadingBlock } from "@/components/data/StateBlock";
import { formatINR } from "@/lib/menu-rules";
import { todayInTz } from "@/lib/ist";

interface SheetView {
  sheet: { id: string; status: string; finalizedAt: string | null } | null;
  menu: {
    status: string;
    closedReason?: string | null;
    slotName: string;
    cutoffTime: string;
    capacity: number | null;
  } | null;
  date: string;
  slotId: string;
  oneTime: Array<{ itemId: string; name: string; vegType: string; qty: number }>;
  oneTimeTotal: number;
  subscribers: number;
  adjustments: Array<{
    id: string;
    itemLabel: string;
    qtyDelta: number;
    reason: string;
    at: string;
  }>;
  adjustmentTotal: number;
  prepTotal: number;
  packing: Array<{
    orderId: string;
    shortId: string;
    customer: string;
    fulfillment: string;
    address: string | null;
    items: Array<{ name: string; qty: number }>;
    totalQty: number;
  }>;
  pending: Array<{ orderId: string; customer: string; qty: number; totalPaise: number }>;
  exceptions: Array<{
    orderId: string;
    customer: string;
    status: string;
    reason: string | null;
    at: string;
  }>;
  lateChanges: Array<{ kind: string; ref: string; detail: string; at: string }>;
}

export function KitchenBoard({
  messes,
  selectedId,
  slots
}: {
  messes: Array<{ id: string; name: string }>;
  selectedId: string;
  slots: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [date, setDate] = useState(() => todayInTz());
  const [slotId, setSlotId] = useState(slots[0]?.id ?? "");
  const [view, setView] = useState<SheetView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [itemLabel, setItemLabel] = useState("");
  const [qtyDelta, setQtyDelta] = useState("");
  const [reason, setReason] = useState("");

  async function load(messId: string, d: string, s: string) {
    if (!s) {
      setView(null);
      return;
    }
    const res = await fetch(`/api/messes/${messId}/kitchen?slotId=${s}&date=${d}`, {
      cache: "no-store"
    });
    if (!res.ok) {
      setError("Could not load the sheet.");
      return;
    }
    setView(((await res.json()) as { sheet: SheetView }).sheet);
  }

  useEffect(() => {
    if (!slotId) return;
    let cancelled = false;
    fetch(`/api/messes/${selectedId}/kitchen?slotId=${slotId}&date=${date}`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("load");
        const body = (await res.json()) as { sheet: SheetView };
        if (!cancelled) setView(body.sheet);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load the sheet.");
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  async function refresh() {
    setError(null);
    await load(selectedId, date, slotId);
  }

  async function finalize() {
    setPending(true);
    const res = await fetch(`/api/messes/${selectedId}/kitchen/finalize`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slotId, date })
    });
    setPending(false);
    if (!res.ok) setError("Could not finalize.");
    await refresh();
  }

  async function adjust(event: React.FormEvent) {
    event.preventDefault();
    const delta = Number(qtyDelta);
    if (!itemLabel.trim() || !Number.isInteger(delta) || delta === 0 || reason.trim().length < 3) {
      setError("Say what, how many (non-zero), and why (3+ chars).");
      return;
    }
    setError(null);
    setPending(true);
    const res = await fetch(`/api/messes/${selectedId}/kitchen/adjust`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        slotId,
        date,
        itemLabel: itemLabel.trim(),
        qtyDelta: delta,
        reason: reason.trim()
      })
    });
    setPending(false);
    if (!res.ok) {
      setError("Could not record the adjustment.");
      return;
    }
    setItemLabel("");
    setQtyDelta("");
    setReason("");
    await refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Choose mess">
        {messes.map((m) => (
          <Button
            key={m.id}
            variant={m.id === selectedId ? "default" : "outline"}
            size="sm"
            onClick={() => router.push(`/owner/kitchen?mess=${m.id}`)}
          >
            {m.name}
          </Button>
        ))}
      </div>
      <form
        className="flex flex-wrap items-end gap-3"
        aria-label="Choose date and slot"
        onSubmit={(e) => {
          e.preventDefault();
          setView(null);
          void load(selectedId, date, slotId);
        }}
      >
        <Field>
          <FieldLabel htmlFor="kb-date">Service date</FieldLabel>
          <Input
            id="kb-date"
            type="date"
            value={date}
            onChange={(e) => e.target.value && setDate(e.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="kb-slot">Slot</FieldLabel>
          <select
            id="kb-slot"
            value={slotId}
            onChange={(e) => setSlotId(e.target.value)}
            className="h-9 rounded-lg border border-input bg-transparent px-2 text-sm"
          >
            {slots.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
        <Button type="submit" variant="outline">
          Load sheet
        </Button>
        {view?.sheet?.status === "FINALIZED" ? (
          <Badge>Finalized {view.sheet.finalizedAt?.slice(0, 16).replace("T", " ")}</Badge>
        ) : (
          <Button type="button" disabled={pending || !view} onClick={() => void finalize()}>
            {pending && <Spinner data-icon="inline-start" />}
            Finalize counts
          </Button>
        )}
      </form>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Kitchen unavailable</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {!view ? (
        <LoadingBlock label="Loading sheet…" />
      ) : (
        <>
          {view.menu?.status === "closed" && (
            <Alert>
              <AlertTitle>Kitchen closed this date</AlertTitle>
              <AlertDescription>
                Committed orders below still stand and must be honored. Subscriber demand stops.
              </AlertDescription>
            </Alert>
          )}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>
                  Prep sheet · <span className="tnum">{view.prepTotal}</span> portions
                </CardTitle>
                <CardDescription>
                  {view.oneTimeTotal} one-time + {view.subscribers} subscriber
                  {view.adjustmentTotal !== 0 && (
                    <>
                      {" "}
                      <span className="tnum">
                        ({view.adjustmentTotal > 0 ? "+" : ""}
                        {view.adjustmentTotal} adjusted)
                      </span>
                    </>
                  )}{" "}
                  · cutoff <span className="tnum">{view.menu?.cutoffTime}</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                {view.oneTime.length === 0 && view.subscribers === 0 ? (
                  <p className="text-sm text-muted-foreground">Nothing committed yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {view.oneTime.map((line) => (
                        <TableRow key={line.itemId}>
                          <TableCell className="font-medium">{line.name}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {line.vegType === "VEG"
                              ? "Veg"
                              : line.vegType === "NON_VEG"
                                ? "Non-veg"
                                : "—"}
                          </TableCell>
                          <TableCell className="tnum text-right">{line.qty}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell className="font-medium">Subscriber portions</TableCell>
                        <TableCell className="text-muted-foreground">slot menu</TableCell>
                        <TableCell className="tnum text-right">{view.subscribers}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                )}
                {view.adjustments.length > 0 && (
                  <div className="mt-3 flex flex-col gap-1 text-sm">
                    {view.adjustments.map((a) => (
                      <p key={a.id} className="text-muted-foreground">
                        {a.qtyDelta > 0 ? "+" : ""}
                        <span className="tnum">{a.qtyDelta}</span> {a.itemLabel} · {a.reason}
                      </p>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Packing list · {view.packing.length} parcels</CardTitle>
                <CardDescription>Traceable to order and customer.</CardDescription>
              </CardHeader>
              <CardContent>
                {view.packing.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nothing to pack.</p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {view.packing.map((row) => (
                      <li key={row.orderId} className="rounded-lg border px-3 py-2 text-sm">
                        <p className="flex flex-wrap items-center gap-2 font-medium">
                          <span className="tnum rounded bg-muted px-1.5 py-0.5 text-xs">
                            {row.shortId}
                          </span>
                          {row.customer}
                          <Badge variant="outline">
                            {row.fulfillment === "DELIVERY" ? "Delivery" : "Pickup"}
                          </Badge>
                        </p>
                        <p className="mt-1 text-muted-foreground">
                          {row.items.map((i) => `${i.name} × ${i.qty}`).join(" · ")}
                        </p>
                        {row.address && <p className="mt-1 text-xs">{row.address}</p>}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Awaiting payment · {view.pending.length}</CardTitle>
                <CardDescription>Not in the counts above.</CardDescription>
              </CardHeader>
              <CardContent>
                {view.pending.length === 0 ? (
                  <p className="text-sm text-muted-foreground">None.</p>
                ) : (
                  <ul className="flex flex-col gap-1.5 text-sm">
                    {view.pending.map((p) => (
                      <li key={p.orderId} className="flex justify-between gap-2">
                        <span>
                          {p.customer} · <span className="tnum">{p.qty}</span>
                        </span>
                        <span className="tnum">{formatINR(p.totalPaise)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Exceptions · {view.exceptions.length}</CardTitle>
                <CardDescription>Cancelled for this date.</CardDescription>
              </CardHeader>
              <CardContent>
                {view.exceptions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">None.</p>
                ) : (
                  <ul className="flex flex-col gap-1.5 text-sm text-muted-foreground">
                    {view.exceptions.map((e) => (
                      <li key={e.orderId}>
                        {e.customer} · {(e.reason ?? "cancelled").toLowerCase().replace(/_/g, " ")}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Late changes · {view.lateChanges.length}</CardTitle>
                <CardDescription>Since finalization.</CardDescription>
              </CardHeader>
              <CardContent>
                {!view.sheet || view.sheet.status !== "FINALIZED" ? (
                  <p className="text-sm text-muted-foreground">Finalize to track late changes.</p>
                ) : view.lateChanges.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nothing changed since finalization.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-1.5 text-sm">
                    {view.lateChanges.map((l, i) => (
                      <li key={i}>
                        <Badge variant="outline">{l.kind.toLowerCase().replace(/_/g, " ")}</Badge>{" "}
                        {l.detail}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Record an adjustment</CardTitle>
              <CardDescription>
                Walk-ins, spoilage, extra portions — always with a reason, always audited.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={adjust} aria-label="Record adjustment" noValidate>
                <div className="grid gap-3 sm:grid-cols-4">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="adj-label">Covers</Label>
                    <Input
                      id="adj-label"
                      placeholder="Extra veg portions"
                      value={itemLabel}
                      onChange={(e) => setItemLabel(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="adj-qty">Change (+/-)</Label>
                    <Input
                      id="adj-qty"
                      inputMode="numeric"
                      placeholder="+5"
                      value={qtyDelta}
                      onChange={(e) => setQtyDelta(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <Label htmlFor="adj-reason">Reason</Label>
                    <Textarea
                      id="adj-reason"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <Button type="submit" disabled={pending}>
                    {pending && <Spinner data-icon="inline-start" />}
                    Record adjustment
                  </Button>
                </div>
              </form>
              <Separator className="my-2" />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
