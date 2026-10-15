import { ShellPlaceholder } from "@/components/data/ShellPlaceholder";
import { requirePageAccess } from "@/lib/auth-guards";

export const metadata = { title: "Revenue" };

export default async function OwnerRevenuePage() {
  await requirePageAccess("/owner/revenue");
  return (
    <ShellPlaceholder
      eyebrow="Owner · Revenue"
      title="Revenue"
      description="Order value, commissions, refunds, and owner payables. Basic reports arrive with Phase 10."
      phase="Arrives in Phase 10"
    />
  );
}
