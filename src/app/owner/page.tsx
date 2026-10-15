import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/data/PageHeader";
import { StatusBadge } from "@/components/data/StatusBadge";
import { ownerNav } from "@/config/navigation";

export const metadata = { title: "Mess console" };

export default function OwnerHomePage() {
  const cards = ownerNav.items.filter((item) => item.href !== "/owner");
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Mess owner"
        title="Mess console"
        description="Menus, orders, subscribers, kitchen, deliveries, revenue. Staff see Orders, Kitchen, and Deliveries only — enforced server-side from Phase 2."
        actions={<StatusBadge status="Draft" label="Verification: draft" />}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((item) => (
          <Card key={item.href}>
            <CardHeader>
              <CardTitle>{item.label}</CardTitle>
              <CardDescription>{item.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="sm" render={<Link href={item.href} />}>
                Open {item.label.toLowerCase()}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
