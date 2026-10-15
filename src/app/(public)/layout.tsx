import { PublicShell } from "@/components/layout/PublicShell";

export default function PublicGroupLayout({ children }: { children: React.ReactNode }) {
  return <PublicShell>{children}</PublicShell>;
}
