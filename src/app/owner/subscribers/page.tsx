import { ShellPlaceholder } from "@/components/data/ShellPlaceholder";

export const metadata = { title: "Subscribers" };

export default function OwnerSubscribersPage() {
  return (
    <ShellPlaceholder
      eyebrow="Owner · Subscribers"
      title="Subscribers"
      description="Subscriber counts and subscription states feeding kitchen planning. Arrives with Phase 6."
      phase="Arrives in Phase 6"
    />
  );
}
