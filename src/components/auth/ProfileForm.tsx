"use client";

import { useEffect, useState } from "react";
import { profileSchema } from "@/lib/auth-validation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { SuccessBlock } from "@/components/data/StateBlock";
import type { SessionUser } from "@/lib/auth-guards";

export function ProfileForm({ initial }: { initial: SessionUser }) {
  const [name, setName] = useState(initial.name);
  const [phone, setPhone] = useState("");
  const [loadedPhone, setLoadedPhone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/profile", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("load");
        const body = (await res.json()) as { profile: { phone: string | null } };
        if (cancelled) return;
        setLoadedPhone(body.profile.phone ?? "");
        setPhone(body.profile.phone ?? "");
      })
      .catch(() => {
        if (!cancelled) setError("Could not load your profile. Reload and try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = profileSchema.safeParse({ name, phone });
    if (!parsed.success) {
      setError(parsed.error.issues.map((i) => i.message).join(" "));
      return;
    }
    setError(null);
    setSaved(false);
    setPending(true);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(parsed.data)
    });
    setPending(false);
    if (!res.ok) {
      setError("Could not save. Reload and try again.");
      return;
    }
    setSaved(true);
  }

  return (
    <Card className="w-full max-w-xl">
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>
          Signed in as {initial.email} · {initial.role.toLowerCase().replace("_", " ")}. Your email
          cannot be changed here.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground" role="status">
            Loading profile…
          </p>
        ) : (
          <form onSubmit={onSubmit} aria-label="Edit profile" noValidate>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="pf-name">Full name</FieldLabel>
                <Input
                  id="pf-name"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="pf-phone">
                  Mobile <span className="font-normal text-muted-foreground">(optional)</span>
                </FieldLabel>
                <Input
                  id="pf-phone"
                  inputMode="numeric"
                  autoComplete="tel"
                  value={phone}
                  placeholder={loadedPhone ?? "10-digit mobile"}
                  onChange={(e) => setPhone(e.target.value)}
                />
                <FieldDescription>Used for order and delivery contact.</FieldDescription>
              </Field>
              {error && (
                <Alert variant="destructive">
                  <AlertTitle>Could not save</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              {saved && <SuccessBlock title="Saved" description="Your profile is up to date." />}
              <Button type="submit" disabled={pending}>
                {pending && <Spinner data-icon="inline-start" />}
                {pending ? "Saving…" : "Save profile"}
              </Button>
            </FieldGroup>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
