import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError, requireApiUser } from "@/lib/auth-guards";
import { fulfillmentScope } from "@/lib/fulfillment";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const result = await requireApiUser(request, ["MESS_OWNER", "MESS_STAFF", "PLATFORM_ADMIN"]);
  if ("response" in result) return result.response;
  const scope = await fulfillmentScope(id, result.user.id, result.user.role);
  if (!scope) return apiError("NOT_FOUND", 404);
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const date = searchParams.get("date");
  const fulfillments = await db.fulfillment.findMany({
    where: {
      messId: id,
      ...(status ? { status } : {}),
      ...(date ? { order: { serviceDate: new Date(`${date}T00:00:00.000Z`) } } : {})
    },
    include: {
      order: { include: { customer: { select: { name: true } }, items: true } },
      assignee: { select: { name: true, email: true } },
      attempts: { orderBy: { createdAt: "desc" }, take: 5 }
    },
    orderBy: { updatedAt: "desc" },
    take: 200
  });
  return NextResponse.json({ fulfillments });
}
