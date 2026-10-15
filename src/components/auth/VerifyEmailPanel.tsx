"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { ErrorBlock, LoadingBlock, SuccessBlock } from "@/components/data/StateBlock";

type State =
  | { kind: "verifying" }
  | { kind: "done" }
  | { kind: "error"; message: string }
  | { kind: "resend" };

export function VerifyEmailPanel({ notice }: { notice: string | null }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [state, setState] = useState<State>(token ? { kind: "verifying" } : { kind: "resend" });
  const [email, setEmail] = useState("");
  const [resendError, setResendError] = useState<string | null>(null);
  const [resendOk, setResendOk] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    authClient.verifyEmail({ query: { token } }).then(({ error }) => {
      if (cancelled) return;
      if (error) {
        setState({ kind: "error", message: "This link is invalid or expired." });
      } else {
        setState({ kind: "done" });
        router.refresh();
      }
    });
    return () => {
      cancelled = true;
    };
  }, [token, router]);

  async function resend(event: React.FormEvent) {
    event.preventDefault();
    if (!email.includes("@")) {
      setResendError("Enter the email you signed up with.");
      return;
    }
    setResendError(null);
    setResending(true);
    const { error } = await authClient.sendVerificationEmail({
      email: email.trim().toLowerCase(),
      callbackURL: "/app"
    });
    setResending(false);
    if (error) {
      setResendError("Could not resend. Check the address and try again.");
      return;
    }
    setResendOk(true);
  }

  return (
    <div className="flex w-full max-w-md flex-col gap-4">
      {notice === "sent" && (
        <SuccessBlock
          title="Account created"
          description="We sent a verification link to your email. Open it to activate your account, then sign in."
        />
      )}
      {notice === "required" && (
        <Alert>
          <AlertTitle>Verification needed</AlertTitle>
          <AlertDescription>Sign-in stays locked until your email is verified.</AlertDescription>
        </Alert>
      )}
      {state.kind === "verifying" && <LoadingBlock label="Verifying your email…" />}
      {state.kind === "done" && (
        <>
          <SuccessBlock
            title="Email verified"
            description="Your account is active. Sign in to reach your console."
          />
          <Button render={<Link href="/sign-in" />}>Sign in</Button>
        </>
      )}
      {state.kind === "error" && (
        <ErrorBlock title="Link did not work" description={state.message} />
      )}
      {(state.kind === "error" || state.kind === "resend") && (
        <Card>
          <CardHeader>
            <CardTitle>Resend the link</CardTitle>
            <CardDescription>Enter your sign-up email for a fresh link.</CardDescription>
          </CardHeader>
          <CardContent>
            {resendOk ? (
              <SuccessBlock
                title="Link sent"
                description="Check your inbox for the fresh verification link."
              />
            ) : (
              <form onSubmit={resend} aria-label="Resend verification" noValidate>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="ve-email">Email</FieldLabel>
                    <Input
                      id="ve-email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </Field>
                  {resendError && (
                    <Alert variant="destructive">
                      <AlertTitle>Could not resend</AlertTitle>
                      <AlertDescription>{resendError}</AlertDescription>
                    </Alert>
                  )}
                  <Button type="submit" disabled={resending} className="w-full">
                    {resending && <Spinner data-icon="inline-start" />}
                    {resending ? "Sending…" : "Resend link"}
                  </Button>
                </FieldGroup>
              </form>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
