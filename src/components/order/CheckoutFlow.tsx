"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Minus, Plus } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/data/StateBlock";
import { formatINR } from "@/lib/menu-rules";

interface MenuItem {
  itemId: string;
  name: string;
  description: string | null;
  pricePaise: number;
  vegType: string;
}

interface MenuPayload {
  mess: {
    id: string;
    name: string;
    pickupAllowed: boolean;
    deliveryAllowed: boolean;
    deliveryFeePaise: number;
    deliveryNote: string | null;
  };
  slots: Array<{ id: string; name: string }>;
  date: string;
  menu: {
    status: string;
    closedReason: string | null;
    slotId: string;
    slotName: string;
    cutoffTime: string;
    capacity: number | null;
    orderable: boolean;
    left: number | null;
    items: MenuItem[];
  } | null;
}

interface Address {
  id: string;
  label: string;
  line1: string;
  locality: string;
  city: string;
  pincode: string;
  isDefault: boolean;
}

interface Quote {
  lines: Array<{
    itemId: string;
    name: string;
    pricePaise: number;
    qty: number;
    lineTotal: number;
  }>;
  totalQty: number;
  itemTotalPaise: number;
  deliveryFeePaise: number;
  payablePaise: number;
  orderable: boolean;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function loadRazorpay(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("checkout.js failed to load"));
    document.body.appendChild(script);
  });
}

