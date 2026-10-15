"use client";

import { useState } from "react";
import { UserPlus, UserX } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { EmptyBlock } from "@/components/data/StateBlock";

interface StaffRow {
  userId: string;
  user: { id: string; name: string; email: string };
}

export function StaffManager({ messId, initial }: { messId: string; initial: StaffRow[] }) {
  const [staff, setStaff] = useState<StaffRow[]>(initial);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch(`/api/messes/${messId}/staff`, { cache: "no-store" });
    if (!res.ok) {
      setError("Could not load staff. Reload and try again.");
      return;
    }
    const body = (await res.json()) as { staff: StaffRow[] };
    setStaff(body.staff);
  }

  async function add(event: React.FormEvent) {
    event.preventDefault();
    if (!email.includes("@")) {
      setError("Enter the staff member's sign-up email.");
      return;
    }
    setError(null);
    setPending(true);
    const res = await fetch(`/api/messes/${messId}/staff`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: email.trim().toLowerCase() })
    });
    setPending(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: { code?: string } } | null;
      setError(
        body?.error?.code === "NOT_STAFF"
          ? "No staff account uses this email. They need to sign up first (choose Staff), verify, then you can add them here."
          : body?.error?.code === "ALREADY_MEMBER"
            ? "Already assigned to this mess."
            : body?.error?.code === "STAFF_INACTIVE"
              ? "That account is not active or verified yet."
              : "Could not add. Check the email and try again."
      );
      return;
    }
    setEmail("");
    await refresh();
  }

  async function remove(userId: string) {
    setBusyId(userId);
    const res = await fetch(`/api/messes/${messId}/staff?userId=${encodeURIComponent(userId)}`, {
      method: "DELETE"
    });
    setBusyId(null);
    if (!res.ok) {
      setError("Could not remove. Try again.");
      return;
    }
    await refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Staff access</CardTitle>
        <CardDescription>
          Assigned staff see this mess under Orders, Kitchen, and Deliveries. Only registered,
          verified staff accounts can be added.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form onSubmit={add} aria-label="Add staff" noValidate>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="staff-email">Staff email</FieldLabel>
              <div className="flex gap-2">
                <Input
                  id="staff-email"
                  type="email"
                  placeholder="staff@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Button type="submit" disabled={pending}>
                  {pending ? (
                    <Spinner data-icon="inline-start" />
                  ) : (
                    <UserPlus data-icon="inline-start" />
                  )}
                  {pending ? "Adding…" : "Add"}
                </Button>
              </div>
            </Field>
          </FieldGroup>
        </form>
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Staff update failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {staff.length === 0 ? (
          <EmptyBlock
            icon={<UserPlus />}
            title="No staff assigned"
            description="Add verified staff accounts by email. They never see menus, subscribers, revenue, or settings."
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {staff.map((row) => (
              <li
                key={row.userId}
                className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{row.user.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{row.user.email}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busyId === row.userId}
                  onClick={() => void remove(row.userId)}
                  aria-label={`Remove ${row.user.email}`}
                >
                  <UserX data-icon="inline-start" />
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
