import { Suspense } from "react";
import { VerifyEmailPanel } from "@/components/auth/VerifyEmailPanel";
import { LoadingBlock } from "@/components/data/StateBlock";

export const metadata = { title: "Verify email" };

export default async function VerifyEmailPage({
  searchParams
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const { notice } = await searchParams;
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center px-4 py-12">
      <Suspense fallback={<LoadingBlock label="Loading verification…" />}>
        <VerifyEmailPanel notice={notice ?? null} />
      </Suspense>
    </div>
  );
}
