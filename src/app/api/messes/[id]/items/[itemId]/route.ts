import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError, requireApiUser } from "@/lib/auth-guards";
import { getOwnerMess } from "@/lib/messes";
import { itemSchema } from "@/lib/menu-validation";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
): Promise<NextResponse> {
  const { id, itemId } = await params;
  const result = await requireApiUser(request, ["MESS_OWNER"]);
  if ("response" in result) return result.response;
  if (!(await getOwnerMess(result.user.id, id))) return apiError("NOT_FOUND", 404);
  const item = await db.menuItem.findUnique({ where: { id: itemId } });
  if (!item || item.messId !== id) return apiError("NOT_FOUND", 404);
  const body = await request.json().catch(() => null);
  const parsed = itemSchema.partial().safeParse(body);
  if (!parsed.success) {
    return apiError(
      "INVALID",
      400,
      parsed.error.issues.map((i) => i.message)
    );
  }
  const data = parsed.data;
  const updated = await db.menuItem.update({
    where: { id: itemId },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.description !== undefined ? { description: data.description || null } : {}),
      ...(data.pricePaise !== undefined ? { pricePaise: data.pricePaise } : {}),
      ...(data.vegType !== undefined ? { vegType: data.vegType } : {}),
      ...(data.photoUrl !== undefined ? { photoUrl: data.photoUrl || null } : {}),
      ...(data.active !== undefined ? { active: data.active } : {})
    }
  });
  return NextResponse.json({ item: updated });
}
