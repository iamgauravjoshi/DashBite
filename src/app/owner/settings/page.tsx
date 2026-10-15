import { ShellPlaceholder } from "@/components/data/ShellPlaceholder";

export const metadata = { title: "Settings" };

export default function OwnerSettingsPage() {
  return (
    <ShellPlaceholder
      eyebrow="Owner · Settings"
      title="Settings"
      description="Business profile, hours, holidays, and service areas. Profile editing arrives with Phase 3."
      phase="Arrives in Phase 3"
    />
  );
}
