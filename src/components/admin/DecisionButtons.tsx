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
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";

const ACTIONS: Record<
  string,
  Array<{
    to: string;
    label: string;
    variant: "default" | "outline" | "destructive";
    needsReason: boolean;
  }>
> = {
  SUBMITTED: [
    { to: "UNDER_REVIEW", label: "Start review", variant: "default", needsReason: false },
    { to: "REJECTED", label: "Reject", variant: "destructive", needsReason: true }
  ],
  UNDER_REVIEW: [
    { to: "APPROVED", label: "Approve", variant: "default", needsReason: false },
    { to: "REJECTED", label: "Reject", variant: "destructive", needsReason: true }
  ],
  APPROVED: [{ to: "SUSPENDED", label: "Suspend", variant: "destructive", needsReason: true }],
  SUSPENDED: [{ to: "APPROVED", label: "Reinstate", variant: "outline", needsReason: true }],
  DRAFT: [],
  REJECTED: []
};

export function DecisionButtons({ messId, status }: { messId: string; status: string }) {
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const actions = ACTIONS[status] ?? [];

  if (actions.length === 0) return null;

  async function decide(to: string, needsReason: boolean) {
    if (needsReason && !reason.trim()) {
      setError("A reason is required — the owner will see it.");
      return;
    }
    setError(null);
    setPending(true);
    const res = await fetch(`/api/admin/messes/${messId}/decision`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ to, reason: reason.trim() || undefined })
    });
    setPending(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: { code?: string } } | null;
      setError(
        body?.error?.code === "REASON_REQUIRED"
          ? "A reason is required — the owner will see it."
          : "Decision failed. Reload and try again."
      );
      return;
    }
    setOpen(null);
    setReason("");
    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => (
        <Dialog
          key={action.to}
          open={open === action.to}
          onOpenChange={(v) => {
            setOpen(v ? action.to : null);
            setError(null);
          }}
        >
          <DialogTrigger
            render={
              <Button variant={action.variant} size="sm">
                {action.label}
              </Button>
            }
          />
          <DialogContent aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle>{action.label} this listing?</DialogTitle>
              <DialogDescription>
                {action.needsReason
                  ? "The owner sees this reason. Be specific so they can act on it."
                  : "This decision is recorded with your account and timestamp."}
              </DialogDescription>
            </DialogHeader>
            <FieldGroup>
              {action.needsReason && (
                <Field>
                  <FieldLabel htmlFor={`reason-${messId}-${action.to}`}>
                    Reason for owner
                  </FieldLabel>
                  <Textarea
                    id={`reason-${messId}-${action.to}`}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="What must change, and why"
                  />
                </Field>
              )}
              {!action.needsReason && (
                <FieldDescription>No reason needed for this step.</FieldDescription>
              )}
              {error && (
                <Alert variant="destructive">
                  <AlertTitle>Decision failed</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </FieldGroup>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(null)}>
                Cancel
              </Button>
              <Button
                variant={action.variant}
                disabled={pending}
                onClick={() => void decide(action.to, action.needsReason)}
              >
                {pending && <Spinner data-icon="inline-start" />}
                Confirm {action.label.toLowerCase()}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ))}
    </div>
  );
}