export function CheckoutFlow({ slug, initialDate }: { slug: string; initialDate: string }) {
  const router = useRouter();
  const [date, setDate] = useState(initialDate);
  const [payload, setPayload] = useState<MenuPayload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [fulfillment, setFulfillment] = useState<"PICKUP" | "DELIVERY">("PICKUP");
  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [addressId, setAddressId] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/discover/${slug}/menu?date=${date}`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("menu failed");
        const body = (await res.json()) as MenuPayload;
        if (cancelled) return;
        setPayload(body);
        setQty({});
        setQuote(null);
        if (body.mess.deliveryAllowed && !body.mess.pickupAllowed) setFulfillment("DELIVERY");
        else setFulfillment("PICKUP");
      })
      .catch(() => {
        if (!cancelled) setLoadError("Could not load the menu. Reload and try again.");
      });
    return () => {
      cancelled = true;
    };
  }, [slug, date]);

  useEffect(() => {
    fetch("/api/addresses", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) return;
        const body = (await res.json()) as { addresses: Address[] };
        setAddresses(body.addresses);
        const def = body.addresses.find((a) => a.isDefault) ?? body.addresses[0];
        if (def) setAddressId((prev) => prev || def.id);
      })
      .catch(() => null);
  }, []);

  const menu = payload?.menu;
  const items = menu?.status === "open" ? (menu.items as MenuItem[]) : [];
  const totalQty = Object.values(qty).reduce((n, q) => n + q, 0);

  function bump(id: string, delta: number) {
    setQty((prev) => {
      const next = Math.max(0, Math.min(20, (prev[id] ?? 0) + delta));
      const copy = { ...prev };
      if (next === 0) delete copy[id];
      else copy[id] = next;
      return copy;
    });
    setQuote(null);
  }

  async function review() {
    if (!payload || !menu || menu.status !== "open") return;
    setQuoteError(null);
    setQuoting(true);
    const res = await fetch("/api/orders/preview", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        messId: payload.mess.id,
        slotId: menu.slotId,
        serviceDate: payload.date,
        items: Object.entries(qty).map(([itemId, q]) => ({ itemId, qty: q })),
        fulfillment,
        addressId: fulfillment === "DELIVERY" ? addressId || undefined : undefined
      })
    });
    setQuoting(false);
    if (res.status === 401) {
      router.push(
        `/sign-in?next=${encodeURIComponent(`/discover/${slug}/order?date=${payload.date}`)}`
      );
      return;
    }
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: { code?: string } } | null;
      setQuoteError(
        body?.error?.code === "ADDRESS_REQUIRED"
          ? "Pick a delivery address first."
          : "This selection is no longer orderable (closed, sold out, or changed). Adjust and retry."
      );
      return;
    }
    setQuote(((await res.json()) as { quote: Quote }).quote);
  }

  async function pay() {
    if (!payload || !menu || menu.status !== "open") return;
    setPayError(null);
    setPlacing(true);
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        messId: payload.mess.id,
        slotId: menu.slotId,
        serviceDate: payload.date,
        items: Object.entries(qty).map(([itemId, q]) => ({ itemId, qty: q })),
        fulfillment,
        addressId: fulfillment === "DELIVERY" ? addressId || undefined : undefined
      })
    });
    if (res.status === 401) {
      router.push(
        `/sign-in?next=${encodeURIComponent(`/discover/${slug}/order?date=${payload.date}`)}`
      );
      return;
    }
    const body = (await res.json().catch(() => null)) as {
      orderId?: string;
      provider?: string;
      providerOrderId?: string;
      payablePaise?: number;
      keyId?: string | null;
    } | null;
    if (!res.ok || !body?.orderId) {
      setPlacing(false);
      setPayError("Could not start payment — the slot may just have sold out. Review again.");
      setQuote(null);
      return;
    }
    if (body.provider === "RAZORPAY" && body.keyId) {
      try {
        await loadRazorpay();
      } catch {
        setPlacing(false);
        setPayError("Payment widget failed to load. Check your connection and retry.");
        return;
      }
      const rzp = new window.Razorpay!({
        key: body.keyId,
        amount: body.payablePaise,
        currency: "INR",
        order_id: body.providerOrderId,
        name: "SmartMess",
        theme: { color: "#16a34a" },
        handler: () => router.push(`/app/orders/${body.orderId}`)
      });
      setPlacing(false);
      rzp.open();
      return;
    }
    router.push(`/order/mock-pay?order=${body.orderId}`);
  }

  if (loadError) {
    return <ErrorBlock title="Menu unavailable" description={loadError} />;
  }
  if (!payload) return <LoadingBlock label="Loading menu…" />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="co-date" className="text-sm font-medium">
          Date
        </label>
        <input
          id="co-date"
          type="date"
          value={date}
          min={payload.date}
          onChange={(e) => e.target.value && setDate(e.target.value)}
          className="h-9 rounded-lg border border-input bg-transparent px-2 text-sm"
        />
        {menu && menu.status === "open" && (
          <span className="text-xs text-muted-foreground">
            Order by <span className="tnum">{menu.cutoffTime}</span> IST
            {menu.left != null && (
              <>
                {" "}
                · <span className="tnum">{menu.left} left</span>
              </>
            )}
          </span>
        )}
      </div>

      {!menu || menu.status !== "open" ? (
        <EmptyBlock
          title="Nothing orderable"
          description={
            menu?.closedReason === "DATE_CLOSED"
              ? "The kitchen closed this date."
              : "No menu planned for this date yet. Pick another day."
          }
        />
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {items.map((item) => (
              <li
                key={item.itemId}
                className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="tnum text-sm text-muted-foreground">{formatINR(item.pricePaise)}</p>
                </div>
                <div
                  className="flex items-center gap-1.5"
                  role="group"
                  aria-label={`Quantity for ${item.name}`}
                >
                  <Button
                    variant="outline"
                    size="icon-sm"
                    onClick={() => bump(item.itemId, -1)}
                    aria-label={`One fewer ${item.name}`}
                    disabled={(qty[item.itemId] ?? 0) === 0}
                  >
                    <Minus data-icon="inline-start" />
                  </Button>
                  <span className="tnum w-6 text-center text-sm" aria-live="polite">
                    {qty[item.itemId] ?? 0}
                  </span>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    onClick={() => bump(item.itemId, 1)}
                    aria-label={`One more ${item.name}`}
                  >
                    <Plus data-icon="inline-start" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>

          {totalQty > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Fulfillment</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <FieldGroup>
                  <Field>
                    <FieldLabel>How do you get it?</FieldLabel>
                    <ToggleGroup
                      value={[fulfillment]}
                      onValueChange={(value) => {
                        const next = value[value.length - 1];
                        if (next === "PICKUP" || next === "DELIVERY") {
                          setFulfillment(next);
                          setQuote(null);
                        }
                      }}
                      aria-label="Fulfillment"
                    >
                      {payload.mess.pickupAllowed && (
                        <ToggleGroupItem value="PICKUP" aria-label="Self pickup">
                          Pickup
                        </ToggleGroupItem>
                      )}
                      {payload.mess.deliveryAllowed && (
                        <ToggleGroupItem value="DELIVERY" aria-label="Delivery">
                          Delivery
                        </ToggleGroupItem>
                      )}
                    </ToggleGroup>
                  </Field>
                  {fulfillment === "DELIVERY" && (
                    <Field>
                      <FieldLabel htmlFor="co-address">Deliver to</FieldLabel>
                      {addresses === null ? (
                        <p className="text-sm text-muted-foreground">Checking addresses…</p>
                      ) : addresses.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No addresses yet —{" "}
                          <Link href="/app/addresses" className="underline underline-offset-4">
                            add one
                          </Link>{" "}
                          (sign-in required), then come back.
                        </p>
                      ) : (
                        <select
                          id="co-address"
                          value={addressId}
                          onChange={(e) => {
                            setAddressId(e.target.value);
                            setQuote(null);
                          }}
                          className="h-9 rounded-lg border border-input bg-transparent px-2 text-sm"
                        >
                          {addresses.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.label}: {a.line1}, {a.locality} {a.pincode}
                            </option>
                          ))}
                        </select>
                      )}
                      {payload.mess.deliveryFeePaise > 0 && (
                        <p className="tnum text-xs text-muted-foreground">
                          Delivery fee {formatINR(payload.mess.deliveryFeePaise)}
                          {payload.mess.deliveryNote ? ` · ${payload.mess.deliveryNote}` : ""}
                        </p>
                      )}
                    </Field>
                  )}
                </FieldGroup>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => void review()} disabled={quoting}>
                    {quoting && <Spinner data-icon="inline-start" />}
                    Review total
                  </Button>
                </div>
                {quoteError && (
                  <Alert variant="destructive">
                    <AlertTitle>Cannot order this</AlertTitle>
                    <AlertDescription>{quoteError}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

          {quote && (
            <Card>
              <CardHeader>
                <CardTitle>Review and pay</CardTitle>
                <CardDescription>
                  Prices locked from today&apos;s menu. Paying confirms only if the kitchen still
                  has room — otherwise money comes straight back.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <ul className="flex flex-col gap-1.5 text-sm">
                  {quote.lines.map((l) => (
                    <li key={l.itemId} className="flex justify-between gap-2">
                      <span>
                        {l.name} × <span className="tnum">{l.qty}</span>
                      </span>
                      <span className="tnum">{formatINR(l.lineTotal)}</span>
                    </li>
                  ))}
                </ul>
                <Separator />
                <div className="flex justify-between text-sm">
                  <span>Delivery</span>
                  <span className="tnum">{formatINR(quote.deliveryFeePaise)}</span>
                </div>
                <div className="flex justify-between text-base font-semibold">
                  <span>To pay</span>
                  <span className="tnum">{formatINR(quote.payablePaise)}</span>
                </div>
                {payError && (
                  <Alert variant="destructive">
                    <AlertTitle>Payment did not start</AlertTitle>
                    <AlertDescription>{payError}</AlertDescription>
                  </Alert>
                )}
                <div>
                  <Button onClick={() => void pay()} disabled={placing}>
                    {placing && <Spinner data-icon="inline-start" />}
                    {placing ? "Starting payment…" : `Pay ${formatINR(quote.payablePaise)}`}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
