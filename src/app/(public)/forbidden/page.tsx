import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyBlock } from "@/components/data/StateBlock";

export const metadata = { title: "Not allowed" };

export default function ForbiddenPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-16">
      <EmptyBlock
        icon={<ShieldAlert />}
        title="This area is not for your role"
        description="Your account is fine — this console belongs to a different role. Use your home instead."
        action={<Button render={<Link href="/" />}>Back to home</Button>}
      />
    </div>
  );
}
