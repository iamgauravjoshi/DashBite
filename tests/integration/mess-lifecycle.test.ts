import { execSync } from "node:child_process";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

const DEV_URL = "postgresql://smartmess:smartmess_dev_pw@localhost:5432/smartmess?schema=public";
const TEST_DB = "smartmess_test_mess";
const TEST_URL = `postgresql://smartmess:smartmess_dev_pw@localhost:5432/${TEST_DB}?schema=public`;

let db!: import("@prisma/client").PrismaClient;
let auth!: (typeof import("@/lib/auth"))["auth"];
let devMailbox!: (typeof import("@/lib/auth"))["devMailbox"];
let clearDevMailbox!: (typeof import("@/lib/auth"))["clearDevMailbox"];
let authHandler!: typeof import("@/app/api/auth/[...all]/route");
let messesRoute!: typeof import("@/app/api/messes/route");
let messByIdRoute!: typeof import("@/app/api/messes/[id]/route");
let submitRoute!: typeof import("@/app/api/messes/[id]/submit/route");
let publishRoute!: typeof import("@/app/api/messes/[id]/publish/route");
let staffRoute!: typeof import("@/app/api/messes/[id]/staff/route");
let adminMessesRoute!: typeof import("@/app/api/admin/messes/route");
let decisionRoute!: typeof import("@/app/api/admin/messes/[id]/decision/route");
let listDiscoverable!: (typeof import("@/lib/messes"))["listDiscoverable"];

function jsonRequest(path: string, body: unknown, cookie?: string, method = "POST") {
  return new Request(`http://localhost${path}`, {
    method,
    headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body)
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

async function signupCustomer(email: string) {
  const res = await (
    await import("@/app/api/auth/sign-up/route")
  ).POST(
    jsonRequest("/api/auth/sign-up", {
      name: "Test User",
      email,
      password: "password-123",
      role: "CUSTOMER",
      phone: ""
    })
  );
  expect(res.status).toBe(200);
  const mail = devMailbox()
    .filter((m) => m.to === email)
    .at(-1);
  const token = mail?.text.match(/token=([^&\s]+)/)?.[1];
  if (!token) throw new Error(`no token for ${email}`);
  try {
    await auth.api.verifyEmail({ query: { token, callbackURL: "/app" } });
  } catch (e: unknown) {
    if ((e as { statusCode?: number }).statusCode !== 302) throw e;
  }
}

async function cookieFor(email: string, role?: string) {
  await signupCustomer(email);
  if (role) await db.user.update({ where: { email }, data: { role } });
  const res = await authHandler.POST(
    new Request("http://localhost/api/auth/sign-in/email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password: "password-123" })
    })
  );
  if (!res.ok) throw new Error(`signin failed for ${email}: ${res.status}`);
  return (res.headers.getSetCookie?.() ?? []).map((c) => c.split(";")[0]).join("; ");
}

const MESS = {
  name: "Annapurna Mess",
  phone: "9876543210",
  line1: "1, MG Road",
  locality: "Camp",
  city: "Pune",
  state: "Maharashtra",
  pincode: "411001",
  vegType: "BOTH",
  pickupAllowed: true,
  deliveryAllowed: true,
  serviceAreas: ["Camp", "MG Road"],
  operatingDays: ["MON", "TUE", "WED", "THU", "FRI", "SAT"],
  opensAt: "07:00",
  closesAt: "21:00"
};

async function createMess(cookie: string, overrides: Record<string, unknown> = {}) {
  const res = await messesRoute.POST(jsonRequest("/api/messes", { ...MESS, ...overrides }, cookie));
  return res;
}

beforeAll(async () => {
  const pg = await import("pg");
  const admin = new pg.default.Client({ connectionString: DEV_URL });
  await admin.connect();
  await admin
    .query(`SELECT 1 FROM pg_database WHERE datname = '${TEST_DB}'`)
    .then(async (r: { rowCount: number | null }) => {
      if ((r.rowCount ?? 0) === 0) await admin.query(`CREATE DATABASE ${TEST_DB}`);
    });
  await admin.end();
  execSync("npx.cmd prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: TEST_URL },
    stdio: "pipe"
  });
  process.env.DATABASE_URL = TEST_URL;
  process.env.BETTER_AUTH_SECRET = "test-only-secret-min-32-chars-1234567890";
  process.env.BETTER_AUTH_URL = "http://localhost:3000";
  ({ db } = await import("@/lib/db"));
  ({ auth, devMailbox, clearDevMailbox } = await import("@/lib/auth"));
  authHandler = await import("@/app/api/auth/[...all]/route");
  messesRoute = await import("@/app/api/messes/route");
  messByIdRoute = await import("@/app/api/messes/[id]/route");
  submitRoute = await import("@/app/api/messes/[id]/submit/route");
  publishRoute = await import("@/app/api/messes/[id]/publish/route");
  staffRoute = await import("@/app/api/messes/[id]/staff/route");
  adminMessesRoute = await import("@/app/api/admin/messes/route");
  decisionRoute = await import("@/app/api/admin/messes/[id]/decision/route");
  ({ listDiscoverable } = await import("@/lib/messes"));
}, 180000);

