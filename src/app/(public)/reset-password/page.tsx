import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { Button } from "@/components/ui/button";
import { ErrorBlock } from "@/components/data/StateBlock";

export const metadata = { title: "Set new password" };

export default async function ResetPasswordPage({
  searchParams
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 px-4 py-12">
      {error ? (
        <>
          <ErrorBlock
            title="Link did not work"
            description="This reset link is invalid or expired. Request a fresh one."
          />
          <Button variant="outline" render={<Link href="/forgot-password" />}>
            Get a fresh link
          </Button>
        </>
      ) : token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <>
          <ErrorBlock
            title="Link incomplete"
            description="Open the full link from your email, token included."
          />
          <Button variant="outline" render={<Link href="/forgot-password" />}>
            Request a new link
          </Button>
        </>
      )}
    </div>
  );
}
