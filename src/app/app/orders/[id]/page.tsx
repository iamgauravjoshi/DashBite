import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PageHeader } from "@/components/data/PageHeader";
import { StatusBadge } from "@/components/data/StatusBadge";
import { SuccessBlock } from "@/components/data/StateBlock";
import { CancelOrderButton } from "@/components/order/CancelOrderButton";
import { requirePageAccess } from "@/lib/auth-guards";
import { visibleOrder } from "@/lib/order-access";
import { formatINR } from "@/lib/menu-rules";

export const metadata = { title: "Order details" };

export default async function CustomerOrderDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const { id } = await params;
  const { notice } = await searchParams;
  const user = await requirePageAccess(`/app/orders/${id}`);
  const order = await visibleOrder(user.id, user.role, id);
  if (!order || order.customerId !== user.id) notFound();
  const payment = order.payments[0] ?? null;
  const cancellable = order.status === "PENDING_PAYMENT" || order.status === "CONFIRMED";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Customer · Order"
        title={order.mess.name}
        description={`Service date ${order.serviceDate.toISOString().slice(0, 10)} · ${order.fulfillment === "DELIVERY" ? "Delivery" : "Pickup"}`}
        actions={
          <Button variant="outline" render={<Link href="/app/orders" />}>
            All orders
          </Button>
        }
      />
      {notice === "soldout" && (
        <Alert>
          <AlertTitle>Kitchen just filled up</AlertTitle>
          <AlertDescription>
            This slot sold out while paying. No money was kept — any captured amount was refunded
            automatically.
          </AlertDescription>
        </Alert>
      )}
      {order.status === "CONFIRMED" && (
        <SuccessBlock
          title="Order confirmed"
          description="The kitchen has your ticket. Show up for pickup or expect delivery per the mess note."
        />
      )}
      <div className="flex flex-wrap gap-2">
        <StatusBadge status={order.status} />
        {payment && <Badge variant="outline">payment {payment.status.toLowerCase()}</Badge>}
        {order.fulfillmentRecord && (
          <Badge variant="secondary">
            {order.fulfillment === "DELIVERY" ? "delivery" : "pickup"} ·{" "}
            {order.fulfillmentRecord.status.toLowerCase().replace(/_/g, " ")}
          </Badge>
        )}
        {order.cancelReason && (
          <Badge variant="outline">{order.cancelReason.toLowerCase().replace(/_/g, " ")}</Badge>
        )}
      </div>
      {order.fulfillmentRecord && order.fulfillmentRecord.attempts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Handover timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="flex flex-col gap-1.5 text-sm">
              {order.fulfillmentRecord.attempts.map((attempt) => (
                <li key={attempt.id} className="flex flex-wrap gap-2 text-muted-foreground">
                  <StatusBadge status={attempt.action} />
                  {attempt.reason && <span>{attempt.reason.toLowerCase().replace(/_/g, " ")}</span>}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <ul className="flex flex-col gap-1.5 text-sm">
            {order.items.map((item) => (
              <li key={item.id} className="flex justify-between gap-2">
                <span>
                  {item.name} × <span className="tnum">{item.qty}</span>
                </span>
                <span className="tnum">{formatINR(item.pricePaise * item.qty)}</span>
              </li>
            ))}
          </ul>
          <div className="flex justify-between text-sm">
            <span>Delivery</span>
            <span className="tnum">{formatINR(order.deliveryFeePaise)}</span>
          </div>
          <div className="flex justify-between text-base font-semibold">
            <span>Total paid</span>
            <span className="tnum">{formatINR(order.payablePaise)}</span>
          </div>
          {order.payments.flatMap((p) => p.refunds).length > 0 && (
            <div className="flex flex-col gap-1 text-sm text-muted-foreground">
              {order.payments.flatMap((p) =>
                p.refunds.map((r) => (
                  <p key={r.id}>
                    Refund <span className="tnum">{formatINR(r.amountPaise)}</span> ·{" "}
                    {r.status.toLowerCase()} · {r.reason.toLowerCase().replace(/_/g, " ")}
                  </p>
                ))
              )}
            </div>
          )}
          {cancellable && (
            <div>
              <CancelOrderButton
                orderId={order.id}
                cutoffNote="Confirmed orders cancel only before the slot cutoff; pending ones cancel anytime."
              />
            </div>
          )}
          <CardDescription>
            Cancelling a confirmed meal frees the kitchen slot and refunds automatically.
          </CardDescription>
        </CardContent>
      </Card>
    </div>
  );
}
