"use client";

import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { EmptyBlock, LoadingBlock } from "@/components/data/StateBlock";

interface Slot {
  id: string;
  key: string;
  name: string;
  cutoffTime: string;
  sortOrder: number;
  active: boolean;
}

export function SlotManager({ messId }: { messId: string }) {
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [cutoff, setCutoff] = useState("09:30");
  const [pending, setPending] = useState(false);
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch(`/api/messes/${messId}/slots`, { cache: "no-store" });
    if (!res.ok) {
      setError("Could not load slots.");
      return;
    }
    setSlots(((await res.json()) as { slots: Slot[] }).slots);
  }

  useEffect(() => {
    setSlots(null);
    setError(null);
    fetch(`/api/messes/${messId}/slots`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("load");
        setSlots(((await res.json()) as { slots: Slot[] }).slots);
      })
      .catch(() => setError("Could not load slots."));
  }, [messId]);

  async function seedDefaults() {
    setBusy(true);
    const res = await fetch(`/api/messes/${messId}/slots`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ defaults: true })
    });
    setBusy(false);
    if (!res.ok) {
      setError("Defaults already exist or could not be created.");
      return;
    }
    await load();
  }

  async function add(event: React.FormEvent) {
    event.preventDefault();
    if (name.trim().length < 2) {
      setError("Name your slot (at least 2 characters).");
      return;
    }
    setError(null);
    setPending(true);
    const res = await fetch(`/api/messes/${messId}/slots`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: name.trim(), cutoffTime: cutoff })
    });
    setPending(false);
    if (!res.ok) {
      setError("Could not add — keys must be unique per mess.");
      return;
    }
    setName("");
    await load();
  }

  async function patch(slot: Slot, patch: Partial<Slot>) {
    setBusy(true);
    const res = await fetch(`/api/messes/${messId}/slots/${slot.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch)
    });
    setBusy(false);
    if (!res.ok) setError("Could not update the slot.");
    await load();
  }

  if (error && slots === null) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Slots unavailable</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }
  if (slots === null) return <LoadingBlock label="Loading slots…" />;

  return (
    <div className="flex flex-col gap-4">
      {slots.length === 0 ? (
        <EmptyBlock
          title="No meal slots yet"
          description="Start with Breakfast, Lunch, and Dinner — each with its own order cutoff — or add your own."
          action={
            <Button onClick={() => void seedDefaults()} disabled={busy}>
              {busy && <Spinner data-icon="inline-start" />}
              Create breakfast · lunch · dinner
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {slots.map((slot) => (
            <Card key={slot.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {slot.name}
                  {!slot.active && <Badge variant="outline">Off</Badge>}
                </CardTitle>
                <CardDescription>
                  Key <span className="tnum">{slot.key}</span> · cutoff{" "}
                  <span className="tnum">{slot.cutoffTime}</span> IST
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Input
                    type="time"
                    aria-label={`${slot.name} cutoff`}
                    defaultValue={slot.cutoffTime}
                    onBlur={(e) => {
                      if (e.target.value && e.target.value !== slot.cutoffTime) {
                        void patch(slot, { cutoffTime: e.target.value });
                      }
                    }}
                    className="w-28"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id={`slot-${slot.id}`}
                    checked={slot.active}
                    disabled={busy}
                    onCheckedChange={(v) => void patch(slot, { active: v })}
                  />
                  <Label htmlFor={`slot-${slot.id}`}>Serving</Label>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {slots.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Add a slot</CardTitle>
            <CardDescription>
              Snacks, late-night, weekend specials — whatever you serve.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={add} aria-label="Add slot" noValidate>
              <FieldGroup>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field>
                    <FieldLabel htmlFor="slot-name">Name</FieldLabel>
                    <Input id="slot-name" value={name} onChange={(e) => setName(e.target.value)} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="slot-cutoff">Order cutoff (IST)</FieldLabel>
                    <Input
                      id="slot-cutoff"
                      type="time"
                      value={cutoff}
                      onChange={(e) => setCutoff(e.target.value)}
                    />
                  </Field>
                  <div className="flex items-end">
                    <Button type="submit" disabled={pending}>
                      {pending && <Spinner data-icon="inline-start" />}
                      Add slot
                    </Button>
                  </div>
                </div>
                {error && (
                  <Alert variant="destructive">
                    <AlertTitle>Could not save</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
