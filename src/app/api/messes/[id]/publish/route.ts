import { NextResponse } from "next/server";
import { apiError, requireApiUser } from "@/lib/auth-guards";
import { getOwnerMess, setPublished } from "@/lib/messes";
import { messPublishSchema } from "@/lib/mess-validation";

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
  const parsed = messPublishSchema.safeParse(body);
  if (!parsed.success) return apiError("INVALID", 400);
  try {
    const updated = await setPublished(id, parsed.data.published);
    return NextResponse.json({ mess: updated });
  } catch (error) {
    const code = (error as { code?: string }).code ?? "PUBLISH_FAILED";
    return apiError(code, code === "NOT_FOUND" ? 404 : 409);
  }
}
