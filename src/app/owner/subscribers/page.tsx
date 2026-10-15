import { ShellPlaceholder } from "@/components/data/ShellPlaceholder";
import { requirePageAccess } from "@/lib/auth-guards";

export const metadata = { title: "Subscribers" };

export default async function OwnerSubscribersPage() {
  await requirePageAccess("/owner/subscribers");
  return (
    <ShellPlaceholder
      eyebrow="Owner · Subscribers"
      title="Subscribers"
      description="Subscriber counts and subscription states feeding kitchen planning. Arrives with Phase 6."
      phase="Arrives in Phase 6"
    />
  );
}
