import { execSync } from "node:child_process";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

const DEV_URL = "postgresql://smartmess:smartmess_dev_pw@localhost:5432/smartmess?schema=public";
const TEST_URL =
  "postgresql://smartmess:smartmess_dev_pw@localhost:5432/smartmess_test_auth?schema=public";

let db!: import("@prisma/client").PrismaClient;
let auth!: (typeof import("@/lib/auth"))["auth"];
let authHandler!: typeof import("@/app/api/auth/[...all]/route");
let devMailbox!: (typeof import("@/lib/auth"))["devMailbox"];
let clearDevMailbox!: (typeof import("@/lib/auth"))["clearDevMailbox"];
let signUpRoute!: typeof import("@/app/api/auth/sign-up/route");
let profileRoute!: typeof import("@/app/api/profile/route");
let addressesRoute!: typeof import("@/app/api/addresses/route");
let addressByIdRoute!: typeof import("@/app/api/addresses/[id]/route");

function postJson(path: string, body: unknown, cookie?: string) {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(cookie ? { cookie } : {})
    },
    body: JSON.stringify(body)
  });
}

async function cleanDb() {
  await db.messVerificationEvent.deleteMany();
  await db.messStaff.deleteMany();
  await db.mess.deleteMany();
  await db.address.deleteMany();
  await db.session.deleteMany();
  await db.account.deleteMany();
  await db.verification.deleteMany();
  await db.user.deleteMany();
}

async function signupViaRoute(role: string, email: string) {
  const res = await signUpRoute.POST(
    postJson("/api/auth/sign-up", {
      name: "Test User",
      email,
      password: "password-123",
      role,
      phone: "9876543210"
    })
  );
  const body = (await res.json()) as { ok?: boolean; error?: { code?: string; message?: string } };
  return { status: res.status, body };
}

async function verificationTokenFor(email: string): Promise<string> {
  const mail = devMailbox()
    .filter((m) => m.to === email && m.subject.toLowerCase().includes("verify"))
    .at(-1);
  const token = mail?.text.match(/token=([^&\s]+)/)?.[1];
  if (!token) throw new Error(`no verification token for ${email}`);
  return token;
}

async function resetTokenFor(email: string): Promise<string> {
  const mail = devMailbox()
    .filter((m) => m.to === email && m.subject.toLowerCase().includes("reset"))
    .at(-1);
  // Reset links carry the token as a path segment: /api/auth/reset-password/<token>
  const token = mail?.text.match(/reset-password\/([A-Za-z0-9_-]+)/)?.[1];
  if (!token) throw new Error(`no reset token for ${email}`);
  return token;
}

async function verifyEmail(token: string): Promise<string | null> {
  // better-auth answers valid links with a 302 to the callbackURL (link-click
  // semantics), surfacing as APIError in server calls. Treat it as success and
  // let the DB assertions below prove the state change.
  try {
    await auth.api.verifyEmail({ query: { token, callbackURL: "/app" } });
    return null;
  } catch (error: unknown) {
    const failure = error as { statusCode?: number; headers?: Headers };
    if (failure?.statusCode === 302) return failure.headers?.get("location") ?? null;
    throw error;
  }
}

async function signIn(email: string, password = "password-123"): Promise<{ cookie: string }> {
  // Full HTTP stack: the handler sets real session cookies, like a browser flow.
  const res = await authHandler.POST(
    new Request("http://localhost/api/auth/sign-in/email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password })
    })
  );
  if (!res.ok) {
    throw Object.assign(new Error(`sign-in failed: ${res.status}`), { statusCode: res.status });
  }
  const jar = (res.headers.getSetCookie?.() ?? []).map((c) => c.split(";")[0]).join("; ");
  if (!jar) throw new Error("sign-in set no cookies");
  return { cookie: jar };
}

function sessionCookie(_token: string): string {
  throw new Error("use the cookie jar returned by signIn instead");
}

async function userByEmail(email: string) {
  return db.user.findUniqueOrThrow({ where: { email } });
}

