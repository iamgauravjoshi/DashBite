import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/data/PageHeader";
import { adminNav } from "@/config/navigation";

export const metadata = { title: "Platform admin" };

export default function AdminHomePage() {
  const cards = adminNav.items.filter((item) => item.href !== "/admin");
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Platform admin"
        title="Marketplace overview"
        description="Verification, listings, orders, and finance. Every admin action is audited from Phase 10."
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
