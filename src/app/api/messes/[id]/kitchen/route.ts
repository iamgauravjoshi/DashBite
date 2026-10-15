import { NextResponse } from "next/server";
import { apiError, requireApiUser } from "@/lib/auth-guards";
import { isValidDateString } from "@/lib/ist";
import { buildSheet, kitchenAccess } from "@/lib/kitchen";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const result = await requireApiUser(request, ["MESS_OWNER", "MESS_STAFF", "PLATFORM_ADMIN"]);
  if ("response" in result) return result.response;
  if (!(await kitchenAccess(id, result.user.id, result.user.role))) {
    return apiError("NOT_FOUND", 404);
  }
  const search = new URL(request.url).searchParams;
  const slotId = search.get("slotId");
  const date = search.get("date");
  if (!slotId || !date || !isValidDateString(date)) return apiError("INVALID", 400);
  const view = await buildSheet(id, slotId, date);
  return NextResponse.json({ sheet: view });
}
