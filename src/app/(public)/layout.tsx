import { PublicShell } from "@/components/layout/PublicShell";
import { getSessionUser } from "@/lib/auth-guards";

export default async function PublicGroupLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  return <PublicShell user={user}>{children}</PublicShell>;
}
