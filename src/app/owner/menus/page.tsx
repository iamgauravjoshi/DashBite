import { ShellPlaceholder } from "@/components/data/ShellPlaceholder";
import { requirePageAccess } from "@/lib/auth-guards";

export const metadata = { title: "Menus" };

export default async function OwnerMenusPage() {
  await requirePageAccess("/owner/menus");
  return (
    <ShellPlaceholder
      eyebrow="Owner · Menus"
      title="Menus"
      description="Items, prices, slots, weekly recurrence, holidays, cutoffs, and capacity. Arrives with Phase 4."
      phase="Arrives in Phase 4"
    />
  );
}
