"use client";

import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { EmptyBlock, LoadingBlock } from "@/components/data/StateBlock";
import { formatINR } from "@/lib/menu-rules";

interface Plan {
  id: string;
  name: string;
  description: string | null;
  slotId: string;
  mealsTotal: number;
  validityDays: number;
  pricePaise: number;
  active: boolean;
  slot: { name: string };
}

interface Slot {
  id: string;
  name: string;
  active: boolean;
}

export function PlansManager({ messId }: { messId: string }) {
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [slotId, setSlotId] = useState("");
  const [meals, setMeals] = useState("20");
  const [days, setDays] = useState("30");
  const [price, setPrice] = useState("");
  const [pending, setPending] = useState(false);
  const [busy, setBusy] = useState(false);

  async function load() {
    const [p, s] = await Promise.all([
      fetch(`/api/messes/${messId}/plans`, { cache: "no-store" }),
      fetch(`/api/messes/${messId}/slots`, { cache: "no-store" })
    ]);
    if (!p.ok || !s.ok) {
      setError("Could not load plans.");
      return;
    }
    setPlans(((await p.json()) as { plans: Plan[] }).plans);
    const slotList = ((await s.json()) as { slots: Slot[] }).slots.filter((x) => x.active);
    setSlots(slotList);
    if (slotList[0]) setSlotId((prev) => prev || slotList[0].id);
  }

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch(`/api/messes/${messId}/plans`, { cache: "no-store" }),
      fetch(`/api/messes/${messId}/slots`, { cache: "no-store" })
    ])
      .then(async ([p, s]) => {
        if (!p.ok || !s.ok) throw new Error("load");
        const plans = ((await p.json()) as { plans: Plan[] }).plans;
        const slotList = ((await s.json()) as { slots: Slot[] }).slots.filter((x) => x.active);
        if (cancelled) return;
        setPlans(plans);
        setSlots(slotList);
        if (slotList[0]) setSlotId((prev) => prev || slotList[0].id);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load plans.");
      });
    return () => {
      cancelled = true;
    };
  }, [messId]);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    const paise = Math.round(Number(price) * 100);
    if (
      name.trim().length < 3 ||
      !slotId ||
      !Number.isInteger(Number(meals)) ||
      !Number.isInteger(Number(days)) ||
      !Number.isFinite(paise)
    ) {
      setError("Name (3+ chars), slot, whole meals/days, and a numeric price are required.");
      return;
    }
    setError(null);
    setPending(true);
    const res = await fetch(`/api/messes/${messId}/plans`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        slotId,
        name: name.trim(),
        mealsTotal: Number(meals),
        validityDays: Number(days),
        pricePaise: paise
      })
    });
    setPending(false);
    if (!res.ok) {
      setError("Could not create — meals 5–365, validity 7–365 days, price ₹1–₹10,000.");
      return;
    }
    setName("");
    setPrice("");
    await load();
  }

  async function toggle(plan: Plan, active: boolean) {
    setBusy(true);
    const res = await fetch(`/api/messes/${messId}/plans/${plan.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ active })
    });
    setBusy(false);
    if (!res.ok) setError("Could not update the plan.");
    await load();
  }

  if (error && plans === null) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Plans unavailable</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }
  if (plans === null || slots === null) return <LoadingBlock label="Loading plans…" />;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Subscription plans</CardTitle>
          <CardDescription>
            Each plan sells a meal count for one slot within a validity window. Pausing an existing
            plan never changes its sold terms.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {plans.length === 0 ? (
            <EmptyBlock
              title="No plans yet"
              description="Create your first plan below — e.g. 20 lunches usable within 30 days."
            />
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {plans.map((plan) => (
                <li key={plan.id} className="rounded-xl border p-3">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                    {plan.name}
                    {!plan.active && <Badge variant="outline">Off sale</Badge>}
                  </p>
                  <p className="tnum mt-1 text-sm text-muted-foreground">
                    {plan.slot.name} · {plan.mealsTotal} meals / {plan.validityDays} days ·{" "}
                    {formatINR(plan.pricePaise)}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <Switch
                      id={`plan-${plan.id}`}
                      checked={plan.active}
                      disabled={busy}
                      onCheckedChange={(v) => void toggle(plan, v)}
                    />
                    <Label htmlFor={`plan-${plan.id}`}>On sale</Label>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {slots.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Create meal slots first (Slots tab) — plans attach to a slot.
            </p>
          ) : (
            <form onSubmit={create} aria-label="Create plan" noValidate>
              <FieldGroup>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="plan-name">Plan name</FieldLabel>
                    <Input
                      id="plan-name"
                      placeholder="Lunch × 20"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="plan-slot">Slot</FieldLabel>
                    <select
                      id="plan-slot"
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
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field>
                    <FieldLabel htmlFor="plan-meals">Meals</FieldLabel>
                    <Input
                      id="plan-meals"
                      inputMode="numeric"
                      value={meals}
                      onChange={(e) => setMeals(e.target.value)}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="plan-days">Validity (days)</FieldLabel>
                    <Input
                      id="plan-days"
                      inputMode="numeric"
                      value={days}
                      onChange={(e) => setDays(e.target.value)}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="plan-price">Price (₹)</FieldLabel>
                    <Input
                      id="plan-price"
                      inputMode="decimal"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                    />
                  </Field>
                </div>
                {error && (
                  <Alert variant="destructive">
                    <AlertTitle>Could not save</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div>
                  <Button type="submit" disabled={pending}>
                    {pending && <Spinner data-icon="inline-start" />}
                    Create plan
                  </Button>
                </div>
              </FieldGroup>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
