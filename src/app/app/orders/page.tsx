import Link from "next/link";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/data/PageHeader";
import { StatusBadge } from "@/components/data/StatusBadge";
import { EmptyBlock } from "@/components/data/StateBlock";
import { ReceiptText } from "lucide-react";
import { requirePageAccess } from "@/lib/auth-guards";
import { formatINR } from "@/lib/menu-rules";

export const metadata = { title: "Orders" };

export default async function CustomerOrdersPage() {
  const user = await requirePageAccess("/app/orders");
  const orders = await db.order.findMany({
    where: { customerId: user.id },
    include: {
      mess: { select: { name: true, slug: true } },
      items: true,
      payments: { orderBy: { createdAt: "desc" }, take: 1 }
    },
    orderBy: { createdAt: "desc" },
    take: 100
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Customer · Orders"
        title="Orders"
        description="Every one-time order with payment and fulfillment status."
      />
      {orders.length === 0 ? (
        <EmptyBlock
          icon={<ReceiptText />}
          title="No orders yet"
          description="Discover a verified kitchen and place your first order."
          action={<Button render={<Link href="/discover" />}>Find a mess</Button>}
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {orders.map((order) => (
            <Card key={order.id}>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2">
                  {order.mess.name}
                  <StatusBadge status={order.status} />
                </CardTitle>
                <CardDescription>
                  <span className="tnum">{order.serviceDate.toISOString().slice(0, 10)}</span> ·{" "}
                  {order.fulfillment === "DELIVERY" ? "Delivery" : "Pickup"} ·{" "}
                  {order.items.reduce((n, i) => n + i.qty, 0)} items
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-2">
                <p className="tnum text-base font-semibold">{formatINR(order.payablePaise)}</p>
                <div className="flex items-center gap-2">
                  {order.payments[0] && (
                    <Badge variant="outline">{order.payments[0].status.toLowerCase()}</Badge>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    render={<Link href={`/app/orders/${order.id}`} />}
                  >
                    Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
