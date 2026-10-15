import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError, requireApiUser } from "@/lib/auth-guards";
import { previewSubscription, purchaseSubscription } from "@/lib/subscriptions";

export async function GET(request: Request): Promise<NextResponse> {
  const result = await requireApiUser(request, ["CUSTOMER"]);
  if ("response" in result) return result.response;
  const subscriptions = await db.subscription.findMany({
    where: { customerId: result.user.id },
    include: { plan: { include: { slot: true } }, mess: { select: { name: true, slug: true } } },
    orderBy: { createdAt: "desc" },
    take: 100
  });
  return NextResponse.json({ subscriptions });
}

export async function POST(request: Request): Promise<NextResponse> {
  const result = await requireApiUser(request, ["CUSTOMER"]);
  if ("response" in result) return result.response;
  const body = (await request.json().catch(() => null)) as { planId?: unknown } | null;
  if (typeof body?.planId !== "string" || !body.planId) return apiError("INVALID", 400);
  const preview = await previewSubscription(result.user.id, body.planId);
  if (!preview.ok) return apiError(preview.code, 409);
  const created = await purchaseSubscription(result.user.id, body.planId);
  if (!created.ok) return apiError(created.code, 409);
  return NextResponse.json(
    {
      subscriptionId: created.subscriptionId,
      provider: created.provider,
      providerOrderId: created.providerOrderId,
      payablePaise: created.payablePaise,
      keyId: created.keyId
    },
    { status: 201 }
  );
}
