import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError, requireApiUser } from "@/lib/auth-guards";
import { createOrder, expirePendingOrders } from "@/lib/payments";
import { orderCartSchema } from "@/lib/order-validation";

export async function POST(request: Request): Promise<NextResponse> {
  const result = await requireApiUser(request, ["CUSTOMER"]);
  if ("response" in result) return result.response;
  const body = await request.json().catch(() => null);
  const parsed = orderCartSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      "INVALID",
      400,
      parsed.error.issues.map((i) => i.message)
    );
  }
  await expirePendingOrders().catch(() => null);
  const created = await createOrder({ ...parsed.data, customerId: result.user.id });
  if (!created.ok) return apiError(created.code, 409);
  return NextResponse.json(
    {
      orderId: created.orderId,
      provider: created.provider,
      providerOrderId: created.providerOrderId,
      payablePaise: created.payablePaise,
      keyId: created.keyId
    },
    { status: 201 }
  );
}

export async function GET(request: Request): Promise<NextResponse> {
  const result = await requireApiUser(request, ["CUSTOMER"]);
  if ("response" in result) return result.response;
  await expirePendingOrders().catch(() => null);
  const orders = await db.order.findMany({
    where: { customerId: result.user.id },
    include: {
      mess: { select: { name: true, slug: true } },
      items: true,
      payments: { orderBy: { createdAt: "desc" }, take: 1 }
    },
    orderBy: { createdAt: "desc" },
    take: 100
  });
  return NextResponse.json({ orders });
}
