import { AppShell } from "@/components/layout/AppShell";
import { requirePageAccess } from "@/lib/auth-guards";

export default async function DeliveryLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageAccess("/delivery");
  return (
    <AppShell role="delivery" roleLabel="Delivery" user={user}>
      {children}
    </AppShell>
  );
}
