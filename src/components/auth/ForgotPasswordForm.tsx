"use client";

import { useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { requestResetSchema } from "@/lib/auth-validation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { SuccessBlock } from "@/components/data/StateBlock";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = requestResetSchema.safeParse({ email });
    if (!parsed.success) {
      setError("Enter a valid email address.");
      return;
    }
    setError(null);
    setPending(true);
    const { error: apiError } = await authClient.requestPasswordReset({
      email: parsed.data.email,
      redirectTo: `${window.location.origin}/reset-password`
    });
    setPending(false);
    if (apiError) {
      setError("Could not start the reset. Try again.");
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="flex w-full max-w-md flex-col gap-4">
        <SuccessBlock
          title="Check your inbox"
          description="If an account uses this email, a reset link is on its way. The link expires — use it promptly."
        />
        <Button variant="outline" render={<Link href="/sign-in" />}>
          Back to sign in
        </Button>
      </div>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Reset your password</CardTitle>
        <CardDescription>We email you a one-time link. It expires.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} aria-label="Request password reset" noValidate>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="fp-email">Email</FieldLabel>
              <Input
                id="fp-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            {error && (
              <Alert variant="destructive">
                <AlertTitle>Could not send the link</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" disabled={pending} className="w-full">
              {pending && <Spinner data-icon="inline-start" />}
              {pending ? "Sending…" : "Send reset link"}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
