"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { MessForm, emptyMessForm } from "@/components/mess/MessForm";
import type { MessPayload } from "@/lib/mess-validation";

export function NewMessForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  async function create(payload: MessPayload) {
    setServerError(null);
    setPending(true);
    const res = await fetch("/api/messes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    const body = (await res.json().catch(() => null)) as { mess?: { id?: string } } | null;
    setPending(false);
    if (!res.ok || !body?.mess?.id) {
      setServerError("Could not register. Check the details and try again.");
      return;
    }
    router.push(`/owner/settings?mess=${body.mess.id}`);
  }

  return (
    <MessForm
      initial={emptyMessForm}
      submitLabel="Register mess as draft"
      onSubmit={create}
      pending={pending}
      serverError={serverError}
    />
  );
}
