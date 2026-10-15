import { AppShell } from "@/components/layout/AppShell";

export default function DeliveryLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell role="delivery" roleLabel="Delivery preview">
      {children}
    </AppShell>
  );
}
