"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { StatusBadge } from "@/components/data/StatusBadge";
import { EmptyBlock, LoadingBlock } from "@/components/data/StateBlock";
import { formatINR } from "@/lib/menu-rules";
import { todayInTz } from "@/lib/ist";

interface QueueOrder {
  id: string;
  status: string;
  fulfillment: string;
  serviceDate: string;
  payablePaise: number;
  cancelReason: string | null;
  customer: { name: string };
  items: Array<{ id: string; name: string; qty: number; pricePaise: number }>;
  payments: Array<{ status: string }>;
  fulfillmentRecord: { status: string } | null;
}

export function OrderQueue({
  messes,
  selectedId
}: {
  messes: Array<{ id: string; name: string }>;
  selectedId: string;
}) {
  const router = useRouter();
  const [orders, setOrders] = useState<QueueOrder[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [date, setDate] = useState(() => todayInTz());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function load(messId: string, st: string, d: string) {
    const params = new URLSearchParams();
    if (st) params.set("status", st);
    if (d) params.set("date", d);
    const res = await fetch(`/api/messes/${messId}/orders?${params.toString()}`, {
      cache: "no-store"
    });
    if (!res.ok) {
      setError("Could not load the queue.");
      return;
    }
    setOrders(((await res.json()) as { orders: QueueOrder[] }).orders);
  }

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/messes/${selectedId}/orders?date=${date}`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("load");
        const body = (await res.json()) as { orders: QueueOrder[] };
        if (!cancelled) setOrders(body.orders);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load the queue.");
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId, date]);

  async function cancel(orderId: string) {
    if (!reason.trim()) {
      setCancelError("A reason is required — the customer sees it via support.");
      return;
    }
    setCancelError(null);
    setPending(true);
    const res = await fetch(`/api/messes/${selectedId}/orders/${orderId}/cancel`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reason: reason.trim() })
    });
    setPending(false);
    if (!res.ok) {
      setCancelError("Could not cancel. Reload and try again.");
      return;
    }
    setReason("");
    setExpanded(null);
    await load(selectedId, status, date);
  }

  if (error && orders === null) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Queue unavailable</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }
  if (orders === null) return <LoadingBlock label="Loading orders…" />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Choose mess">
        {messes.map((m) => (
          <Button
            key={m.id}
            variant={m.id === selectedId ? "default" : "outline"}
            size="sm"
            onClick={() => router.push(`/owner/orders?mess=${m.id}`)}
          >
            {m.name}
          </Button>
        ))}
      </div>
      <form
        className="flex flex-wrap items-end gap-3"
        aria-label="Filter orders"
        onSubmit={(e) => {
          e.preventDefault();
          setOrders(null);
          void load(selectedId, status, date);
        }}
      >
        <Field>
          <FieldLabel htmlFor="oq-status">Status</FieldLabel>
          <select
            id="oq-status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-9 rounded-lg border border-input bg-transparent px-2 text-sm"
          >
            <option value="">All statuses</option>
            <option value="PENDING_PAYMENT">Pending payment</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </Field>
        <Field>
          <FieldLabel htmlFor="oq-date">Service date</FieldLabel>
          <Input id="oq-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Button type="submit" variant="outline">
          Filter
        </Button>
      </form>
      {orders.length === 0 ? (
        <EmptyBlock
          title="No orders here"
          description="Confirmed orders for this date appear first in the queue. Adjust the filters to look further."
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {orders.map((order) => (
            <Card key={order.id}>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2">
                  {order.customer.name}
                  <StatusBadge status={order.status} />
                </CardTitle>
                <CardDescription>
                  <span className="tnum">{order.serviceDate.slice(0, 10)}</span> ·{" "}
                  {order.fulfillment === "DELIVERY" ? "Delivery" : "Pickup"} ·{" "}
                  {order.items.reduce((n, i) => n + i.qty, 0)} items ·{" "}
                  <span className="tnum">{formatINR(order.payablePaise)}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  {order.payments[0] && (
                    <Badge variant="outline">{order.payments[0].status.toLowerCase()}</Badge>
                  )}
                  {order.fulfillmentRecord && (
                    <Badge variant="secondary">
                      {order.fulfillmentRecord.status.toLowerCase().replace(/_/g, " ")}
                    </Badge>
                  )}
                  {order.cancelReason && (
                    <Badge variant="outline">
                      {order.cancelReason.toLowerCase().replace(/_/g, " ")}
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpanded(expanded === order.id ? null : order.id)}
                    aria-expanded={expanded === order.id}
                  >
                    {expanded === order.id ? "Hide items" : "Show items"}
                  </Button>
                </div>
                {expanded === order.id && (
                  <ul className="flex flex-col gap-1 text-sm">
                    {order.items.map((item) => (
                      <li key={item.id} className="flex justify-between gap-2">
                        <span>
                          {item.name} × <span className="tnum">{item.qty}</span>
                        </span>
                        <span className="tnum">{formatINR(item.pricePaise * item.qty)}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {(order.status === "CONFIRMED" || order.status === "PENDING_PAYMENT") && (
                  <Dialog
                    open={expanded === `cancel-${order.id}`}
                    onOpenChange={(v) => {
                      setExpanded(v ? `cancel-${order.id}` : null);
                      setCancelError(null);
                    }}
                  >
                    <DialogTrigger
                      render={
                        <Button variant="outline" size="sm">
                          Cancel with reason
                        </Button>
                      }
                    />
                    <DialogContent aria-describedby={undefined}>
                      <DialogHeader>
                        <DialogTitle>Cancel this order?</DialogTitle>
                        <DialogDescription>
                          The slot frees up and any captured amount refunds. The customer sees your
                          reason via support.
                        </DialogDescription>
                      </DialogHeader>
                      <Field>
                        <FieldLabel htmlFor={`reason-${order.id}`}>Reason</FieldLabel>
                        <Textarea
                          id={`reason-${order.id}`}
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          placeholder="Kitchen issue, ingredient shortage…"
                        />
                      </Field>
                      {cancelError && (
                        <Alert variant="destructive">
                          <AlertTitle>Could not cancel</AlertTitle>
                          <AlertDescription>{cancelError}</AlertDescription>
                        </Alert>
                      )}
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setExpanded(null)}>
                          Keep order
                        </Button>
                        <Button
                          variant="destructive"
                          disabled={pending}
                          onClick={() => void cancel(order.id)}
                        >
                          {pending && <Spinner data-icon="inline-start" />}
                          Confirm cancellation
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
