import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError, requireApiUser } from "@/lib/auth-guards";
import { getOwnerMess } from "@/lib/messes";
import { staffAddSchema } from "@/lib/mess-validation";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const result = await requireApiUser(request, ["MESS_OWNER"]);
  if ("response" in result) return result.response;
  const { id } = await params;
  const mess = await getOwnerMess(result.user.id, id);
  if (!mess) return apiError("NOT_FOUND", 404);
  const staff = await db.messStaff.findMany({
    where: { messId: id },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "asc" }
  });
  return NextResponse.json({ staff });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const result = await requireApiUser(request, ["MESS_OWNER"]);
  if ("response" in result) return result.response;
  const { id } = await params;
  const mess = await getOwnerMess(result.user.id, id);
  if (!mess) return apiError("NOT_FOUND", 404);
  const body = await request.json().catch(() => null);
  const parsed = staffAddSchema.safeParse(body);
  if (!parsed.success) return apiError("INVALID", 400);
  const member = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (!member || member.role !== "MESS_STAFF") return apiError("NOT_STAFF", 404);
  if (!member.emailVerified || member.status !== "ACTIVE" || member.banned) {
    return apiError("STAFF_INACTIVE", 409);
  }
  try {
    const row = await db.messStaff.create({ data: { messId: id, userId: member.id } });
    return NextResponse.json({ staff: row }, { status: 201 });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") return apiError("ALREADY_MEMBER", 409);
    throw error;
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const result = await requireApiUser(request, ["MESS_OWNER"]);
  if ("response" in result) return result.response;
  const { id } = await params;
  const mess = await getOwnerMess(result.user.id, id);
  if (!mess) return apiError("NOT_FOUND", 404);
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  if (!userId) return apiError("INVALID", 400);
  await db.messStaff.deleteMany({ where: { messId: id, userId } });
  return NextResponse.json({ removed: userId });
}
