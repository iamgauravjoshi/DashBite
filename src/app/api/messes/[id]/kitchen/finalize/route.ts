import { NextResponse } from "next/server";
import { apiError, requireApiUser } from "@/lib/auth-guards";
import { isValidDateString } from "@/lib/ist";
import { finalizeSheet, kitchenAccess } from "@/lib/kitchen";

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
  } | null;
  if (
    typeof body?.slotId !== "string" ||
    typeof body?.date !== "string" ||
    !isValidDateString(body.date)
  ) {
    return apiError("INVALID", 400);
  }
  const sheet = await finalizeSheet(id, body.slotId, body.date, result.user.id);
  return NextResponse.json({ sheet: { id: sheet.id, status: sheet.status } });
}
