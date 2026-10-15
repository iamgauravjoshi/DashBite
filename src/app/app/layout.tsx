import { AppShell } from "@/components/layout/AppShell";
import { requirePageAccess } from "@/lib/auth-guards";

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageAccess("/app");
  return (
    <AppShell role="customer" roleLabel="Customer" user={user}>
      {children}
    </AppShell>
  );
}
