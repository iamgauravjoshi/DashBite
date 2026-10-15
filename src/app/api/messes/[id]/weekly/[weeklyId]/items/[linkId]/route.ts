import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError, requireApiUser } from "@/lib/auth-guards";
import { getOwnerMess, weeklyById } from "@/lib/messes";
import { weeklyItemSchema } from "@/lib/menu-validation";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; weeklyId: string; linkId: string }> }
): Promise<NextResponse> {
  const { id, weeklyId, linkId } = await params;
  const result = await requireApiUser(request, ["MESS_OWNER"]);
  if ("response" in result) return result.response;
  if (!(await getOwnerMess(result.user.id, id))) return apiError("NOT_FOUND", 404);
  if (!(await weeklyById(id, weeklyId))) return apiError("NOT_FOUND", 404);
  const link = await db.weeklyMenuItem.findUnique({ where: { id: linkId } });
  if (!link || link.weeklyMenuId !== weeklyId) return apiError("NOT_FOUND", 404);
  const body = await request.json().catch(() => null);
  const parsed = weeklyItemSchema.partial().safeParse(body);
  if (!parsed.success) {
    return apiError(
      "INVALID",
      400,
      parsed.error.issues.map((i) => i.message)
    );
  }
  if (parsed.data.itemId !== undefined && parsed.data.itemId !== link.itemId) {
    return apiError("IMMUTABLE_ITEM", 409);
  }
  const updated = await db.weeklyMenuItem.update({
    where: { id: linkId },
    data: {
      ...(parsed.data.pricePaise !== undefined ? { pricePaise: parsed.data.pricePaise } : {}),
      ...(parsed.data.active !== undefined ? { active: parsed.data.active } : {})
    }
  });
  return NextResponse.json({ item: updated });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; weeklyId: string; linkId: string }> }
): Promise<NextResponse> {
  const { id, weeklyId, linkId } = await params;
  const result = await requireApiUser(request, ["MESS_OWNER"]);
  if ("response" in result) return result.response;
  if (!(await getOwnerMess(result.user.id, id))) return apiError("NOT_FOUND", 404);
  if (!(await weeklyById(id, weeklyId))) return apiError("NOT_FOUND", 404);
  const link = await db.weeklyMenuItem.findUnique({ where: { id: linkId } });
  if (!link || link.weeklyMenuId !== weeklyId) return apiError("NOT_FOUND", 404);
  await db.weeklyMenuItem.delete({ where: { id: linkId } });
  return NextResponse.json({ deleted: linkId });
}
