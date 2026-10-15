import { PackageCheck } from "lucide-react";
import { PageHeader } from "@/components/data/PageHeader";
import { AgentTasks } from "@/components/delivery/AgentTasks";
import { requirePageAccess } from "@/lib/auth-guards";

export const metadata = { title: "Delivery tasks" };

export default async function DeliveryHomePage() {
  await requirePageAccess("/delivery");
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Delivery"
        title="My tasks"
        description="Parcels assigned to you, with customer addresses for your stops only."
      />
      <AgentTasks />
    </div>
  );
}