beforeEach(async () => {
  await cleanDb();
  clearDevMailbox();
});

describe("mess registration and ownership", () => {
  it("lets owners create drafts; blocks customers and validates input", async () => {
    const owner = await cookieFor("owner@example.com", "MESS_OWNER");
    const res = await createMess(owner);
    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      mess: { verificationStatus: string; published: boolean; slug: string };
    };
    expect(body.mess.verificationStatus).toBe("DRAFT");
    expect(body.mess.published).toBe(false);
    expect(body.mess.slug).toMatch(/^annapurna-mess-[a-z0-9]{6}$/);

    const customer = await cookieFor("cust@example.com");
    expect((await createMess(customer)).status).toBe(403);

    const bad = await messesRoute.POST(jsonRequest("/api/messes", { ...MESS, phone: "1" }, owner));
    expect(bad.status).toBe(400);
  }, 90000);

  it("isolates records across owners (404, no leaks)", async () => {
    const ownerA = await cookieFor("a@example.com", "MESS_OWNER");
    const ownerB = await cookieFor("b@example.com", "MESS_OWNER");
    const created = (await (await createMess(ownerA)).json()) as { mess: { id: string } };
    const id = created.mess.id;

    const get = await messByIdRoute.GET(
      new Request(`http://localhost/api/messes/${id}`, { headers: { cookie: ownerB } }),
      { params: Promise.resolve({ id }) }
    );
    expect(get.status).toBe(404);

    const patch = await messByIdRoute.PATCH(
      jsonRequest(`/api/messes/${id}`, { ...MESS, name: "Hijacked" }, ownerB),
      { params: Promise.resolve({ id }) }
    );
    expect(patch.status).toBe(404);
  }, 90000);

  it("locks editing once submitted", async () => {
    const owner = await cookieFor("owner@example.com", "MESS_OWNER");
    const created = (await (await createMess(owner)).json()) as { mess: { id: string } };
    const id = created.mess.id;
    const submit = await submitRoute.POST(
      jsonRequest(`/api/messes/${id}/submit`, { to: "SUBMITTED" }, owner),
      {
        params: Promise.resolve({ id })
      }
    );
    expect(submit.status).toBe(200);
    const patch = await messByIdRoute.PATCH(jsonRequest(`/api/messes/${id}`, MESS, owner), {
      params: Promise.resolve({ id })
    });
    expect(patch.status).toBe(423);
  }, 90000);
});

