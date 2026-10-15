import { ShellPlaceholder } from "@/components/data/ShellPlaceholder";

export const metadata = { title: "Messes" };

export default function AdminMessesPage() {
  return (
    <ShellPlaceholder
      eyebrow="Admin · Messes"
      title="Messes"
      description="All listings with verification and publication states. Arrives with Phase 3."
      phase="Arrives in Phase 3"
    />
  );
}
