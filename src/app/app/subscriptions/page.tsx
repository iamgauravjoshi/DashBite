import { ShellPlaceholder } from "@/components/data/ShellPlaceholder";

export const metadata = { title: "Subscriptions" };

export default function CustomerSubscriptionsPage() {
  return (
    <ShellPlaceholder
      eyebrow="Customer · Subscriptions"
      title="Subscriptions"
      description="Plans, upcoming meals, skip and pause, remaining meals, and history. The recurring-meal lifecycle arrives with Phase 6."
      phase="Arrives in Phase 6"
    />
  );
}
