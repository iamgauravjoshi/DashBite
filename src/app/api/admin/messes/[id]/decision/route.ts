import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError, requireApiUser } from "@/lib/auth-guards";
import { transitionMess } from "@/lib/messes";
import { messDecisionSchema } from "@/lib/mess-validation";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const result = await requireApiUser(request, ["PLATFORM_ADMIN"]);
  if ("response" in result) return result.response;
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = messDecisionSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      "INVALID",
      400,
      parsed.error.issues.map((i) => i.message)
    );
  }
  const mess = await db.mess.findUnique({ where: { id } });
  if (!mess) return apiError("NOT_FOUND", 404);
  try {
    const updated = await transitionMess({
      messId: id,
      actorId: result.user.id,
      to: parsed.data.to,
      reason: parsed.data.reason || undefined
    });
    return NextResponse.json({ mess: updated });
  } catch (error) {
    const code = (error as { code?: string }).code ?? "DECISION_FAILED";
    const status = code === "NOT_FOUND" ? 404 : code === "REASON_REQUIRED" ? 400 : 409;
    return apiError(code, status);
  }
}
