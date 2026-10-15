"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { StatusBadge } from "@/components/data/StatusBadge";
import { EmptyBlock, LoadingBlock } from "@/components/data/StateBlock";
import { formatINR } from "@/lib/menu-rules";

interface Row {
  id: string;
  customer: { name: string; email: string };
  planName: string;
  slotName: string;
  status: string;
  startDate: string;
  endDate: string;
  mealsTotal: number;
  skips: number;
  pauses: number;
}

interface Count {
  date: string;
  slotId: string;
  count: number;
}

interface Detail {
  status: string;
  remaining: number;
  used: number;
  upcoming: string[];
  cutoffTime: string;
  pricePaise: number;
  skips: Array<{ date: string; reason: string | null }>;
  pauses: Array<{ start: string; end: string | null; extensionDays: number }>;
  adjustments: Array<{ kind: string; reason: string }>;
}

export function SubscriberBoard({
  messes,
  selectedId
}: {
  messes: Array<{ id: string; name: string }>;
  selectedId: string;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [counts, setCounts] = useState<Count[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);

  async function load(messId: string, st: string) {
    const params = st ? `?status=${st}` : "";
    const res = await fetch(`/api/messes/${messId}/subscriptions${params}`, { cache: "no-store" });
    if (!res.ok) {
      setError("Could not load subscribers.");
      return;
    }
    const body = (await res.json()) as { subscriptions: Row[]; upcomingCounts: Count[] };
    setRows(body.subscriptions);
    setCounts(body.upcomingCounts);
  }

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/messes/${selectedId}/subscriptions`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("load");
        const body = (await res.json()) as { subscriptions: Row[]; upcomingCounts: Count[] };
        if (cancelled) return;
        setRows(body.subscriptions);
        setCounts(body.upcomingCounts);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load subscribers.");
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  async function expand(id: string) {
    if (expanded === id) {
      setExpanded(null);
      return;
    }
    setExpanded(id);
    setDetail(null);
    const res = await fetch(`/api/subscriptions/${id}`, { cache: "no-store" });
    if (!res.ok) {
      setError("Could not load subscription detail.");
      return;
    }
    setDetail(((await res.json()) as { subscription: Detail }).subscription);
  }

  if (error && rows === null) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Subscribers unavailable</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }
  if (rows === null || counts === null) return <LoadingBlock label="Loading subscribers…" />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Choose mess">
        {messes.map((m) => (
          <Button
            key={m.id}
            variant={m.id === selectedId ? "default" : "outline"}
            size="sm"
            onClick={() => router.push(`/owner/subscribers?mess=${m.id}`)}
          >
            {m.name}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming subscriber demand</CardTitle>
          <CardDescription>
            Committed meals per slot for the next 7 days — the same numbers customers see as
            upcoming meals. Kitchen prep sheets build on this in Phase 7.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {counts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No committed meals in the next 7 days.</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {counts.map((c) => (
                <li
                  key={`${c.date}-${c.slotId}`}
                  className="tnum rounded-lg border px-3 py-2 text-sm"
                >
                  {c.date} · <span className="font-semibold">{c.count}</span>{" "}
                  {c.count === 1 ? "meal" : "meals"}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <form
        className="flex flex-wrap items-end gap-3"
        aria-label="Filter subscribers"
        onSubmit={(e) => {
          e.preventDefault();
          setRows(null);
          void load(selectedId, status);
        }}
      >
        <Field>
          <FieldLabel htmlFor="sub-status">Status</FieldLabel>
          <select
            id="sub-status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-9 rounded-lg border border-input bg-transparent px-2 text-sm"
          >
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="PENDING_PAYMENT">Pending payment</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </Field>
        <Button type="submit" variant="outline">
          Filter
        </Button>
      </form>

      {rows.length === 0 ? (
        <EmptyBlock
          title="No subscribers yet"
          description="Sell a plan above. Purchases land here with live states the moment payment succeeds."
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {rows.map((row) => (
            <Card key={row.id}>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2">
                  {row.customer.name}
                  <StatusBadge status={row.status} />
                </CardTitle>
                <CardDescription>
                  {row.planName} · {row.slotName} · {row.customer.email}
                  <br />
                  <span className="tnum">
                    {row.startDate} → {row.endDate}
                  </span>{" "}
                  · {row.mealsTotal} meals · {row.skips} skips · {row.pauses} pauses
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void expand(row.id)}
                    aria-expanded={expanded === row.id}
                  >
                    {expanded === row.id ? "Hide schedule" : "Show schedule"}
                  </Button>
                </div>
                {expanded === row.id &&
                  (detail ? (
                    <div className="flex flex-col gap-2 text-sm">
                      <p>
                        Balance: <span className="tnum font-semibold">{detail.remaining}</span> of{" "}
                        <span className="tnum">{row.mealsTotal}</span> · cutoff{" "}
                        <span className="tnum">{detail.cutoffTime}</span> · paid{" "}
                        <span className="tnum">{formatINR(detail.pricePaise)}</span>
                      </p>
                      <p className="text-muted-foreground">
                        Upcoming:{" "}
                        {detail.upcoming.length === 0
                          ? "none"
                          : detail.upcoming.slice(0, 10).join(", ")}
                        {detail.upcoming.length > 10 ? ` +${detail.upcoming.length - 10} more` : ""}
                      </p>
                      {detail.pauses.length > 0 && (
                        <p className="text-muted-foreground">
                          Pauses:{" "}
                          {detail.pauses
                            .map((p) => `${p.start}→${p.end ?? "open"} (+${p.extensionDays}d)`)
                            .join("; ")}
                        </p>
                      )}
                      {detail.adjustments.length > 0 && (
                        <p className="text-muted-foreground">
                          Adjustments:{" "}
                          {detail.adjustments.map((a) => `${a.kind}: ${a.reason}`).join("; ")}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-1.5">
                        <Badge variant="outline">{detail.skips.length} skipped dates</Badge>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Loading schedule…</p>
                  ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
