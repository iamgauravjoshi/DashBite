import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/data/PageHeader";
import { customerNav } from "@/config/navigation";

export const metadata = { title: "My meals" };

export default function CustomerHomePage() {
  const cards = customerNav.items.filter((item) => item.href !== "/app");
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Customer"
        title="My meals"
        description="Upcoming meals, orders, subscriptions, and support. Sign-in arrives in Phase 2 — this shell shows where everything will live."
      />
      <div className="grid gap-4 sm:grid-cols-2">
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
