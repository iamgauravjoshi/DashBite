import { ShellPlaceholder } from "@/components/data/ShellPlaceholder";
import { requirePageAccess } from "@/lib/auth-guards";

export const metadata = { title: "Settings" };

export default async function OwnerSettingsPage() {
  await requirePageAccess("/owner/settings");
  return (
    <ShellPlaceholder
      eyebrow="Owner · Settings"
      title="Settings"
      description="Business profile, hours, holidays, and service areas. Profile editing arrives with Phase 3."
      phase="Arrives in Phase 3"
    />
  );
}
