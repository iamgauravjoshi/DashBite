import { ShellPlaceholder } from "@/components/data/ShellPlaceholder";

export const metadata = { title: "Revenue" };

export default function OwnerRevenuePage() {
  return (
    <ShellPlaceholder
      eyebrow="Owner · Revenue"
      title="Revenue"
      description="Order value, commissions, refunds, and owner payables. Basic reports arrive with Phase 10."
      phase="Arrives in Phase 10"
    />
  );
}
