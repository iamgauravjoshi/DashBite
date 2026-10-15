"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setError(null);
    setPending(true);
    const { error: apiError } = await authClient.resetPassword({ newPassword: password, token });
    setPending(false);
    if (apiError) {
      setError("This link is invalid or expired. Request a fresh one.");
      return;
    }
    router.push("/sign-in");
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Choose a new password</CardTitle>
        <CardDescription>All other sessions are signed out when you reset.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} aria-label="Set new password" noValidate>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="rp-password">New password</FieldLabel>
              <Input
                id="rp-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <FieldDescription>At least 8 characters.</FieldDescription>
            </Field>
            {error && (
              <Alert variant="destructive">
                <AlertTitle>Could not reset</AlertTitle>
                <AlertDescription>
                  {error}{" "}
                  <Link href="/forgot-password" className="underline underline-offset-4">
                    Get a fresh link
                  </Link>
                </AlertDescription>
              </Alert>
            )}
            <Button type="submit" disabled={pending} className="w-full">
              {pending && <Spinner data-icon="inline-start" />}
              {pending ? "Saving…" : "Save new password"}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
