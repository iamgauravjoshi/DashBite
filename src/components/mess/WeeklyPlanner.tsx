"use client";

import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { EmptyBlock, LoadingBlock } from "@/components/data/StateBlock";
import { formatINR, DAY_LABELS } from "@/lib/menu-rules";

interface Slot {
  id: string;
  name: string;
  active: boolean;
}

interface CatalogItem {
  id: string;
  name: string;
  pricePaise: number;
}

interface WeeklyEntry {
  id: string;
  slotId: string;
  dayOfWeek: number;
  capacity: number;
  active: boolean;
  slot: { name: string };
  items: Array<{
    id: string;
    pricePaise: number;
    active: boolean;
    item: { id: string; name: string };
  }>;
}

export function WeeklyPlanner({ messId }: { messId: string }) {
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [catalog, setCatalog] = useState<CatalogItem[] | null>(null);
  const [entries, setEntries] = useState<WeeklyEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [slotId, setSlotId] = useState("");
  const [day, setDay] = useState("1");
  const [capacity, setCapacity] = useState("100");
  const [pending, setPending] = useState(false);
  const [busy, setBusy] = useState(false);

  async function load() {
    const [s, c, w] = await Promise.all([
      fetch(`/api/messes/${messId}/slots`, { cache: "no-store" }),
      fetch(`/api/messes/${messId}/items`, { cache: "no-store" }),
      fetch(`/api/messes/${messId}/weekly`, { cache: "no-store" })
    ]);
    if (!s.ok || !c.ok || !w.ok) {
      setError("Could not load the weekly plan.");
      return;
    }
    const sBody = (await s.json()) as { slots: Slot[] };
    const cBody = (await c.json()) as { items: CatalogItem[] };
    const wBody = (await w.json()) as { weekly: WeeklyEntry[] };
    setSlots(sBody.slots.filter((x) => x.active));
    setCatalog(cBody.items.filter((x) => x));
    setEntries(wBody.weekly);
    const first = sBody.slots.find((x) => x.active);
    if (first && !slotId) setSlotId(first.id);
  }

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch(`/api/messes/${messId}/slots`, { cache: "no-store" }),
      fetch(`/api/messes/${messId}/items`, { cache: "no-store" }),
      fetch(`/api/messes/${messId}/weekly`, { cache: "no-store" })
    ])
      .then(async ([s, c, w]) => {
        if (!s.ok || !c.ok || !w.ok) throw new Error("load");
        const sBody = (await s.json()) as { slots: Slot[] };
        const cBody = (await c.json()) as { items: CatalogItem[] };
        const wBody = (await w.json()) as { weekly: WeeklyEntry[] };
        if (cancelled) return;
        setSlots(sBody.slots.filter((x) => x.active));
        setCatalog(cBody.items.filter((x) => x));
        setEntries(wBody.weekly);
        const first = sBody.slots.find((x) => x.active);
        if (first) setSlotId((prev) => prev || first.id);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load the weekly plan.");
      });
    return () => {
      cancelled = true;
    };
  }, [messId]);

  async function saveEntry() {
    const cap = Number(capacity);
    if (!slotId || !Number.isInteger(cap) || cap < 1) {
      setError("Pick a slot and a capacity of at least 1.");
      return;
    }
    setError(null);
    setPending(true);
    const res = await fetch(`/api/messes/${messId}/weekly`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slotId, dayOfWeek: Number(day), capacity: cap })
    });
    setPending(false);
    if (!res.ok) {
      setError("Could not save this day.");
      return;
    }
    await load();
  }

  async function patchEntry(entry: WeeklyEntry, patch: Record<string, unknown>) {
    setBusy(true);
    const res = await fetch(`/api/messes/${messId}/weekly/${entry.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch)
    });
    setBusy(false);
    if (!res.ok) setError("Could not update this day.");
    await load();
  }

  async function deleteEntry(entry: WeeklyEntry) {
    setBusy(true);
    const res = await fetch(`/api/messes/${messId}/weekly/${entry.id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) setError("Could not remove this day.");
    await load();
  }

  async function addItem(entry: WeeklyEntry, itemId: string) {
    const item = catalog?.find((c) => c.id === itemId);
    if (!item) return;
    setBusy(true);
    const res = await fetch(`/api/messes/${messId}/weekly/${entry.id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ itemId, pricePaise: item.pricePaise })
    });
    setBusy(false);
    if (!res.ok) setError("Already on this day or invalid item.");
    await load();
  }

  async function removeItem(entry: WeeklyEntry, linkId: string) {
    setBusy(true);
    const res = await fetch(`/api/messes/${messId}/weekly/${entry.id}/items/${linkId}`, {
      method: "DELETE"
    });
    setBusy(false);
    if (!res.ok) setError("Could not remove this item.");
    await load();
  }

  if (error && (slots === null || entries === null)) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Weekly plan unavailable</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }
  if (slots === null || entries === null || catalog === null) {
    return <LoadingBlock label="Loading weekly plan…" />;
  }
  if (slots.length === 0) {
    return (
      <EmptyBlock
        title="Set up slots first"
        description="Weekly plans attach to meal slots. Create slots in the Slots tab, then come back here."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Plan a weekday</CardTitle>
          <CardDescription>
            Capacity is shared by one-time orders and subscriptions. Saving twice updates the same
            day.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-4">
            <Field>
              <FieldLabel htmlFor="wk-slot">Slot</FieldLabel>
              <select
                id="wk-slot"
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
              <FieldLabel htmlFor="wk-day">Day</FieldLabel>
              <select
                id="wk-day"
                value={day}
                onChange={(e) => setDay(e.target.value)}
                className="h-9 rounded-lg border border-input bg-transparent px-2 text-sm"
              >
                {[0, 1, 2, 3, 4, 5, 6].map((d) => (
                  <option key={d} value={d}>
                    {DAY_LABELS[d]}
                  </option>
                ))}
              </select>
            </Field>
            <Field>
              <FieldLabel htmlFor="wk-cap">Meals</FieldLabel>
              <Input
                id="wk-cap"
                inputMode="numeric"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
              />
            </Field>
            <div className="flex items-end">
              <Button onClick={() => void saveEntry()} disabled={pending}>
                {pending && <Spinner data-icon="inline-start" />}
                Save day
              </Button>
            </div>
          </div>
          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertTitle>Could not save</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {entries.length === 0 ? (
        <EmptyBlock
          title="No planned days yet"
          description="Save your first weekday above, then attach dishes to it."
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {entries.map((entry) => {
            const linked = new Set(entry.items.map((i) => i.item.id));
            const addable = (catalog ?? []).filter((c) => !linked.has(c.id));
            return (
              <Card key={entry.id}>
                <CardHeader>
                  <CardTitle className="flex flex-wrap items-center gap-2">
                    {entry.slot.name} · {DAY_LABELS[entry.dayOfWeek]}
                    {!entry.active && <Badge variant="outline">Paused</Badge>}
                  </CardTitle>
                  <CardDescription className="tnum">{entry.capacity} meals</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  {entry.items.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No dishes attached yet.</p>
                  ) : (
                    <ul className="flex flex-col gap-1.5">
                      {entry.items.map((link) => (
                        <li
                          key={link.id}
                          className="flex items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-sm"
                        >
                          <span className="min-w-0">
                            <span className="font-medium">{link.item.name}</span>{" "}
                            <span className="tnum text-muted-foreground">
                              {formatINR(link.pricePaise)}
                            </span>
                            {!link.active && (
                              <Badge variant="outline" className="ml-1.5">
                                Off
                              </Badge>
                            )}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={busy}
                            onClick={() => void removeItem(entry, link.id)}
                            aria-label={`Remove ${link.item.name}`}
                          >
                            Remove
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {addable.length > 0 && (
                    <form
                      className="flex gap-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const select = e.currentTarget.querySelector("select");
                        if (select?.value) void addItem(entry, select.value);
                      }}
                      aria-label={`Add dish to ${entry.slot.name} ${DAY_LABELS[entry.dayOfWeek]}`}
                    >
                      <Label htmlFor={`add-${entry.id}`} className="sr-only">
                        Dish to add
                      </Label>
                      <select
                        id={`add-${entry.id}`}
                        className="h-8 min-w-0 flex-1 rounded-lg border border-input bg-transparent px-2 text-sm"
                        defaultValue=""
                      >
                        <option value="" disabled>
                          Pick a dish…
                        </option>
                        {addable.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} · {formatINR(c.pricePaise)}
                          </option>
                        ))}
                      </select>
                      <Button type="submit" size="sm" variant="outline" disabled={busy}>
                        Add
                      </Button>
                    </form>
                  )}
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Switch
                        id={`wk-${entry.id}`}
                        checked={entry.active}
                        disabled={busy}
                        onCheckedChange={(v) => void patchEntry(entry, { active: v })}
                      />
                      <Label htmlFor={`wk-${entry.id}`}>Serving</Label>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={busy}
                      onClick={() => void deleteEntry(entry)}
                    >
                      Delete day
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
