"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { StatusBadge } from "@/components/data/StatusBadge";
import { EmptyBlock, LoadingBlock } from "@/components/data/StateBlock";
import { History } from "lucide-react";

interface DoneTask {
  id: string;
  status: string;
  order: {
    serviceDate: string;
    customer: { name: string };
    items: Array<{ name: string; qty: number }>;
  };
  mess: { name: string };
}

export function DeliveryHistory() {
  const [tasks, setTasks] = useState<DoneTask[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/delivery/tasks?history=true", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("load");
        const body = (await res.json()) as { tasks: DoneTask[] };
        if (!cancelled) setTasks(body.tasks);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load history.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error && tasks === null) {
    return (
      <Alert variant="destructive">
        <AlertTitle>History unavailable</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }
  if (tasks === null) return <LoadingBlock label="Loading history…" />;
  if (tasks.length === 0) {
    return (
      <EmptyBlock
        icon={<History />}
        title="No completions yet"
        description="Delivered and handed-over parcels appear here as your completion record."
      />
    );
  }
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {tasks.map((task) => (
        <Card key={task.id}>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2">
              {task.order.customer.name}
              <StatusBadge status={task.status} />
            </CardTitle>
            <CardDescription>
              {task.mess.name} · <span className="tnum">{task.order.serviceDate.slice(0, 10)}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {task.order.items.map((i) => `${i.name} × ${i.qty}`).join(" · ")}
            </p>
            <div className="mt-2">
              <Badge variant="outline">Completion recorded</Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
