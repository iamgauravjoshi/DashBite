"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";

export function CancelOrderButton({
  orderId,
  cutoffNote
}: {
  orderId: string;
  cutoffNote: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function cancel() {
    setError(null);
    setPending(true);
    const res = await fetch(`/api/orders/${orderId}/cancel`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({})
    });
    setPending(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: { code?: string } } | null;
      setError(
        body?.error?.code === "NOT_CANCELLABLE"
          ? "Past the cutoff — this meal is already being prepared. Contact support for help."
          : "Could not cancel. Reload and try again."
      );
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        setError(null);
      }}
    >
      <DialogTrigger render={<Button variant="outline">Cancel order</Button>} />
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Cancel this order?</DialogTitle>
          <DialogDescription>{cutoffNote} Paid amounts return to the source.</DialogDescription>
        </DialogHeader>
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Could not cancel</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Keep order
          </Button>
          <Button variant="destructive" disabled={pending} onClick={() => void cancel()}>
            {pending && <Spinner data-icon="inline-start" />}
            Confirm cancellation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
