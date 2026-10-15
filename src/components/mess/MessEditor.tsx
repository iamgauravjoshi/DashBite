"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { StatusBadge } from "@/components/data/StatusBadge";
import { SuccessBlock } from "@/components/data/StateBlock";
import { MessForm, type MessFormValues } from "@/components/mess/MessForm";
import type { MessPayload } from "@/lib/mess-validation";

interface MessRecord {
  id: string;
  name: string;
  verificationStatus: string;
  published: boolean;
  verificationReason: string | null;
  submittedAt: string | null;
  decidedAt: string | null;
}

interface MessEvent {
  id: string;
  from: string;
  to: string;
  reason: string | null;
  createdAt: string;
}

const STATUS_COPY: Record<string, string> = {
  DRAFT: "Complete the profile, then submit it for review.",
  SUBMITTED: "With the review team. You can withdraw it back to draft.",
  UNDER_REVIEW: "An admin is reviewing it. Editing is locked meanwhile.",
  APPROVED: "Approved. Publish it to appear in discovery.",
  REJECTED: "Needs changes — see the reason, edit, and resubmit.",
  SUSPENDED: "Suspended and hidden. Contact platform support to appeal."
};

export function MessEditor({
  mess,
  events,
  initial
}: {
  mess: MessRecord;
  events: MessEvent[];
  initial: MessFormValues;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [actionPending, setActionPending] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const editable = mess.verificationStatus === "DRAFT" || mess.verificationStatus === "REJECTED";
  const canSubmit = mess.verificationStatus === "DRAFT" || mess.verificationStatus === "REJECTED";
  const canWithdraw = mess.verificationStatus === "SUBMITTED";
  const canPublishToggle = mess.verificationStatus === "APPROVED";

  async function save(payload: MessPayload) {
    setServerError(null);
    setSaved(false);
    setPending(true);
    const res = await fetch(`/api/messes/${mess.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    setPending(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as {
        error?: { code?: string; details?: string[] };
      } | null;
      setServerError(
        body?.error?.details?.join(" ") ??
          (body?.error?.code === "NOT_EDITABLE"
            ? "Locked while under review. Withdraw it first to edit."
            : "Could not save. Try again.")
      );
      return;
    }
    setSaved(true);
    router.refresh();
  }

  async function transition(to: "SUBMITTED" | "DRAFT") {
    setServerError(null);
    setActionPending(to);
    const res = await fetch(`/api/messes/${mess.id}/submit`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ to })
    });
    setActionPending(null);
    if (!res.ok) {
      setServerError(to === "SUBMITTED" ? "Could not submit for review." : "Could not withdraw.");
      return;
    }
    router.refresh();
  }

  async function togglePublish(next: boolean) {
    setServerError(null);
    setActionPending("publish");
    const res = await fetch(`/api/messes/${mess.id}/publish`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ published: next })
    });
    setActionPending(null);
    if (!res.ok) {
      setServerError("Only approved messes can be published.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            Listing status
            <StatusBadge status={mess.verificationStatus} />
            {mess.published ? (
              <Badge>Published</Badge>
            ) : (
              <Badge variant="outline">Unpublished</Badge>
            )}
          </CardTitle>
          <CardDescription>{STATUS_COPY[mess.verificationStatus]}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {mess.verificationReason && (
            <Alert>
              <AlertTitle>Reviewer note</AlertTitle>
              <AlertDescription>{mess.verificationReason}</AlertDescription>
            </Alert>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {canSubmit && (
              <Button
                disabled={actionPending !== null}
                onClick={() => void transition("SUBMITTED")}
              >
                {actionPending === "SUBMITTED" && <Spinner data-icon="inline-start" />}
                Submit for review
              </Button>
            )}
            {canWithdraw && (
              <Button
                variant="outline"
                disabled={actionPending !== null}
                onClick={() => void transition("DRAFT")}
              >
                Withdraw to draft
              </Button>
            )}
            {canPublishToggle && (
              <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
                <Switch
                  id="publish-toggle"
                  checked={mess.published}
                  disabled={actionPending !== null}
                  onCheckedChange={(v) => void togglePublish(v)}
                />
                <Label htmlFor="publish-toggle">Visible in discovery</Label>
              </div>
            )}
          </div>
          {serverError && (
            <Alert variant="destructive">
              <AlertTitle>Action failed</AlertTitle>
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}
          {events.length > 0 && (
            <>
              <Separator />
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium">Review history</p>
                <ul className="flex flex-col gap-1.5 text-sm text-muted-foreground">
                  {events.map((event) => (
                    <li key={event.id} className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={event.from} />
                      <span aria-hidden="true">→</span>
                      <StatusBadge status={event.to} />
                      {event.reason && <span className="truncate">· {event.reason}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {saved && <SuccessBlock title="Saved" description="Your mess profile is up to date." />}

      {editable ? (
        <MessForm
          initial={initial}
          submitLabel="Save mess profile"
          onSubmit={save}
          pending={pending}
          serverError={null}
        />
      ) : (
        <Alert>
          <AlertTitle>Editing locked</AlertTitle>
          <AlertDescription>
            This listing is {mess.verificationStatus.toLowerCase().replace("_", " ")}. Withdraw it
            to draft (when submitted) to make changes.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
