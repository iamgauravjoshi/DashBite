import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/data/PageHeader";
import { deliveryNav } from "@/config/navigation";

export const metadata = { title: "Delivery tasks" };

export default function DeliveryHomePage() {
  const cards = deliveryNav.items.filter((item) => item.href !== "/delivery");
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Delivery"
        title="My tasks"
        description="Assigned pickups and drops. Addresses and instructions appear only for your assigned stops (Phase 8)."
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
