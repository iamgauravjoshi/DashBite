import { NextResponse } from "next/server";
import { apiError, requireApiUser } from "@/lib/auth-guards";
import { visibleOrder } from "@/lib/order-access";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const result = await requireApiUser(request);
  if ("response" in result) return result.response;
  const { id } = await params;
  const order = await visibleOrder(result.user.id, result.user.role, id);
  if (!order) return apiError("NOT_FOUND", 404);
  return NextResponse.json({ order });
}