describe("verification lifecycle and audit", () => {
  async function approvedPublishedMess(owner: string, overrides = {}) {
    const cookie = await cookieFor(owner, "MESS_OWNER");
    const created = (await (await createMess(cookie, overrides)).json()) as {
      mess: { id: string };
    };
    const id = created.mess.id;
    const admin = await cookieFor("admin@example.com", "PLATFORM_ADMIN");
    expect(
      (
        await submitRoute.POST(
          jsonRequest(`/api/messes/${id}/submit`, { to: "SUBMITTED" }, cookie),
          {
            params: Promise.resolve({ id })
          }
        )
      ).status
    ).toBe(200);
    expect(
      (
        await decisionRoute.POST(
          jsonRequest(`/api/admin/messes/${id}/decision`, { to: "UNDER_REVIEW" }, admin),
          { params: Promise.resolve({ id }) }
        )
      ).status
    ).toBe(200);
    expect(
      (
        await decisionRoute.POST(
          jsonRequest(`/api/admin/messes/${id}/decision`, { to: "APPROVED" }, admin),
          { params: Promise.resolve({ id }) }
        )
      ).status
    ).toBe(200);
    expect(
      (
        await publishRoute.POST(
          jsonRequest(`/api/messes/${id}/publish`, { published: true }, cookie),
          {
            params: Promise.resolve({ id })
          }
        )
      ).status
    ).toBe(200);
    return { id, cookie, admin };
  }

  it("runs submit → review → approve → publish with an audit trail", async () => {
    const { id } = await approvedPublishedMess("owner@example.com");
    const mess = await db.mess.findUniqueOrThrow({ where: { id } });
    expect(mess.verificationStatus).toBe("APPROVED");
    expect(mess.published).toBe(true);
    const events = await db.messVerificationEvent.findMany({
      where: { messId: id },
      orderBy: { createdAt: "asc" }
    });
    expect(events.map((e) => e.to)).toEqual(["SUBMITTED", "UNDER_REVIEW", "APPROVED"]);
    expect(events.every((e) => e.actorId)).toBe(true);
  }, 120000);

  it("refuses publish before approval and double submit", async () => {
    const cookie = await cookieFor("owner@example.com", "MESS_OWNER");
    const created = (await (await createMess(cookie)).json()) as { mess: { id: string } };
    const id = created.mess.id;
    const early = await publishRoute.POST(
      jsonRequest(`/api/messes/${id}/publish`, { published: true }, cookie),
      { params: Promise.resolve({ id }) }
    );
    expect(early.status).toBe(409);
    await submitRoute.POST(jsonRequest(`/api/messes/${id}/submit`, { to: "SUBMITTED" }, cookie), {
      params: Promise.resolve({ id })
    });
    const again = await submitRoute.POST(
      jsonRequest(`/api/messes/${id}/submit`, { to: "SUBMITTED" }, cookie),
      { params: Promise.resolve({ id }) }
    );
    expect(again.status).toBe(409);
  }, 90000);

  it("requires reasons for rejection and suspends listings out of discovery", async () => {
    const { id, admin } = await approvedPublishedMess("owner@example.com");
    let visible = await listDiscoverable({ city: "Pune" });
    expect(visible.some((m) => m.id === id)).toBe(true);

    const noReason = await decisionRoute.POST(
      jsonRequest(`/api/admin/messes/${id}/decision`, { to: "SUSPENDED" }, admin),
      { params: Promise.resolve({ id }) }
    );
    expect(noReason.status).toBe(400);
    const suspend = await decisionRoute.POST(
      jsonRequest(
        `/api/admin/messes/${id}/decision`,
        { to: "SUSPENDED", reason: "Hygiene complaint" },
        admin
      ),
      { params: Promise.resolve({ id }) }
    );
    expect(suspend.status).toBe(200);
    const mess = await db.mess.findUniqueOrThrow({ where: { id } });
    expect(mess.published).toBe(false);
    visible = await listDiscoverable({ city: "Pune" });
    expect(visible.some((m) => m.id === id)).toBe(false);
  }, 120000);

  it("hides admin decisions from non-admins", async () => {
    const owner = await cookieFor("owner@example.com", "MESS_OWNER");
    const created = (await (await createMess(owner)).json()) as { mess: { id: string } };
    const id = created.mess.id;
    const res = await decisionRoute.POST(
      jsonRequest(`/api/admin/messes/${id}/decision`, { to: "APPROVED" }, owner),
      { params: Promise.resolve({ id }) }
    );
    expect(res.status).toBe(403);
    const list = await adminMessesRoute.GET(
      new Request("http://localhost/api/admin/messes", { headers: { cookie: owner } })
    );
    expect(list.status).toBe(403);
  }, 90000);
});

