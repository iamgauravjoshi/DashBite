import Link from "next/link";
import { Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyBlock } from "@/components/data/StateBlock";

export const metadata = { title: "Account unavailable" };

export default async function SuspendedPage({
  searchParams
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  const deactivated = reason === "deactivated";
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-16">
      <EmptyBlock
        icon={<Ban />}
        title={deactivated ? "Account deactivated" : "Account suspended"}
        description={
          deactivated
            ? "This account was deactivated. Contact platform support to review it — no orders or subscriptions can run meanwhile."
            : "This account was suspended for a policy reason. Contact platform support to appeal — no orders or subscriptions can run meanwhile."
        }
        action={
          <Button variant="outline" render={<Link href="/" />}>
            Back to home
          </Button>
        }
      />
    </div>
  );
}
