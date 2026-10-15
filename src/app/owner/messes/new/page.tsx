import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/data/PageHeader";
import { NewMessForm } from "@/components/mess/NewMessForm";
import { requirePageAccess } from "@/lib/auth-guards";

export const metadata = { title: "Register mess" };

export default async function NewMessPage() {
  await requirePageAccess("/owner/settings");
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Owner · Register"
        title="Register your mess"
        description="Saved as a private draft first. Submit it for review when the details are complete."
        actions={
          <Button variant="outline" render={<Link href="/owner/settings" />}>
            Back to settings
          </Button>
        }
      />
      <NewMessForm />
    </div>
  );
}
