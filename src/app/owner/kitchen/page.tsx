import { ShellPlaceholder } from "@/components/data/ShellPlaceholder";

export const metadata = { title: "Kitchen" };

export default function OwnerKitchenPage() {
  return (
    <ShellPlaceholder
      eyebrow="Owner · Kitchen"
      title="Kitchen"
      description="Daily prep sheets and packing lists from confirmed orders plus entitled subscription meals. Arrives with Phase 7."
      phase="Arrives in Phase 7"
    />
  );
}
