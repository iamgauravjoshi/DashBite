import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError, requireApiUser } from "@/lib/auth-guards";
import { toDbDate } from "@/lib/ist";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const result = await requireApiUser(request, ["MESS_OWNER", "MESS_STAFF", "PLATFORM_ADMIN"]);
  if ("response" in result) return result.response;
  const { user } = result;
  if (user.role === "MESS_OWNER") {
    const mess = await db.mess.findUnique({ where: { id } });
    if (!mess || mess.ownerId !== user.id) return apiError("NOT_FOUND", 404);
  } else if (user.role === "MESS_STAFF") {
    const assignment = await db.messStaff.findUnique({
      where: { messId_userId: { messId: id, userId: user.id } }
    });
    if (!assignment) return apiError("NOT_FOUND", 404);
  }
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const date = searchParams.get("date");
  const orders = await db.order.findMany({
    where: {
      messId: id,
      ...(status ? { status } : {}),
      ...(date ? { serviceDate: toDbDate(date) } : {})
    },
    include: {
      customer: { select: { name: true } },
      items: true,
      payments: { orderBy: { createdAt: "desc" }, take: 1 }
    },
    orderBy: { createdAt: "desc" },
    take: 200
  });
  return NextResponse.json({ orders });
}
