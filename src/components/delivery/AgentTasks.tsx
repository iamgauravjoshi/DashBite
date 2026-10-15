"use client";

import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
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
import { PackageCheck } from "lucide-react";

interface Task {
  id: string;
  messId: string;
  status: string;
  order: {
    id: string;
    serviceDate: string;
    items: Array<{ name: string; qty: number }>;
    customer: { name: string; phone: string | null };
    address: {
      label: string;
      line1: string;
      line2: string | null;
      locality: string;
      city: string;
      pincode: string;
    } | null;
  };
  mess: { name: string; phone: string };
}

export function AgentTasks() {
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [reason, setReason] = useState("CUSTOMER_UNAVAILABLE");
  const [note, setNote] = useState("");

  async function load() {
    const res = await fetch("/api/delivery/tasks", { cache: "no-store" });
    if (!res.ok) {
      setError("Could not load your tasks.");
      return;
    }
    setTasks(((await res.json()) as { tasks: Task[] }).tasks);
  }

  useEffect(() => {
    let cancelled = false;
    fetch("/api/delivery/tasks", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("load");
        const body = (await res.json()) as { tasks: Task[] };
        if (!cancelled) setTasks(body.tasks);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load your tasks.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function advance(task: Task, to: string) {
    setError(null);
    setPending(`${task.id}:${to}`);
    const res = await fetch(`/api/messes/${task.messId}/fulfillment/${task.id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ to })
    });
    setPending(null);
    if (!res.ok) {
      setError("Move failed. Reload and try again.");
      return;
    }
    await load();
  }

  async function fail(task: Task) {
    setError(null);
    setPending(`${task.id}:fail`);
    const res = await fetch(`/api/messes/${task.messId}/fulfillment/${task.id}/fail`, {
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

  if (error && tasks === null) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Tasks unavailable</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }
  if (tasks === null) return <LoadingBlock label="Loading your tasks…" />;

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Action failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {tasks.length === 0 ? (
        <EmptyBlock
          icon={<PackageCheck />}
          title="Nothing assigned"
          description="New parcels from mess owners appear here with the customer address and packing list."
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {tasks.map((task) => (
            <Card key={task.id}>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2">
                  {task.order.customer.name}
                  <StatusBadge status={task.status} />
                </CardTitle>
                <CardDescription>
                  {task.mess.name} ·{" "}
                  <span className="tnum">{task.order.serviceDate.slice(0, 10)}</span>
                  {task.order.customer.phone && (
                    <>
                      {" "}
                      · <span className="tnum">{task.order.customer.phone}</span>
                    </>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 text-sm">
                <p className="text-muted-foreground">
                  {task.order.items.map((i) => `${i.name} × ${i.qty}`).join(" · ")}
                </p>
                {task.order.address ? (
                  <p>
                    <Badge variant="secondary">{task.order.address.label}</Badge>{" "}
                    {task.order.address.line1}
                    {task.order.address.line2 ? `, ${task.order.address.line2}` : ""},{" "}
                    {task.order.address.locality}, {task.order.address.city}{" "}
                    <span className="tnum">{task.order.address.pincode}</span>
                  </p>
                ) : (
                  <p className="text-muted-foreground">Self-pickup by customer — no drop needed.</p>
                )}
                <div className="flex flex-wrap gap-2">
                  {task.status === "ASSIGNED" && (
                    <Button
                      size="sm"
                      disabled={pending !== null}
                      onClick={() => void advance(task, "DISPATCHED")}
                    >
                      {pending === `${task.id}:DISPATCHED` && <Spinner data-icon="inline-start" />}
                      Start delivery
                    </Button>
                  )}
                  {task.status === "DISPATCHED" && (
                    <Button
                      size="sm"
                      disabled={pending !== null}
                      onClick={() => void advance(task, "DELIVERED")}
                    >
                      {pending === `${task.id}:DELIVERED` && <Spinner data-icon="inline-start" />}
                      Mark delivered
                    </Button>
                  )}
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
                          The parcel stays assigned to you — the mess reviews the log.
                        </DialogDescription>
                      </DialogHeader>
                      <Field>
                        <FieldLabel htmlFor={`ar-${task.id}`}>Reason</FieldLabel>
                        <select
                          id={`ar-${task.id}`}
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
                        <FieldLabel htmlFor={`an-${task.id}`}>Note</FieldLabel>
                        <Input
                          id={`an-${task.id}`}
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          placeholder="Gate locked…"
                        />
                      </Field>
                      <DialogFooter>
                        <Button disabled={pending !== null} onClick={() => void fail(task)}>
                          Record attempt
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
                {pending?.startsWith(task.id) && <Spinner data-icon="inline-start" />}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
