import { ShellPlaceholder } from "@/components/data/ShellPlaceholder";

export const metadata = { title: "Finance" };

export default function AdminFinancePage() {
  return (
    <ShellPlaceholder
      eyebrow="Admin · Finance"
      title="Finance"
      description="Gross order value, commissions, payment costs, refunds, and owner payables — reconciled to underlying records. Arrives with Phase 10."
      phase="Arrives in Phase 10"
    />
  );
}
