import { execSync } from "node:child_process";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const DEV_URL = "postgresql://smartmess:smartmess_dev_pw@localhost:5432/smartmess?schema=public";
const TEST_DB = "smartmess_test_subs";
const TEST_URL = `postgresql://smartmess:smartmess_dev_pw@localhost:5432/${TEST_DB}?schema=public`;

let db!: import("@prisma/client").PrismaClient;
let auth!: (typeof import("@/lib/auth"))["auth"];
let devMailbox!: (typeof import("@/lib/auth"))["devMailbox"];
let clearDevMailbox!: (typeof import("@/lib/auth"))["clearDevMailbox"];
let authHandler!: typeof import("@/app/api/auth/[...all]/route");
let signUpRoute!: typeof import("@/app/api/auth/sign-up/route");
let plansRoute!: typeof import("@/app/api/messes/[id]/plans/route");
let subsRoute!: typeof import("@/app/api/subscriptions/route");
let subByIdRoute!: typeof import("@/app/api/subscriptions/[id]/route");
let skipRoute!: typeof import("@/app/api/subscriptions/[id]/skip/route");
let pauseRoute!: typeof import("@/app/api/subscriptions/[id]/pause/route");
let resumeRoute!: typeof import("@/app/api/subscriptions/[id]/resume/route");
let cancelSubRoute!: typeof import("@/app/api/subscriptions/[id]/cancel/route");
let renewRoute!: typeof import("@/app/api/subscriptions/[id]/renew/route");
let adjustRoute!: typeof import("@/app/api/admin/subscriptions/[id]/adjust/route");
let mockPayRoute!: typeof import("@/app/api/payments/mock/route");
let messSubsRoute!: typeof import("@/app/api/messes/[id]/subscriptions/route");

