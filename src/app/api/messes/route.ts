import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError, requireApiUser } from "@/lib/auth-guards";
import { listOwnerMesses, listStaffMesses, uniqueSlug } from "@/lib/messes";
import { messFormSchema } from "@/lib/mess-validation";

export async function GET(request: Request): Promise<NextResponse> {
  const result = await requireApiUser(request, ["MESS_OWNER", "MESS_STAFF"]);
  if ("response" in result) return result.response;
  const { user } = result;
  const messes =
    user.role === "MESS_OWNER" ? await listOwnerMesses(user.id) : await listStaffMesses(user.id);
  return NextResponse.json({ messes });
}

export async function POST(request: Request): Promise<NextResponse> {
  const result = await requireApiUser(request, ["MESS_OWNER"]);
  if ("response" in result) return result.response;
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
  const mess = await db.mess.create({
    data: {
      ownerId: result.user.id,
      name: data.name,
      slug: await uniqueSlug(data.name),
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
      closesAt: data.closesAt,
      verificationStatus: "DRAFT",
      published: false
    }
  });
  return NextResponse.json({ mess }, { status: 201 });
}
