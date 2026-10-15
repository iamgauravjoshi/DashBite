"use client";

import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { EmptyBlock, LoadingBlock } from "@/components/data/StateBlock";
import { formatINR } from "@/lib/menu-rules";
import { todayInTz } from "@/lib/ist";

interface Slot {
  id: string;
  name: string;
  active: boolean;
}

interface CatalogItem {
  id: string;
  name: string;
  pricePaise: number;
  active: boolean;
}

interface DateOverride {
  id: string;
  slotId: string;
  date: string;
  closed: boolean;
  capacity: number | null;
  slot: { name: string };
  items: Array<{ itemId: string; pricePaise: number; item: { name: string } }>;
}

export function DatePlanner({ messId }: { messId: string }) {
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [catalog, setCatalog] = useState<CatalogItem[] | null>(null);
  const [overrides, setOverrides] = useState<DateOverride[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState(() => todayInTz());
  const [slotId, setSlotId] = useState("");
  const [closed, setClosed] = useState(false);
  const [capacity, setCapacity] = useState("100");
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [pending, setPending] = useState(false);
  const [busy, setBusy] = useState(false);

  async function load() {
    const [s, c, d] = await Promise.all([
      fetch(`/api/messes/${messId}/slots`, { cache: "no-store" }),
      fetch(`/api/messes/${messId}/items`, { cache: "no-store" }),
      fetch(`/api/messes/${messId}/dates`, { cache: "no-store" })
    ]);
    if (!s.ok || !c.ok || !d.ok) {
      setError("Could not load date overrides.");
      return;
    }
    const sBody = (await s.json()) as { slots: Slot[] };
    setSlots(sBody.slots.filter((x) => x.active));
    setCatalog(((await c.json()) as { items: CatalogItem[] }).items.filter((x) => x.active));
    setOverrides(((await d.json()) as { dates: DateOverride[] }).dates);
    const first = sBody.slots.find((x) => x.active);
    if (first && !slotId) setSlotId(first.id);
  }

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch(`/api/messes/${messId}/slots`, { cache: "no-store" }),
      fetch(`/api/messes/${messId}/items`, { cache: "no-store" }),
      fetch(`/api/messes/${messId}/dates`, { cache: "no-store" })
    ])
      .then(async ([s, c, d]) => {
        if (!s.ok || !c.ok || !d.ok) throw new Error("load");
        const sBody = (await s.json()) as { slots: Slot[] };
        const cBody = (await c.json()) as { items: CatalogItem[] };
        const dBody = (await d.json()) as { dates: DateOverride[] };
        if (cancelled) return;
        setSlots(sBody.slots.filter((x) => x.active));
        setCatalog(cBody.items.filter((x) => x.active));
        setOverrides(dBody.dates);
        const first = sBody.slots.find((x) => x.active);
        if (first) setSlotId((prev) => prev || first.id);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load date overrides.");
      });
    return () => {
      cancelled = true;
    };
  }, [messId]);

  async function copyWeekly() {
    if (!slotId || !date) return;
    setBusy(true);
    const res = await fetch(`/api/messes/${messId}/weekly`, { cache: "no-store" });
    setBusy(false);
    if (!res.ok) {
      setError("Could not read the weekly plan.");
      return;
    }
    const body = (await res.json()) as {
      weekly: Array<{
        slotId: string;
        dayOfWeek: number;
        capacity: number;
        items: Array<{ itemId: string; pricePaise: number; active: boolean }>;
      }>;
    };
    const jsDay = new Date(`${date}T00:00:00Z`).getUTCDay();
    const template = body.weekly.find((w) => w.slotId === slotId && w.dayOfWeek === jsDay);
    if (!template) {
      setError("No weekly template for this slot and weekday — pick dishes manually.");
      return;
    }
    setError(null);
    setCapacity(String(template.capacity));
    const next: Record<string, boolean> = {};
    for (const link of template.items) {
      if (link.active) next[link.itemId] = true;
    }
    setPicked(next);
  }

  async function save() {
    const cap = Number(capacity);
    if (!slotId || !date) {
      setError("Pick a date and a slot.");
      return;
    }
    if (!closed && (!Number.isInteger(cap) || cap < 1)) {
      setError("Capacity needs at least 1 meal, or close the day.");
      return;
    }
    setError(null);
    setPending(true);
    const items = Object.keys(picked)
      .filter((id) => picked[id])
      .map((itemId) => {
        const found = catalog?.find((c) => c.id === itemId);
        return { itemId, pricePaise: found?.pricePaise ?? 0 };
      });
    const res = await fetch(`/api/messes/${messId}/dates`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        slotId,
        date,
        closed,
        capacity: closed ? undefined : cap,
        items: closed ? [] : items
      })
    });
    setPending(false);
    if (!res.ok) {
      setError("Could not save — past dates are not allowed.");
      return;
    }
    setPicked({});
    await load();
  }

  async function remove(id: string) {
    setBusy(true);
    const res = await fetch(`/api/messes/${messId}/dates?dateMenuId=${id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) setError("Could not remove this override.");
    await load();
  }

  if (error && (slots === null || overrides === null)) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Date overrides unavailable</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }
  if (slots === null || overrides === null || catalog === null) {
    return <LoadingBlock label="Loading date overrides…" />;
  }
  if (slots.length === 0) {
    return (
      <EmptyBlock
        title="Set up slots first"
        description="Date changes attach to meal slots. Create slots in the Slots tab first."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Change one date</CardTitle>
          <CardDescription>
            Overrides replace the weekly template for that date only. Snapshots never rewrite
            history.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-4">
            <Field>
              <FieldLabel htmlFor="dt-date">Date</FieldLabel>
              <Input
                id="dt-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="dt-slot">Slot</FieldLabel>
              <select
                id="dt-slot"
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
            <Field>
              <FieldLabel htmlFor="dt-cap">Meals</FieldLabel>
              <Input
                id="dt-cap"
                inputMode="numeric"
                value={capacity}
                disabled={closed}
                onChange={(e) => setCapacity(e.target.value)}
              />
            </Field>
            <div className="flex items-end gap-2">
              <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
                <Switch id="dt-closed" checked={closed} onCheckedChange={setClosed} />
                <Label htmlFor="dt-closed">Closed</Label>
              </div>
            </div>
          </div>
          {!closed && (
            <>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => void copyWeekly()}
                >
                  Copy weekly template
                </Button>
                <span className="text-xs text-muted-foreground">
                  …then adjust dishes below before saving.
                </span>
              </div>
              <fieldset>
                <legend className="mb-2 text-sm font-medium">Dishes that day</legend>
                {catalog.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No catalog items yet — add dishes in the Items tab.
                  </p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {catalog.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-2 rounded-lg border px-2.5 py-1.5"
                      >
                        <Checkbox
                          id={`dt-item-${item.id}`}
                          checked={Boolean(picked[item.id])}
                          onCheckedChange={(v) =>
                            setPicked((prev) => ({ ...prev, [item.id]: v === true }))
                          }
                        />
                        <Label
                          htmlFor={`dt-item-${item.id}`}
                          className="min-w-0 flex-1 truncate text-sm"
                        >
                          {item.name}{" "}
                          <span className="tnum text-muted-foreground">
                            {formatINR(item.pricePaise)}
                          </span>
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
              </fieldset>
            </>
          )}
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Could not save</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div>
            <Button onClick={() => void save()} disabled={pending}>
              {pending && <Spinner data-icon="inline-start" />}
              Save date
            </Button>
          </div>
        </CardContent>
      </Card>

      {overrides.length === 0 ? (
        <EmptyBlock
          title="No date changes yet"
          description="The weekly rhythm repeats until you override a specific date above."
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {overrides.map((o) => (
            <Card key={o.id}>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2">
                  <span className="tnum">{o.date}</span> · {o.slot.name}
                  {o.closed ? (
                    <Badge variant="outline">Closed</Badge>
                  ) : (
                    <Badge>{o.capacity} meals</Badge>
                  )}
                </CardTitle>
                {!o.closed && (
                  <CardDescription>
                    {o.items.map((i) => i.item.name).join(", ") || "No dishes"}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <Button variant="ghost" size="sm" disabled={busy} onClick={() => void remove(o.id)}>
                  Revert to weekly
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
