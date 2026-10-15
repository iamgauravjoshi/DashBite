import { NextResponse } from "next/server";
import { apiError, requireApiUser } from "@/lib/auth-guards";
import { buildQuote, expirePendingOrders } from "@/lib/payments";
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
  const quoted = await buildQuote({ ...parsed.data, customerId: result.user.id });
  if (!quoted.ok) return apiError(quoted.code, 409);
  return NextResponse.json({ quote: quoted.quote });
}
