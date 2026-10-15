import { AppShell } from "@/components/layout/AppShell";
import { requirePageAccess } from "@/lib/auth-guards";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageAccess("/admin");
  return (
    <AppShell role="admin" roleLabel="Admin" user={user}>
      {children}
    </AppShell>
  );
}
