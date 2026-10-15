import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError, requireApiUser } from "@/lib/auth-guards";
import { getOwnerMess } from "@/lib/messes";
import { messFormSchema } from "@/lib/mess-validation";

async function ownedMess(userId: string, messId: string) {
  const mess = await getOwnerMess(userId, messId);
  if (!mess) return null;
  const staff = await db.messStaff.findMany({
    where: { messId },
    include: { user: { select: { id: true, name: true, email: true } } }
  });
  const events = await db.messVerificationEvent.findMany({
    where: { messId },
    orderBy: { createdAt: "desc" },
    take: 20
  });
  return { ...mess, staff, events };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const result = await requireApiUser(request, ["MESS_OWNER", "MESS_STAFF"]);
  if ("response" in result) return result.response;
  const { id } = await params;
  if (result.user.role === "MESS_OWNER") {
    const mess = await ownedMess(result.user.id, id);
    if (!mess) return apiError("NOT_FOUND", 404);
    return NextResponse.json({ mess });
  }
  const assignment = await db.messStaff.findUnique({
    where: { messId_userId: { messId: id, userId: result.user.id } },
    include: { mess: true }
  });
  if (!assignment) return apiError("NOT_FOUND", 404);
  return NextResponse.json({ mess: assignment.mess });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const result = await requireApiUser(request, ["MESS_OWNER"]);
  if ("response" in result) return result.response;
  const { id } = await params;
  const mess = await getOwnerMess(result.user.id, id);
  if (!mess) return apiError("NOT_FOUND", 404);
  if (mess.verificationStatus !== "DRAFT" && mess.verificationStatus !== "REJECTED") {
    return apiError("NOT_EDITABLE", 423);
  }
  const body = await request.json().catch(() => null);
  const parsed = messFormSchema.safeParse(body);
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
      name: data.name,
      description: data.description || null,
      phone: data.phone,
      line1: data.line1,
      locality: data.locality,
      city: data.city,
      state: data.state,
      pincode: data.pincode,
      vegType: data.vegType,
      pickupAllowed: data.pickupAllowed,
      deliveryAllowed: data.deliveryAllowed,
      deliveryNote: data.deliveryNote || null,
      serviceAreas: data.serviceAreas,
      operatingDays: data.operatingDays,
      opensAt: data.opensAt,
      closesAt: data.closesAt
    }
  });
  return NextResponse.json({ mess: updated });
}