beforeAll(async () => {
  // 1. Test database (same Postgres container, separate database).
  const pg = await import("pg");
  const admin = new pg.default.Client({ connectionString: DEV_URL });
  await admin.connect();
  await admin
    .query("SELECT 1 FROM pg_database WHERE datname = 'smartmess_test_auth'")
    .then(async (r: { rowCount: number | null }) => {
      if ((r.rowCount ?? 0) === 0) await admin.query("CREATE DATABASE smartmess_test_auth");
    });
  await admin.end();

  // 2. Migrate the test database.
  execSync("npx.cmd prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: TEST_URL },
    stdio: "pipe"
  });

  // 3. Point server modules at the test database before importing them.
  process.env.DATABASE_URL = TEST_URL;
  process.env.BETTER_AUTH_SECRET = "test-only-secret-min-32-chars-1234567890";
  process.env.BETTER_AUTH_URL = "http://localhost:3000";
  ({ db } = await import("@/lib/db"));
  ({ auth, devMailbox, clearDevMailbox } = await import("@/lib/auth"));
  authHandler = await import("@/app/api/auth/[...all]/route");
  signUpRoute = await import("@/app/api/auth/sign-up/route");
  profileRoute = await import("@/app/api/profile/route");
  addressesRoute = await import("@/app/api/addresses/route");
  addressByIdRoute = await import("@/app/api/addresses/[id]/route");
}, 180000);

beforeEach(async () => {
  await cleanDb();
  clearDevMailbox();
});

describe("signup roles and verification lifecycle", () => {
  it("creates CUSTOMER as UNVERIFIED and blocks sign-in until verified", async () => {
    const res = await signupViaRoute("CUSTOMER", "cust@example.com");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    const row = await userByEmail("cust@example.com");
    expect(row.role).toBe("CUSTOMER");
    expect(row.status).toBe("UNVERIFIED");
    expect(row.emailVerified).toBe(false);
    expect(row.phone).toBe("9876543210");

    await expect(signIn("cust@example.com")).rejects.toMatchObject({ statusCode: 403 });
  }, 60000);

  it("persists the chosen MESS_OWNER role", async () => {
    const res = await signupViaRoute("MESS_OWNER", "owner@example.com");
    expect(res.status).toBe(200);
    const row = await userByEmail("owner@example.com");
    expect(row.role).toBe("MESS_OWNER");
  }, 60000);

  it("rejects PLATFORM_ADMIN self-registration but allows staff", async () => {
    const admin = await signupViaRoute("PLATFORM_ADMIN", "sneaky@example.com");
    expect(admin.status).toBe(400);
    const staff = await signupViaRoute("MESS_STAFF", "staffself@example.com");
    expect(staff.status).toBe(200);
    const row = await userByEmail("staffself@example.com");
    expect(row.role).toBe("MESS_STAFF");
    expect(await db.user.count()).toBe(1);
  }, 60000);

  it("verifies email, activates the account, and signs in with a session", async () => {
    await signupViaRoute("DELIVERY_AGENT", "rider@example.com");
    const location = await verifyEmail(await verificationTokenFor("rider@example.com"));
    expect(location).toContain("/app");

    const row = await userByEmail("rider@example.com");
    expect(row.emailVerified).toBe(true);
    expect(row.status).toBe("ACTIVE");

    const { cookie } = await signIn("rider@example.com");
    expect(cookie).toContain("=");

    const checked = await auth.api.getSession({
      headers: new Headers({ cookie })
    });
    expect(checked?.user.id).toBe(row.id);
  }, 60000);

  it("resets passwords through the emailed link and revokes the old one", async () => {
    await signupViaRoute("CUSTOMER", "resettable@example.com");
    await verifyEmail(await verificationTokenFor("resettable@example.com"));

    await auth.api.requestPasswordReset({
      body: { email: "resettable@example.com", redirectTo: "http://localhost:3000/reset-password" }
    });
    const token = await resetTokenFor("resettable@example.com");
    await auth.api.resetPassword({ body: { newPassword: "brand-new-456", token } });

    const { cookie } = await signIn("resettable@example.com", "brand-new-456");
    expect(cookie).toContain("=");
    await expect(signIn("resettable@example.com", "password-123")).rejects.toMatchObject({
      statusCode: 401
    });
  }, 60000);
  it("rejects wrong passwords without revealing more", async () => {
    await signupViaRoute("CUSTOMER", "locked@example.com");
    await verifyEmail(await verificationTokenFor("locked@example.com"));
    await expect(signIn("locked@example.com", "wrong-password-9")).rejects.toMatchObject({
      statusCode: 401
    });
  }, 60000);

  it("blocks banned users at sign-in", async () => {
    await signupViaRoute("CUSTOMER", "banned@example.com");
    await verifyEmail(await verificationTokenFor("banned@example.com"));
    const row = await userByEmail("banned@example.com");
    await db.user.update({ where: { id: row.id }, data: { banned: true, status: "SUSPENDED" } });
    await expect(signIn("banned@example.com")).rejects.toMatchObject({ statusCode: 403 });
  }, 60000);
}, 60000);

