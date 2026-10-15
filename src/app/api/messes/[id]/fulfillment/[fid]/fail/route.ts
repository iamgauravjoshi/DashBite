import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError, requireApiUser } from "@/lib/auth-guards";
import { fulfillmentScope, recordFailedAttempt } from "@/lib/fulfillment";
import { failSchema } from "@/lib/fulfillment-validation";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; fid: string }> }
): Promise<NextResponse> {
  const { id, fid } = await params;
  const result = await requireApiUser(request, ["MESS_OWNER", "MESS_STAFF", "DELIVERY_AGENT"]);
  if ("response" in result) return result.response;
  const scope = await fulfillmentScope(id, result.user.id, result.user.role);
  const fulfillment = await db.fulfillment.findUnique({ where: { id: fid } });
  if (!fulfillment || fulfillment.messId !== id) return apiError("NOT_FOUND", 404);
  // Agents act only on their own parcels; management acts on the mess scope.
  if (result.user.role === "DELIVERY_AGENT" && fulfillment.assigneeId !== result.user.id) {
    return apiError("NOT_FOUND", 404);
  }
  if (!scope && result.user.role !== "DELIVERY_AGENT") return apiError("NOT_FOUND", 404);
  const body = await request.json().catch(() => null);
  const parsed = failSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      "INVALID",
      400,
      parsed.error.issues.map((i) => i.message)
    );
  }
  const outcome = await recordFailedAttempt({
    fulfillmentId: fid,
    actor: { id: result.user.id, role: result.user.role },
    reason: parsed.data.reason,
    note: parsed.data.note || undefined
  });
  if (!outcome.ok) {
    const status =
      outcome.code === "NOT_FOUND"
        ? 404
        : outcome.code === "FORBIDDEN"
          ? 403
          : outcome.code === "BAD_REASON" || outcome.code === "NOTE_REQUIRED"
            ? 400
            : 409;
    return apiError(outcome.code, status);
  }
  return NextResponse.json({ failedAttempts: outcome.attempts });
}