describe("discovery filters", () => {
  it("respects text, locality, veg, fulfillment, and city", async () => {
    const cookie = await cookieFor("owner@example.com", "MESS_OWNER");
    const admin = await cookieFor("admin@example.com", "PLATFORM_ADMIN");
    async function live(overrides: Record<string, unknown>) {
      const created = (await (await createMess(cookie, overrides)).json()) as {
        mess: { id: string };
      };
      const id = created.mess.id;
      await submitRoute.POST(jsonRequest(`/api/messes/${id}/submit`, { to: "SUBMITTED" }, cookie), {
        params: Promise.resolve({ id })
      });
      await decisionRoute.POST(
        jsonRequest(`/api/admin/messes/${id}/decision`, { to: "UNDER_REVIEW" }, admin),
        { params: Promise.resolve({ id }) }
      );
      await decisionRoute.POST(
        jsonRequest(`/api/admin/messes/${id}/decision`, { to: "APPROVED" }, admin),
        { params: Promise.resolve({ id }) }
      );
      await publishRoute.POST(
        jsonRequest(`/api/messes/${id}/publish`, { published: true }, cookie),
        {
          params: Promise.resolve({ id })
        }
      );
      return id;
    }
    const vegId = await live({
      name: "Shuddh Veg",
      locality: "Kothrud",
      vegType: "VEG",
      serviceAreas: ["Kothrud"],
      pickupAllowed: true,
      deliveryAllowed: false
    });
    const nonvegId = await live({
      name: "Spice Nonveg House",
      locality: "Camp",
      vegType: "NON_VEG",
      serviceAreas: ["Camp", "MG Road"],
      pickupAllowed: true,
      deliveryAllowed: true
    });
    // A draft that is never submitted must stay invisible.
    const draftRes = await createMess(cookie, {
      name: "Draft Kitchen",
      locality: "Camp",
      vegType: "BOTH",
      serviceAreas: ["Camp"]
    });
    expect(draftRes.status).toBe(201);

    const all = await listDiscoverable({ city: "Pune" });
    expect(all.map((m) => m.id).sort()).toEqual([vegId, nonvegId].sort());

    expect((await listDiscoverable({ city: "Pune", q: "spice" })).map((m) => m.id)).toEqual([
      nonvegId
    ]);
    expect(
      (await listDiscoverable({ city: "Pune", locality: "MG Road" })).map((m) => m.id)
    ).toEqual([nonvegId]);
    expect(
      (await listDiscoverable({ city: "Pune", locality: "Kothrud" })).map((m) => m.id)
    ).toEqual([vegId]);
    expect((await listDiscoverable({ city: "Pune", veg: "VEG" })).map((m) => m.id).sort()).toEqual(
      [vegId].sort()
    );
    const delivery = await listDiscoverable({ city: "Pune", fulfillment: "delivery" });
    expect(delivery.map((m) => m.id)).toEqual([nonvegId]);
    expect(await listDiscoverable({ city: "Mumbai" })).toEqual([]);
  }, 180000);
});

describe("staff assignment", () => {
  it("adds, scopes, and removes staff", async () => {
    const owner = await cookieFor("owner@example.com", "MESS_OWNER");
    const created = (await (await createMess(owner)).json()) as { mess: { id: string } };
    const id = created.mess.id;
    const staffCookie = await cookieFor("staff@example.com", "MESS_STAFF");

    const add = await staffRoute.POST(
      jsonRequest(`/api/messes/${id}/staff`, { email: "staff@example.com" }, owner),
      {
        params: Promise.resolve({ id })
      }
    );
    expect(add.status).toBe(201);

    const staffGet = await messByIdRoute.GET(
      new Request(`http://localhost/api/messes/${id}`, { headers: { cookie: staffCookie } }),
      { params: Promise.resolve({ id }) }
    );
    expect(staffGet.status).toBe(200);

    const staffPatch = await messByIdRoute.PATCH(
      jsonRequest(`/api/messes/${id}`, MESS, staffCookie),
      {
        params: Promise.resolve({ id })
      }
    );
    expect(staffPatch.status).toBe(403);

    const dup = await staffRoute.POST(
      jsonRequest(`/api/messes/${id}/staff`, { email: "staff@example.com" }, owner),
      { params: Promise.resolve({ id }) }
    );
    expect(dup.status).toBe(409);

    const notStaff = await staffRoute.POST(
      jsonRequest(`/api/messes/${id}/staff`, { email: "owner@example.com" }, owner),
      { params: Promise.resolve({ id }) }
    );
    expect(notStaff.status).toBe(404);

    const unknown = await staffRoute.POST(
      jsonRequest(`/api/messes/${id}/staff`, { email: "ghost@example.com" }, owner),
      { params: Promise.resolve({ id }) }
    );
    expect(unknown.status).toBe(404);

    const otherOwner = await cookieFor("other@example.com", "MESS_OWNER");
    const foreign = await staffRoute.POST(
      jsonRequest(`/api/messes/${id}/staff`, { email: "staff@example.com" }, otherOwner),
      { params: Promise.resolve({ id }) }
    );
    expect(foreign.status).toBe(404);

    const remove = await staffRoute.DELETE(
      new Request(`http://localhost/api/messes/${id}/staff?userId=${encodeURIComponent("x")}`, {
        headers: { cookie: owner }
      }),
      { params: Promise.resolve({ id }) }
    );
    expect(remove.status).toBe(200);
    const staffMember = await db.user.findUniqueOrThrow({ where: { email: "staff@example.com" } });
    await staffRoute.DELETE(
      new Request(`http://localhost/api/messes/${id}/staff?userId=${staffMember.id}`, {
        headers: { cookie: owner }
      }),
      { params: Promise.resolve({ id }) }
    );
    const afterRemove = await messByIdRoute.GET(
      new Request(`http://localhost/api/messes/${id}`, { headers: { cookie: staffCookie } }),
      { params: Promise.resolve({ id }) }
    );
    expect(afterRemove.status).toBe(404);
  }, 180000);
});
