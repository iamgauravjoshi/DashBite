import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { requireUsableAccount } from "@/lib/auth-guards";

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUsableAccount("/owner");
  if (user.role !== "MESS_OWNER" && user.role !== "MESS_STAFF") redirect("/forbidden");
  return (
    <AppShell role="owner" roleLabel={user.role === "MESS_STAFF" ? "Staff" : "Owner"} user={user}>
      {children}
    </AppShell>
  );
}
