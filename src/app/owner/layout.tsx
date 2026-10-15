import { AppShell } from "@/components/layout/AppShell";

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell role="owner" roleLabel="Owner preview">
      {children}
    </AppShell>
  );
}
