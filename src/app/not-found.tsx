import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyBlock } from "@/components/data/StateBlock";
import { PublicShell } from "@/components/layout/PublicShell";

export default function NotFound() {
  return (
    <PublicShell>
      <div className="mx-auto w-full max-w-2xl px-4 py-16 md:px-6">
        <EmptyBlock
          icon={<SearchX />}
          title="Page not found"
          description="The page moved or never existed. Mess discovery, orders, and consoles live under their own sections."
          action={<Button render={<Link href="/" />}>Back to home</Button>}
        />
      </div>
    </PublicShell>
  );
}
