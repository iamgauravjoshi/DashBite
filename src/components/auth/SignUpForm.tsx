"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signUpSchema } from "@/lib/auth-validation";
import { SIGNUP_ROLES, type SignupRole } from "@/lib/roles";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const ROLE_COPY: Record<SignupRole, { title: string; hint: string }> = {
  CUSTOMER: { title: "Customer", hint: "Order meals, subscribe" },
  MESS_OWNER: { title: "Mess owner", hint: "List + run your kitchen" },
  DELIVERY_AGENT: { title: "Delivery", hint: "Fulfill assigned stops" }
};

export function SignUpForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<SignupRole>("CUSTOMER");
  const [fieldErrors, setFieldErrors] = useState<string[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setServerError(null);
    const parsed = signUpSchema.safeParse({ name, email, password, role, phone });
    if (!parsed.success) {
      setFieldErrors(parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`));
      return;
    }
    setFieldErrors([]);
    setPending(true);
    const res = await fetch("/api/auth/sign-up", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, email, password, role, phone })
    });
    const body = (await res.json().catch(() => null)) as {
      ok?: boolean;
      error?: { code?: string; message?: string; details?: string[] };
    } | null;
    setPending(false);
    if (!res.ok || !body?.ok) {
      const details = body?.error?.details?.join(" ");
      setServerError(
        body?.error?.message ??
          details ??
          "Sign-up failed. The email may already be registered — try signing in."
      );
      return;
    }
    router.push("/verify-email?notice=sent");
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Create your account</CardTitle>
        <CardDescription>
          Staff accounts are created by mess owners — public sign-up covers customers, owners, and
          delivery partners.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} aria-label="Sign up" noValidate>
          <FieldGroup>
            <Field>
              <FieldLabel>I am joining as</FieldLabel>
              <ToggleGroup
                value={[role]}
                onValueChange={(value) => {
                  const next = value[value.length - 1];
                  if (next && (SIGNUP_ROLES as readonly string[]).includes(next)) {
                    setRole(next as SignupRole);
                  }
                }}
                aria-label="Account type"
                className="flex-wrap"
              >
                {SIGNUP_ROLES.map((r) => (
                  <ToggleGroupItem key={r} value={r} aria-label={ROLE_COPY[r].title}>
                    {ROLE_COPY[r].title}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <FieldDescription>{ROLE_COPY[role].hint}</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="su-name">Full name</FieldLabel>
              <Input
                id="su-name"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="su-email">Email</FieldLabel>
              <Input
                id="su-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <FieldDescription>You will verify this address before signing in.</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="su-password">Password</FieldLabel>
              <Input
                id="su-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <FieldDescription>At least 8 characters.</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="su-phone">
                Mobile <span className="font-normal text-muted-foreground">(optional)</span>
              </FieldLabel>
              <Input
                id="su-phone"
                inputMode="numeric"
                autoComplete="tel"
                placeholder="10-digit mobile"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </Field>
            {fieldErrors.length > 0 && (
              <Alert variant="destructive">
                <AlertTitle>Check the highlighted details</AlertTitle>
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
                <AlertTitle>Sign-up failed</AlertTitle>
                <AlertDescription>{serverError}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" disabled={pending} className="w-full">
              {pending && <Spinner data-icon="inline-start" />}
              {pending ? "Creating account…" : "Create account"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Have an account?{" "}
              <Link href="/sign-in" className="underline underline-offset-4 hover:text-foreground">
                Sign in
              </Link>
            </p>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
