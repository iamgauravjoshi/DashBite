"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ErrorBlock } from "@/components/data/StateBlock";

export default function RootError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-10 md:px-6">
      <ErrorBlock
        title="Something went wrong"
        description={
          error.digest
            ? `The page hit an error (reference ${error.digest}). Your data is safe — try again.`
            : "The page hit an error. Your data is safe — try again or go home."
        }
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={reset}>Try again</Button>
        <Button variant="outline" render={<Link href="/" />}>
          Go home
        </Button>
      </div>
    </div>
  );
}
