import { NextResponse } from "next/server";
import { APIError } from "better-auth/api";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { signUpSchema } from "@/lib/auth-validation";
import { ROLE_HOME } from "@/lib/roles";

/**
 * Public sign-up with allowlisted roles. better-auth intentionally strips `role`
 * from public signup (privilege safety), so this route validates the role itself
 * and stamps it on the freshly created row only (matched by id — a synthetic
 * enumeration-protection response matches nothing and stays untouched).
 */
export async function POST(request: Request): Promise<NextResponse> {
  const body = await request.json().catch(() => null);
  const parsed = signUpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "INVALID", details: parsed.error.issues.map((i) => i.message) } },
      { status: 400 }
    );
  }
  const { name, email, password, role, phone } = parsed.data;
  try {
    const created = (await auth.api.signUpEmail({
      body: {
        name,
        email,
        password,
        phone: phone || undefined,
        callbackURL: ROLE_HOME[role]
      }
    })) as unknown as { user?: { id?: string } };
    const userId = created?.user?.id;
    if (userId) {
      await db.user
        .update({
          where: { id: userId },
          data: { role, ...(phone ? { phone } : {}) }
        })
        .catch(() => null);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof APIError) {
      return NextResponse.json(
        { error: { code: "SIGNUP_FAILED", message: error.message } },
        { status: error.statusCode >= 400 && error.statusCode < 500 ? error.statusCode : 400 }
      );
    }
    return NextResponse.json({ error: { code: "SIGNUP_FAILED" } }, { status: 400 });
  }
}
