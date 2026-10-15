import { NextResponse } from "next/server";
import { apiError, requireApiUser } from "@/lib/auth-guards";
import { getOwnerMess, transitionMess, type MessStatus } from "@/lib/messes";
import { isOwnerTransition } from "@/lib/mess-rules";

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
  const to = (body as { to?: string } | null)?.to;
  if (to !== "SUBMITTED" && to !== "DRAFT") return apiError("INVALID", 400, ["Unknown action"]);
  if (!isOwnerTransition(mess.verificationStatus as MessStatus, to)) {
    return apiError("BAD_TRANSITION", 409);
  }
  try {
    const updated = await transitionMess({ messId: id, actorId: result.user.id, to });
    return NextResponse.json({ mess: updated });
  } catch (error) {
    const code = (error as { code?: string }).code ?? "TRANSITION_FAILED";
    return apiError(code, code === "NOT_FOUND" ? 404 : 409);
  }
}
