"use client";

import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { EmptyBlock, LoadingBlock } from "@/components/data/StateBlock";
import { todayInTz } from "@/lib/ist";

interface Holiday {
  id: string;
  date: string;
  reason: string | null;
}

export function HolidayManager({ messId }: { messId: string }) {
  const [holidays, setHolidays] = useState<Holiday[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState(() => todayInTz());
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch(`/api/messes/${messId}/holidays`, { cache: "no-store" });
    if (!res.ok) {
      setError("Could not load holidays.");
      return;
    }
    setHolidays(((await res.json()) as { holidays: Holiday[] }).holidays);
  }

  useEffect(() => {
    fetch(`/api/messes/${messId}/holidays`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("load");
        setHolidays(((await res.json()) as { holidays: Holiday[] }).holidays);
      })
      .catch(() => setError("Could not load holidays."));
  }, [messId]);

  async function add(event: React.FormEvent) {
    event.preventDefault();
    if (!date) {
      setError("Pick a date.");
      return;
    }
    setError(null);
    setPending(true);
    const res = await fetch(`/api/messes/${messId}/holidays`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ date, reason })
    });
    setPending(false);
    if (!res.ok) {
      setError("Could not save — past dates and duplicates are rejected.");
      return;
    }
    setReason("");
    await load();
  }

  async function remove(id: string) {
    setBusy(true);
    const res = await fetch(`/api/messes/${messId}/holidays?holidayId=${id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) setError("Could not remove.");
    await load();
  }

  if (error && holidays === null) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Holidays unavailable</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }
  if (holidays === null) return <LoadingBlock label="Loading holidays…" />;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Declare a holiday</CardTitle>
          <CardDescription>Whole kitchen closed — every slot that day.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={add} aria-label="Add holiday" noValidate>
            <FieldGroup>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field>
                  <FieldLabel htmlFor="hol-date">Date</FieldLabel>
                  <Input
                    id="hol-date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="hol-reason">
                    Reason <span className="font-normal text-muted-foreground">(optional)</span>
                  </FieldLabel>
                  <Input
                    id="hol-reason"
                    placeholder="Diwali"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </Field>
                <div className="flex items-end">
                  <Button type="submit" disabled={pending}>
                    {pending && <Spinner data-icon="inline-start" />}
                    Add holiday
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
      {holidays.length === 0 ? (
        <EmptyBlock
          title="No holidays declared"
          description="Festivals, maintenance, family functions — declare them here so customers never order into a closed kitchen."
        />
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {holidays.map((h) => (
            <li
              key={h.id}
              className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2"
            >
              <div>
                <p className="tnum text-sm font-medium">{h.date}</p>
                {h.reason && <p className="text-xs text-muted-foreground">{h.reason}</p>}
              </div>
              <Button variant="ghost" size="sm" disabled={busy} onClick={() => void remove(h.id)}>
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
