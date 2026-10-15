import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError, requireApiUser } from "@/lib/auth-guards";
import { getOwnerMess } from "@/lib/messes";
import { slotSchema } from "@/lib/menu-validation";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; slotId: string }> }
): Promise<NextResponse> {
  const { id, slotId } = await params;
  const result = await requireApiUser(request, ["MESS_OWNER"]);
  if ("response" in result) return result.response;
  if (!(await getOwnerMess(result.user.id, id))) return apiError("NOT_FOUND", 404);
  const slot = await db.menuSlot.findUnique({ where: { id: slotId } });
  if (!slot || slot.messId !== id) return apiError("NOT_FOUND", 404);
  const body = await request.json().catch(() => null);
  const parsed = slotSchema.partial().safeParse(body);
  if (!parsed.success) {
    return apiError(
      "INVALID",
      400,
      parsed.error.issues.map((i) => i.message)
    );
  }
  const updated = await db.menuSlot.update({
    where: { id: slotId },
    data: {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.cutoffTime !== undefined ? { cutoffTime: parsed.data.cutoffTime } : {}),
      ...(parsed.data.sortOrder !== undefined ? { sortOrder: parsed.data.sortOrder } : {}),
      ...(parsed.data.active !== undefined ? { active: parsed.data.active } : {})
    }
  });
  return NextResponse.json({ slot: updated });
}
