import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError, requireApiUser } from "@/lib/auth-guards";
import { getOwnerMess } from "@/lib/messes";
import { messOperationsSchema } from "@/lib/order-validation";

/**
 * Live operational knobs: editable on approved listings without touching
 * verification state (unlike profile fields, which lock after submission).
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const result = await requireApiUser(request, ["MESS_OWNER"]);
  if ("response" in result) return result.response;
  if (!(await getOwnerMess(result.user.id, id))) return apiError("NOT_FOUND", 404);
  const body = await request.json().catch(() => null);
  const parsed = messOperationsSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      "INVALID",
      400,
      parsed.error.issues.map((i) => i.message)
    );
  }
  const data = parsed.data;
  const updated = await db.mess.update({
    where: { id },
    data: {
      ...(data.deliveryFeePaise !== undefined ? { deliveryFeePaise: data.deliveryFeePaise } : {}),
      ...(data.pickupAllowed !== undefined ? { pickupAllowed: data.pickupAllowed } : {}),
      ...(data.deliveryAllowed !== undefined ? { deliveryAllowed: data.deliveryAllowed } : {}),
      ...(data.deliveryNote !== undefined ? { deliveryNote: data.deliveryNote || null } : {})
    }
  });
  return NextResponse.json({
    mess: {
      id: updated.id,
      deliveryFeePaise: updated.deliveryFeePaise,
      pickupAllowed: updated.pickupAllowed,
      deliveryAllowed: updated.deliveryAllowed,
      deliveryNote: updated.deliveryNote
    }
  });
}
