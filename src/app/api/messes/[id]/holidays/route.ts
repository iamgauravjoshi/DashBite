import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError, requireApiUser } from "@/lib/auth-guards";
import { toDbDate, todayInTz } from "@/lib/ist";
import { getOwnerMess } from "@/lib/messes";
import { holidaySchema } from "@/lib/menu-validation";

async function owned(request: Request, messId: string) {
  const result = await requireApiUser(request, ["MESS_OWNER"]);
  if ("response" in result) return result;
  if (!(await getOwnerMess(result.user.id, messId)))
    return { response: apiError("NOT_FOUND", 404) };
  return { user: result.user };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const result = await owned(request, id);
  if ("response" in result) return result.response;
  const holidays = await db.holiday.findMany({
    where: { messId: id, date: { gte: toDbDate(todayInTz()) } },
    orderBy: { date: "asc" },
    take: 60
  });
  return NextResponse.json({ holidays });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const result = await owned(request, id);
  if ("response" in result) return result.response;
  const body = await request.json().catch(() => null);
  const parsed = holidaySchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      "INVALID",
      400,
      parsed.error.issues.map((i) => i.message)
    );
  }
  if (parsed.data.date < todayInTz()) return apiError("PAST_DATE", 400);
  try {
    const holiday = await db.holiday.create({
      data: { messId: id, date: toDbDate(parsed.data.date), reason: parsed.data.reason || null }
    });
    return NextResponse.json({ holiday }, { status: 201 });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") return apiError("DUPLICATE_DATE", 409);
    throw error;
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const result = await owned(request, id);
  if ("response" in result) return result.response;
  const { searchParams } = new URL(request.url);
  const holidayId = searchParams.get("holidayId");
  if (!holidayId) return apiError("INVALID", 400);
  const holiday = await db.holiday.findUnique({ where: { id: holidayId } });
  if (!holiday || holiday.messId !== id) return apiError("NOT_FOUND", 404);
  await db.holiday.delete({ where: { id: holidayId } });
  return NextResponse.json({ deleted: holidayId });
}
