import { NextResponse } from "next/server";
import { apiError, requireApiUser } from "@/lib/auth-guards";
import { isValidDateString } from "@/lib/ist";
import { addAdjustment, kitchenAccess } from "@/lib/kitchen";
import { adjustmentSchema } from "@/lib/kitchen-validation";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const result = await requireApiUser(request, ["MESS_OWNER", "MESS_STAFF"]);
  if ("response" in result) return result.response;
  if (!(await kitchenAccess(id, result.user.id, result.user.role))) {
    return apiError("NOT_FOUND", 404);
  }
  const body = (await request.json().catch(() => null)) as {
    slotId?: unknown;
    date?: unknown;
    itemLabel?: unknown;
    qtyDelta?: unknown;
    reason?: unknown;
  } | null;
  if (
    typeof body?.slotId !== "string" ||
    typeof body?.date !== "string" ||
    !isValidDateString(body.date)
  ) {
    return apiError("INVALID", 400);
  }
  const parsed = adjustmentSchema.safeParse({
    itemLabel: body.itemLabel,
    qtyDelta: body.qtyDelta,
    reason: body.reason
  });
  if (!parsed.success) {
    return apiError(
      "INVALID",
      400,
      parsed.error.issues.map((i) => i.message)
    );
  }
  const adjustment = await addAdjustment(id, body.slotId, body.date, result.user.id, {
    itemLabel: parsed.data.itemLabel,
    qtyDelta: parsed.data.qtyDelta,
    reason: parsed.data.reason
  });
  return NextResponse.json({ adjustment }, { status: 201 });
}
