import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError, requireApiUser } from "@/lib/auth-guards";
import { advanceFulfillment, fulfillmentScope } from "@/lib/fulfillment";
import { advanceSchema } from "@/lib/fulfillment-validation";

async function scoped(request: Request, messId: string, fid: string) {
  const result = await requireApiUser(request, [
    "MESS_OWNER",
    "MESS_STAFF",
    "PLATFORM_ADMIN",
    "DELIVERY_AGENT"
  ]);
  if ("response" in result) return result;
  if (result.user.role === "DELIVERY_AGENT") {
    const fulfillment = await db.fulfillment.findUnique({ where: { id: fid } });
    if (
      !fulfillment ||
      fulfillment.messId !== messId ||
      fulfillment.assigneeId !== result.user.id
    ) {
      return { response: apiError("NOT_FOUND", 404) };
    }
    return { user: result.user, scope: "AGENT" as const, fulfillment };
  }
  const fulfillment = await db.fulfillment.findUnique({ where: { id: fid } });
  if (!fulfillment || fulfillment.messId !== messId)
    return { response: apiError("NOT_FOUND", 404) };
  const scope = await fulfillmentScope(messId, result.user.id, result.user.role);
  if (!scope) return { response: apiError("NOT_FOUND", 404) };
  return { user: result.user, scope, fulfillment };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; fid: string }> }
): Promise<NextResponse> {
  const { id, fid } = await params;
  const result = await scoped(request, id, fid);
  if ("response" in result) return result.response;
  const detail = await db.fulfillment.findUnique({
    where: { id: fid },
    include: {
      order: {
        include: {
          customer: { select: { name: true, phone: true } },
          items: true,
          address: true
        }
      },
      assignee: { select: { name: true, email: true } },
      attempts: { orderBy: { createdAt: "asc" } }
    }
  });
  return NextResponse.json({ fulfillment: detail });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; fid: string }> }
): Promise<NextResponse> {
  const { id, fid } = await params;
  const result = await scoped(request, id, fid);
  if ("response" in result) return result.response;
  if (result.scope === "ADMIN") return apiError("FORBIDDEN", 403);
  const body = await request.json().catch(() => null);
  const parsed = advanceSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      "INVALID",
      400,
      parsed.error.issues.map((i) => i.message)
    );
  }
  const outcome = await advanceFulfillment({
    fulfillmentId: fid,
    actor: { id: result.user.id, role: result.user.role },
    to: parsed.data.to,
    assigneeType: parsed.data.assigneeType,
    assigneeEmail: parsed.data.assigneeEmail
  });
  if (!outcome.ok) {
    const status =
      outcome.code === "NOT_FOUND" || outcome.code === "ASSIGNEE_UNKNOWN"
        ? 404
        : outcome.code === "FORBIDDEN"
          ? 403
          : 409;
    return apiError(outcome.code, status);
  }
  return NextResponse.json({ fulfillment: { id: fid, status: outcome.status } });
}
