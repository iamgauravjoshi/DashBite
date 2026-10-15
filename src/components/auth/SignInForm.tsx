"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { signInSchema } from "@/lib/auth-validation";
import { ROLE_HOME, UserRoleSchema } from "@/lib/roles";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

function safeNext(next: string | null, fallback: string): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return fallback;
  return next;
}

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<string[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setServerError(null);
    const parsed = signInSchema.safeParse({ email, password });
    if (!parsed.success) {
      setFieldErrors(parsed.error.issues.map((i) => i.message));
      return;
    }
    setFieldErrors([]);
    setPending(true);
    const { data, error } = await authClient.signIn.email({
      email: parsed.data.email,
      password: parsed.data.password
    });
    setPending(false);
    if (error) {
      const status = (error as { status?: number }).status;
      if (status === 403) {
        setServerError("Verify your email first — check your inbox for the link.");
      } else {
        setServerError("Incorrect email or password. Nothing was changed.");
      }
      return;
    }
    const role = UserRoleSchema.safeParse(
      (data as unknown as { user?: { role?: unknown } })?.user?.role
    );
    const home = role.success ? ROLE_HOME[role.data] : "/app";
    router.push(safeNext(searchParams.get("next"), home));
    router.refresh();
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Welcome back</CardTitle>
        <CardDescription>Sign in to reach your console.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} aria-label="Sign in" noValidate>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="si-email">Email</FieldLabel>
              <Input
                id="si-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="si-password">Password</FieldLabel>
              <Input
                id="si-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <FieldDescription>
                <Link
                  href="/forgot-password"
                  className="underline underline-offset-4 hover:text-foreground"
                >
                  Forgot your password?
                </Link>
              </FieldDescription>
            </Field>
            {fieldErrors.length > 0 && (
              <Alert variant="destructive">
                <AlertTitle>Check your details</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc pl-4">
                    {fieldErrors.map((e) => (
                      <li key={e}>{e}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
            {serverError && (
              <Alert variant="destructive">
                <AlertTitle>Could not sign in</AlertTitle>
                <AlertDescription>
                  {serverError}{" "}
                  <Link href="/verify-email" className="underline underline-offset-4">
                    Resend verification
                  </Link>
                </AlertDescription>
              </Alert>
            )}
            <Button type="submit" disabled={pending} className="w-full">
              {pending && <Spinner data-icon="inline-start" />}
              {pending ? "Signing in…" : "Sign in"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              New here?{" "}
              <Link href="/sign-up" className="underline underline-offset-4 hover:text-foreground">
                Create an account
              </Link>
            </p>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