describe("authenticated APIs enforce ownership and status", () => {
  async function verifiedSession(email: string, role = "CUSTOMER") {
    await signupViaRoute(role, email);
    await verifyEmail(await verificationTokenFor(email));
    const { cookie } = await signIn(email);
    return cookie;
  }

  it("lets owners update only their own profile", async () => {
    const cookie = await verifiedSession("me@example.com");
    const res = await profileRoute.PATCH(
      new Request("http://localhost/api/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ name: "New Name", phone: "9123456789" })
      })
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { profile: { name: string; email: string } };
    expect(body.profile.name).toBe("New Name");
    expect(body.profile.email).toBe("me@example.com");

    const unauth = await profileRoute.PATCH(
      new Request("http://localhost/api/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Ghost", phone: "" })
      })
    );
    expect(unauth.status).toBe(401);
  }, 60000);

  it("blocks address access across accounts and for unverified users", async () => {
    const cookieA = await verifiedSession("a@example.com");
    const create = await addressesRoute.POST(
      postJson(
        "/api/addresses",
        {
          label: "Home",
          line1: "1, MG Road",
          locality: "Camp",
          city: "Pune",
          pincode: "411001"
        },
        cookieA
      )
    );
    expect(create.status).toBe(201);
    const created = (await create.json()) as { address: { id: string } };

    // B cannot touch A's address.
    const cookieB = await verifiedSession("b@example.com");
    const patch = await addressByIdRoute.PATCH(
      new Request(`http://localhost/api/addresses/${created.address.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json", cookie: cookieB },
        body: JSON.stringify({
          label: "Hijacked",
          line1: "9, Evil St",
          locality: "X",
          city: "Pune",
          pincode: "411001"
        })
      }),
      { params: Promise.resolve({ id: created.address.id }) }
    );
    expect(patch.status).toBe(404);
    const gone = await addressByIdRoute.DELETE(
      new Request(`http://localhost/api/addresses/${created.address.id}`, {
        method: "DELETE",
        headers: { cookie: cookieB }
      }),
      { params: Promise.resolve({ id: created.address.id }) }
    );
    expect(gone.status).toBe(404);

    // Unverified C cannot use addresses at all.
    await signupViaRoute("CUSTOMER", "c@example.com");
    const unverified = (await signIn("c@example.com").catch((e: unknown) => e)) as unknown;
    expect(unverified).toMatchObject({ statusCode: 403 });
  }, 90000);

  it("blocks suspended accounts at the API layer", async () => {
    const cookie = await verifiedSession("s@example.com");
    const row = await userByEmail("s@example.com");
    await db.user.update({ where: { id: row.id }, data: { status: "SUSPENDED" } });
    const res = await profileRoute.GET(
      new Request("http://localhost/api/profile", { headers: { cookie } })
    );
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("SUSPENDED");
  }, 60000);
});