function jsonRequest(path: string, body: unknown, cookie?: string, method = "POST") {
  return new Request(`http://localhost${path}`, {
    method,
    headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
}

async function cleanDb() {
  await db.subscriptionAdjustment.deleteMany();
  await db.subscriptionPause.deleteMany();
  await db.subscriptionSkip.deleteMany();
  await db.subscription.deleteMany();
  await db.subscriptionPlan.deleteMany();
  await db.refund.deleteMany();
  await db.processedWebhook.deleteMany();
  await db.payment.deleteMany();
  await db.orderItem.deleteMany();
  await db.order.deleteMany();
  await db.slotDay.deleteMany();
  await db.dateMenuItem.deleteMany();
  await db.dateMenu.deleteMany();
  await db.weeklyMenuItem.deleteMany();
  await db.weeklyMenu.deleteMany();
  await db.holiday.deleteMany();
  await db.menuItem.deleteMany();
  await db.menuSlot.deleteMany();
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
  const res = await signUpRoute.POST(
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
  name: "Sub Kitchen",
  phone: "9876543210",
  line1: "1, MG Road",
  locality: "Camp",
  city: "Pune",
  state: "Maharashtra",
  pincode: "411001",
  vegType: "BOTH",
  pickupAllowed: true,
  deliveryAllowed: true,
  serviceAreas: ["Camp"],
  operatingDays: ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"],
  opensAt: "07:00",
  closesAt: "21:00"
};

async function livePlan(ownerCookie: string, adminCookie: string) {
  const messesApi = await import("@/app/api/messes/route");
  const submitApi = await import("@/app/api/messes/[id]/submit/route");
  const decisionApi = await import("@/app/api/admin/messes/[id]/decision/route");
  const publishApi = await import("@/app/api/messes/[id]/publish/route");
  const created = (await (
    await messesApi.POST(jsonRequest("/api/messes", MESS, ownerCookie))
  ).json()) as { mess: { id: string } };
  const messId = created.mess.id;
  await submitApi.POST(
    jsonRequest(`/api/messes/${messId}/submit`, { to: "SUBMITTED" }, ownerCookie),
    {
      params: Promise.resolve({ id: messId })
    }
  );
  for (const to of ["UNDER_REVIEW", "APPROVED"]) {
    await decisionApi.POST(
      jsonRequest(`/api/admin/messes/${messId}/decision`, { to }, adminCookie),
      {
        params: Promise.resolve({ id: messId })
      }
    );
  }
  await publishApi.POST(
    jsonRequest(`/api/messes/${messId}/publish`, { published: true }, ownerCookie),
    {
      params: Promise.resolve({ id: messId })
    }
  );
  const slotsApi = await import("@/app/api/messes/[id]/slots/route");
  const slot = (await (
    await slotsApi.POST(
      jsonRequest(
        `/api/messes/${messId}/slots`,
        { name: "Lunch", cutoffTime: "23:59", sortOrder: 1 },
        ownerCookie
      ),
      { params: Promise.resolve({ id: messId }) }
    )
  ).json()) as { slot: { id: string } };
  const itemsApi = await import("@/app/api/messes/[id]/items/route");
  const item = (await (
    await itemsApi.POST(
      jsonRequest(
        `/api/messes/${messId}/items`,
        { name: "Thali", pricePaise: 9000, vegType: "VEG" },
        ownerCookie
      ),
      { params: Promise.resolve({ id: messId }) }
    )
  ).json()) as { item: { id: string } };
  const weeklyApi = await import("@/app/api/messes/[id]/weekly/route");
  const weeklyItemsApi = await import("@/app/api/messes/[id]/weekly/[weeklyId]/route");
  for (let dow = 0; dow < 7; dow++) {
    const weekly = (await (
      await weeklyApi.POST(
        jsonRequest(
          `/api/messes/${messId}/weekly`,
          { slotId: slot.slot.id, dayOfWeek: dow, capacity: 50 },
          ownerCookie
        ),
        { params: Promise.resolve({ id: messId }) }
      )
    ).json()) as { weekly: { id: string } };
    await weeklyItemsApi.POST(
      jsonRequest(
        `/api/messes/${messId}/weekly/${weekly.weekly.id}`,
        { itemId: item.item.id },
        ownerCookie
      ),
      { params: Promise.resolve({ id: messId, weeklyId: weekly.weekly.id }) }
    );
  }
  const plan = (await (
    await plansRoute.POST(
      jsonRequest(
        `/api/messes/${messId}/plans`,
        {
          slotId: slot.slot.id,
          name: "Lunch x20",
          mealsTotal: 20,
          validityDays: 30,
          pricePaise: 160000
        },
        ownerCookie
      ),
      { params: Promise.resolve({ id: messId }) }
    )
  ).json()) as { plan: { id: string } };
  return { messId, slotId: slot.slot.id, itemId: item.item.id, planId: plan.plan.id };
}

async function buySubscription(customerCookie: string, planId: string) {
  const created = (await (
    await subsRoute.POST(jsonRequest("/api/subscriptions", { planId }, customerCookie))
  ).json()) as { subscriptionId: string };
  const subId = created.subscriptionId;
  const paid = await mockPayRoute.POST(
    jsonRequest("/api/payments/mock", { subscriptionId: subId, action: "capture" }, customerCookie)
  );
  expect(paid.status).toBe(200);
  expect(((await paid.json()) as { outcome: string }).outcome).toBe("CONFIRMED");
  return subId;
}

function addDaysStr(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

function todayIST(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "01";
  return `${get("year")}-${get("month")}-${get("day")}`;
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
  signUpRoute = await import("@/app/api/auth/sign-up/route");
  plansRoute = await import("@/app/api/messes/[id]/plans/route");
  subsRoute = await import("@/app/api/subscriptions/route");
  subByIdRoute = await import("@/app/api/subscriptions/[id]/route");
  skipRoute = await import("@/app/api/subscriptions/[id]/skip/route");
  pauseRoute = await import("@/app/api/subscriptions/[id]/pause/route");
  resumeRoute = await import("@/app/api/subscriptions/[id]/resume/route");
  cancelSubRoute = await import("@/app/api/subscriptions/[id]/cancel/route");
  renewRoute = await import("@/app/api/subscriptions/[id]/renew/route");
  adjustRoute = await import("@/app/api/admin/subscriptions/[id]/adjust/route");
  mockPayRoute = await import("@/app/api/payments/mock/route");
  messSubsRoute = await import("@/app/api/messes/[id]/subscriptions/route");
}, 180000);

beforeEach(async () => {
  await cleanDb();
  clearDevMailbox();
});

describe("purchase and activation", () => {
  it("creates correct entitlements and blocks unavailable plans", async () => {
    const owner = await cookieFor("owner@example.com", "MESS_OWNER");
    const admin = await cookieFor("admin@example.com", "PLATFORM_ADMIN");
    const customer = await cookieFor("cust@example.com");
    const { messId, planId } = await livePlan(owner, admin);
    void messId;

    const subId = await buySubscription(customer, planId);
    const view = (await (
      await subByIdRoute.GET(
        new Request(`http://localhost/api/subscriptions/${subId}`, {
          headers: { cookie: customer }
        }),
        { params: Promise.resolve({ id: subId }) }
      )
    ).json()) as {
      subscription: {
        status: string;
        remaining: number;
        mealsTotal: number;
        startDate: string;
        endDate: string;
        upcoming: string[];
      };
    };
    expect(view.subscription.status).toBe("ACTIVE");
    expect(view.subscription.remaining).toBe(20);
    expect(view.subscription.mealsTotal).toBe(20);
    expect(view.subscription.endDate).toBe(addDaysStr(view.subscription.startDate, 29));
    expect(view.subscription.upcoming.length).toBeGreaterThan(0);

    // Duplicate capture is a no-op, not a second activation.
    const again = await mockPayRoute.POST(
      jsonRequest("/api/payments/mock", { subscriptionId: subId, action: "capture" }, customer)
    );
    expect(((await again.json()) as { outcome: string }).outcome).toBe("DUPLICATE");

    // Stranger sees nothing.
    const stranger = await cookieFor("stranger@example.com");
    const peek = await subByIdRoute.GET(
      new Request(`http://localhost/api/subscriptions/${subId}`, { headers: { cookie: stranger } }),
      { params: Promise.resolve({ id: subId }) }
    );
    expect(peek.status).toBe(404);
  }, 240000);

  it("rejects inactive plans", async () => {
    const owner = await cookieFor("owner@example.com", "MESS_OWNER");
    const admin = await cookieFor("admin@example.com", "PLATFORM_ADMIN");
    const customer = await cookieFor("cust@example.com");
    const { messId, planId } = await livePlan(owner, admin);
    await db.subscriptionPlan.update({ where: { id: planId }, data: { active: false } });
    const res = await subsRoute.POST(jsonRequest("/api/subscriptions", { planId }, customer));
    expect(res.status).toBe(409);
    void messId;
  }, 180000);
});

describe("skip workflows", () => {
  it("skips preserve balance, enforce cutoffs, and never double-apply", async () => {
    const owner = await cookieFor("owner@example.com", "MESS_OWNER");
    const admin = await cookieFor("admin@example.com", "PLATFORM_ADMIN");
    const customer = await cookieFor("cust@example.com");
    const { planId } = await livePlan(owner, admin);
    const subId = await buySubscription(customer, planId);
    const today = todayIST();
    const d1 = addDaysStr(today, 1);
    const d2 = addDaysStr(today, 2);

    const skipped = await skipRoute.POST(
      jsonRequest(`/api/subscriptions/${subId}/skip`, { dates: [d1, d2] }, customer),
      { params: Promise.resolve({ id: subId }) }
    );
    expect(skipped.status).toBe(201);
    const view = (await (
      await subByIdRoute.GET(
        new Request(`http://localhost/api/subscriptions/${subId}`, {
          headers: { cookie: customer }
        }),
        { params: Promise.resolve({ id: subId }) }
      )
    ).json()) as { subscription: { remaining: number; upcoming: string[] } };
    expect(view.subscription.remaining).toBe(20);
    expect(view.subscription.upcoming).not.toContain(d1);
    expect(view.subscription.upcoming).not.toContain(d2);

    const dup = await skipRoute.POST(
      jsonRequest(`/api/subscriptions/${subId}/skip`, { dates: [d1] }, customer),
      { params: Promise.resolve({ id: subId }) }
    );
    expect(dup.status).toBe(409);

    const past = await skipRoute.POST(
      jsonRequest(`/api/subscriptions/${subId}/skip`, { dates: [addDaysStr(today, -5)] }, customer),
      { params: Promise.resolve({ id: subId }) }
    );
    expect(past.status).toBe(400);
  }, 240000);
});

describe("pause and resume", () => {
  it("pauses from tomorrow and extends only lost service days", async () => {
    const owner = await cookieFor("owner@example.com", "MESS_OWNER");
    const admin = await cookieFor("admin@example.com", "PLATFORM_ADMIN");
    const customer = await cookieFor("cust@example.com");
    const { planId } = await livePlan(owner, admin);
    const subId = await buySubscription(customer, planId);
    const today = todayIST();

    const paused = await pauseRoute.POST(
      jsonRequest(`/api/subscriptions/${subId}/pause`, {}, customer),
      { params: Promise.resolve({ id: subId }) }
    );
    expect(paused.status).toBe(200);
    expect(((await paused.json()) as { pauseStart: string }).pauseStart).toBe(addDaysStr(today, 1));

    const view = (await (
      await subByIdRoute.GET(
        new Request(`http://localhost/api/subscriptions/${subId}`, {
          headers: { cookie: customer }
        }),
        { params: Promise.resolve({ id: subId }) }
      )
    ).json()) as { subscription: { remaining: number; endDate: string } };
    const endBefore = view.subscription.endDate;

    const again = await pauseRoute.POST(
      jsonRequest(`/api/subscriptions/${subId}/pause`, {}, customer),
      { params: Promise.resolve({ id: subId }) }
    );
    expect(again.status).toBe(409);

    // Resume 3 days later: 3 lost service days extend validity.
    // (vi fake timers move new Date() too — a bare Date.now mock does not.)
    vi.useFakeTimers();
    vi.setSystemTime(new Date(`${addDaysStr(today, 3)}T12:00:00Z`));
    let resumed: Response;
    try {
      resumed = await resumeRoute.POST(
        jsonRequest(`/api/subscriptions/${subId}/resume`, {}, customer),
        { params: Promise.resolve({ id: subId }) }
      );
    } finally {
      vi.useRealTimers();
    }
    expect(resumed.status).toBe(200);
    const body = (await resumed.json()) as { extensionDays: number; endDate: string };
    expect(body.extensionDays).toBe(3);
    expect(body.endDate).toBe(addDaysStr(endBefore, 3));

    const after = (await (
      await subByIdRoute.GET(
        new Request(`http://localhost/api/subscriptions/${subId}`, {
          headers: { cookie: customer }
        }),
        { params: Promise.resolve({ id: subId }) }
      )
    ).json()) as { subscription: { remaining: number; endDate: string; status: string } };
    expect(after.subscription.remaining).toBe(20);
    expect(after.subscription.status).toBe("ACTIVE");

    const reResume = await resumeRoute.POST(
      jsonRequest(`/api/subscriptions/${subId}/resume`, {}, customer),
      { params: Promise.resolve({ id: subId }) }
    );
    expect(reResume.status).toBe(409);
  }, 240000);
});

describe("cancel, renew, adjust", () => {
  it("cancels without refund and renews after expiry", async () => {
    const owner = await cookieFor("owner@example.com", "MESS_OWNER");
    const admin = await cookieFor("admin@example.com", "PLATFORM_ADMIN");
    const customer = await cookieFor("cust@example.com");
    const { planId } = await livePlan(owner, admin);
    const subId = await buySubscription(customer, planId);

    const cancelled = await cancelSubRoute.POST(
      jsonRequest(`/api/subscriptions/${subId}/cancel`, {}, customer),
      { params: Promise.resolve({ id: subId }) }
    );
    expect(cancelled.status).toBe(200);
    const view = (await (
      await subByIdRoute.GET(
        new Request(`http://localhost/api/subscriptions/${subId}`, {
          headers: { cookie: customer }
        }),
        { params: Promise.resolve({ id: subId }) }
      )
    ).json()) as { subscription: { status: string; upcoming: string[] } };
    expect(view.subscription.status).toBe("CANCELLED");
    expect(view.subscription.upcoming).toEqual([]);
    expect(await db.refund.count()).toBe(0);

    const twice = await cancelSubRoute.POST(
      jsonRequest(`/api/subscriptions/${subId}/cancel`, {}, customer),
      { params: Promise.resolve({ id: subId }) }
    );
    expect(twice.status).toBe(409);

    // Renew chains after the cancelled plan's end.
    const renewed = await renewRoute.POST(
      jsonRequest(`/api/subscriptions/${subId}/renew`, {}, customer),
      { params: Promise.resolve({ id: subId }) }
    );
    expect(renewed.status).toBe(201);
    const body = (await renewed.json()) as { subscriptionId: string };
    expect(body.subscriptionId).not.toBe(subId);
    const fresh = await db.subscription.findUniqueOrThrow({ where: { id: body.subscriptionId } });
    expect(fresh.status).toBe("PENDING_PAYMENT");
  }, 240000);

  it("applies audited admin adjustments", async () => {
    const owner = await cookieFor("owner@example.com", "MESS_OWNER");
    const admin = await cookieFor("admin@example.com", "PLATFORM_ADMIN");
    const customer = await cookieFor("cust@example.com");
    const { planId } = await livePlan(owner, admin);
    const subId = await buySubscription(customer, planId);
    const before = await db.subscription.findUniqueOrThrow({ where: { id: subId } });

    const noReason = await adjustRoute.POST(
      jsonRequest(
        `/api/admin/subscriptions/${subId}/adjust`,
        { kind: "EXTEND_VALIDITY", days: 5 },
        admin
      ),
      { params: Promise.resolve({ id: subId }) }
    );
    expect(noReason.status).toBe(400);

    const extended = await adjustRoute.POST(
      jsonRequest(
        `/api/admin/subscriptions/${subId}/adjust`,
        { kind: "EXTEND_VALIDITY", days: 5, reason: "Festival closure compensation" },
        admin
      ),
      { params: Promise.resolve({ id: subId }) }
    );
    expect(extended.status).toBe(200);
    const afterExtend = await db.subscription.findUniqueOrThrow({ where: { id: subId } });
    expect(addDaysStr(before.endDate.toISOString().slice(0, 10), 5)).toBe(
      afterExtend.endDate.toISOString().slice(0, 10)
    );

    const meals = await adjustRoute.POST(
      jsonRequest(
        `/api/admin/subscriptions/${subId}/adjust`,
        { kind: "ADD_MEALS", meals: 2, reason: "Goodwill" },
        admin
      ),
      { params: Promise.resolve({ id: subId }) }
    );
    expect(meals.status).toBe(200);
    const afterMeals = await db.subscription.findUniqueOrThrow({ where: { id: subId } });
    expect(afterMeals.mealsTotal).toBe(22);

    const audit = await db.subscriptionAdjustment.findMany({ where: { subscriptionId: subId } });
    expect(audit.length).toBe(2);
    expect(audit.every((a) => a.actorId && a.reason)).toBe(true);

    const nonAdmin = await adjustRoute.POST(
      jsonRequest(
        `/api/admin/subscriptions/${subId}/adjust`,
        { kind: "ADD_MEALS", meals: 99, reason: "Hack" },
        owner
      ),
      { params: Promise.resolve({ id: subId }) }
    );
    expect(nonAdmin.status).toBe(403);
  }, 240000);
});

describe("owner visibility and counts", () => {
  it("shows subscribers and per-slot demand", async () => {
    const owner = await cookieFor("owner@example.com", "MESS_OWNER");
    const admin = await cookieFor("admin@example.com", "PLATFORM_ADMIN");
    const customer = await cookieFor("cust@example.com");
    const { messId, planId, slotId } = await livePlan(owner, admin);
    const subId = await buySubscription(customer, planId);
    const today = todayIST();
    const d1 = addDaysStr(today, 1);
    await skipRoute.POST(
      jsonRequest(`/api/subscriptions/${subId}/skip`, { dates: [d1] }, customer),
      {
        params: Promise.resolve({ id: subId })
      }
    );

    const res = await messSubsRoute.GET(
      new Request(`http://localhost/api/messes/${messId}/subscriptions`, {
        headers: { cookie: owner }
      }),
      { params: Promise.resolve({ id: messId }) }
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      subscriptions: Array<{ id: string }>;
      upcomingCounts: Array<{ date: string; slotId: string; count: number }>;
    };
    expect(body.subscriptions.some((s) => s.id === subId)).toBe(true);
    const dayAfter = body.upcomingCounts.find(
      (c) => c.date === addDaysStr(today, 2) && c.slotId === slotId
    );
    expect(dayAfter?.count).toBe(1);
    const skippedDay = body.upcomingCounts.find((c) => c.date === d1);
    expect(skippedDay).toBeUndefined();

    const stranger = await cookieFor("stranger@example.com", "MESS_OWNER");
    const foreign = await messSubsRoute.GET(
      new Request(`http://localhost/api/messes/${messId}/subscriptions`, {
        headers: { cookie: stranger }
      }),
      { params: Promise.resolve({ id: messId }) }
    );
    expect(foreign.status).toBe(404);
  }, 240000);
});
