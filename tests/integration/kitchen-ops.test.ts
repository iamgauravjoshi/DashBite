import { execSync } from "node:child_process";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

const DEV_URL = "postgresql://smartmess:smartmess_dev_pw@localhost:5432/smartmess?schema=public";
const TEST_DB = "smartmess_test_kitchen";
const TEST_URL = `postgresql://smartmess:smartmess_dev_pw@localhost:5432/${TEST_DB}?schema=public`;

let db!: import("@prisma/client").PrismaClient;
let auth!: (typeof import("@/lib/auth"))["auth"];
let devMailbox!: (typeof import("@/lib/auth"))["devMailbox"];
let clearDevMailbox!: (typeof import("@/lib/auth"))["clearDevMailbox"];
let authHandler!: typeof import("@/app/api/auth/[...all]/route");
let signUpRoute!: typeof import("@/app/api/auth/sign-up/route");

function jsonRequest(path: string, body: unknown, cookie?: string, method = "POST") {
  return new Request(`http://localhost${path}`, {
    method,
    headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
}

async function cleanDb() {
  await db.kitchenAdjustment.deleteMany();
  await db.kitchenSheet.deleteMany();
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
  name: "Kitchen Kitchen",
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

const MONDAY = "2026-10-26";

async function fullKitchen() {
  const owner = await cookieFor("owner@example.com", "MESS_OWNER");
  const admin = await cookieFor("admin@example.com", "PLATFORM_ADMIN");
  const messesApi = await import("@/app/api/messes/route");
  const submitApi = await import("@/app/api/messes/[id]/submit/route");
  const decisionApi = await import("@/app/api/admin/messes/[id]/decision/route");
  const publishApi = await import("@/app/api/messes/[id]/publish/route");
  const messId = (
    (await (await messesApi.POST(jsonRequest("/api/messes", MESS, owner))).json()) as {
      mess: { id: string };
    }
  ).mess.id;
  await submitApi.POST(jsonRequest(`/api/messes/${messId}/submit`, { to: "SUBMITTED" }, owner), {
    params: Promise.resolve({ id: messId })
  });
  for (const to of ["UNDER_REVIEW", "APPROVED"]) {
    await decisionApi.POST(jsonRequest(`/api/admin/messes/${messId}/decision`, { to }, admin), {
      params: Promise.resolve({ id: messId })
    });
  }
  await publishApi.POST(jsonRequest(`/api/messes/${messId}/publish`, { published: true }, owner), {
    params: Promise.resolve({ id: messId })
  });
  const slotsApi = await import("@/app/api/messes/[id]/slots/route");
  const slotId = (
    (await (
      await slotsApi.POST(
        jsonRequest(`/api/messes/${messId}/slots`, { name: "Lunch", cutoffTime: "23:59" }, owner),
        { params: Promise.resolve({ id: messId }) }
      )
    ).json()) as { slot: { id: string } }
  ).slot.id;
  const itemsApi = await import("@/app/api/messes/[id]/items/route");
  async function addItem(name: string, pricePaise: number, vegType: string) {
    return (
      (await (
        await itemsApi.POST(
          jsonRequest(`/api/messes/${messId}/items`, { name, pricePaise, vegType }, owner),
          {
            params: Promise.resolve({ id: messId })
          }
        )
      ).json()) as { item: { id: string } }
    ).item.id;
  }
  const dalId = await addItem("Dal Khichdi", 9000, "VEG");
  const chickenId = await addItem("Chicken Curry", 14000, "NON_VEG");
  const weeklyApi = await import("@/app/api/messes/[id]/weekly/route");
  const weeklyItemsApi = await import("@/app/api/messes/[id]/weekly/[weeklyId]/route");
  for (let dow = 0; dow < 7; dow++) {
    const weekly = (await (
      await weeklyApi.POST(
        jsonRequest(
          `/api/messes/${messId}/weekly`,
          { slotId, dayOfWeek: dow, capacity: 50 },
          owner
        ),
        { params: Promise.resolve({ id: messId }) }
      )
    ).json()) as { weekly: { id: string } };
    for (const itemId of [dalId, chickenId]) {
      await weeklyItemsApi.POST(
        jsonRequest(`/api/messes/${messId}/weekly/${weekly.weekly.id}`, { itemId }, owner),
        { params: Promise.resolve({ id: messId, weeklyId: weekly.weekly.id }) }
      );
    }
  }
  const plansApi = await import("@/app/api/messes/[id]/plans/route");
  const planId = (
    (await (
      await plansApi.POST(
        jsonRequest(
          `/api/messes/${messId}/plans`,
          {
            slotId,
            name: "Lunch x20",
            mealsTotal: 20,
            validityDays: 30,
            pricePaise: 160000
          },
          owner
        ),
        { params: Promise.resolve({ id: messId }) }
      )
    ).json()) as { plan: { id: string } }
  ).plan.id;

  async function subscribe(email: string) {
    const cookie = await cookieFor(email);
    const subsApi = await import("@/app/api/subscriptions/route");
    const mockApi = await import("@/app/api/payments/mock/route");
    const created = (await (
      await subsApi.POST(jsonRequest("/api/subscriptions", { planId }, cookie))
    ).json()) as { subscriptionId: string };
    await mockApi.POST(
      jsonRequest(
        "/api/payments/mock",
        { subscriptionId: created.subscriptionId, action: "capture" },
        cookie
      )
    );
    return { cookie, subId: created.subscriptionId };
  }
  const subA = await subscribe("a@example.com");
  const subB = await subscribe("b@example.com");

  async function order(email: string, qty: number, pay: "capture" | "fail" | "none" = "capture") {
    const cookie =
      email === "a@example.com" || email === "b@example.com" ? "" : await cookieFor(email);
    const useCookie =
      email === "a@example.com" ? subA.cookie : email === "b@example.com" ? subB.cookie : cookie;
    const ordersApi = await import("@/app/api/orders/route");
    const mockApi = await import("@/app/api/payments/mock/route");
    const created = (await (
      await ordersApi.POST(
        jsonRequest(
          "/api/orders",
          {
            messId,
            slotId,
            serviceDate: MONDAY,
            items: [
              { itemId: dalId, qty },
              { itemId: chickenId, qty: 1 }
            ],
            fulfillment: "PICKUP"
          },
          useCookie
        )
      )
    ).json()) as { orderId: string };
    if (pay !== "none") {
      await mockApi.POST(
        jsonRequest("/api/payments/mock", { orderId: created.orderId, action: pay }, useCookie)
      );
    }
    return { cookie: useCookie, orderId: created.orderId };
  }
  const order1 = await order("c@example.com", 2, "capture");
  const pending = await order("d@example.com", 1, "none");
  return { owner, admin, messId, slotId, dalId, chickenId, subA, subB, order1, pending };
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
}, 180000);

beforeEach(async () => {
  await cleanDb();
  clearDevMailbox();
});

describe("production sheet numbers", () => {
  it("consolidates orders and subscribers without double counting", async () => {
    const fx = await fullKitchen();
    const { buildSheet } = await import("@/lib/kitchen");
    // Sub B skips Monday.
    const skipApi = await import("@/app/api/subscriptions/[id]/skip/route");
    await skipApi.POST(
      jsonRequest(`/api/subscriptions/${fx.subB.subId}/skip`, { dates: [MONDAY] }, fx.subB.cookie),
      { params: Promise.resolve({ id: fx.subB.subId }) }
    );
    const sheet = await buildSheet(fx.messId, fx.slotId, MONDAY);
    expect(sheet.menu?.status).toBe("open");
    expect(sheet.oneTimeTotal).toBe(3);
    expect(sheet.oneTime.find((l) => l.name === "Dal Khichdi")?.qty).toBe(2);
    expect(sheet.oneTime.find((l) => l.name === "Chicken Curry")?.qty).toBe(1);
    expect(sheet.oneTime.find((l) => l.name === "Dal Khichdi")?.vegType).toBe("VEG");
    expect(sheet.subscribers).toBe(1);
    expect(sheet.prepTotal).toBe(4);
    expect(sheet.packing.length).toBe(1);
    expect(sheet.packing[0].shortId).toHaveLength(6);
    expect(sheet.packing[0].totalQty).toBe(3);
    expect(sheet.pending.length).toBe(1);
    expect(sheet.exceptions).toEqual([]);
    expect(sheet.sheet).toBeNull();
  }, 240000);

  it("reflects cancels and skips accurately", async () => {
    const fx = await fullKitchen();
    const { buildSheet } = await import("@/lib/kitchen");
    const cancelApi = await import("@/app/api/orders/[id]/cancel/route");
    await cancelApi.POST(
      jsonRequest(`/api/orders/${fx.order1.orderId}/cancel`, {}, fx.order1.cookie),
      {
        params: Promise.resolve({ id: fx.order1.orderId })
      }
    );
    const sheet = await buildSheet(fx.messId, fx.slotId, MONDAY);
    expect(sheet.oneTimeTotal).toBe(0);
    expect(sheet.packing).toEqual([]);
    expect(sheet.exceptions.length).toBe(1);
    expect(sheet.exceptions[0].reason).toBe("CUSTOMER_CANCEL");
    expect(sheet.subscribers).toBe(2);
    expect(sheet.prepTotal).toBe(2);
  }, 240000);

  it("finalizes once and tracks late changes with audit", async () => {
    const fx = await fullKitchen();
    const { buildSheet, finalizeSheet } = await import("@/lib/kitchen");
    const finalizeApi = await import("@/app/api/messes/[id]/kitchen/finalize/route");
    const adjustApi = await import("@/app/api/messes/[id]/kitchen/adjust/route");
    const ownerUser = await db.user.findUniqueOrThrow({ where: { email: "owner@example.com" } });

    const first = await finalizeApi.POST(
      jsonRequest(
        `/api/messes/${fx.messId}/kitchen/finalize`,
        { slotId: fx.slotId, date: MONDAY },
        fx.owner
      ),
      { params: Promise.resolve({ id: fx.messId }) }
    );
    expect(first.status).toBe(200);
    const second = await finalizeApi.POST(
      jsonRequest(
        `/api/messes/${fx.messId}/kitchen/finalize`,
        { slotId: fx.slotId, date: MONDAY },
        fx.owner
      ),
      { params: Promise.resolve({ id: fx.messId }) }
    );
    expect(second.status).toBe(200);

    // Late confirmed order lands in late-changes, not silently.
    const late = await (
      await import("@/app/api/orders/route")
    ).POST(
      jsonRequest(
        "/api/orders",
        {
          messId: fx.messId,
          slotId: fx.slotId,
          serviceDate: MONDAY,
          items: [{ itemId: fx.dalId, qty: 1 }],
          fulfillment: "PICKUP"
        },
        fx.pending.cookie
      )
    );
    const lateId = ((await late.json()) as { orderId: string }).orderId;
    await (
      await import("@/app/api/payments/mock/route")
    ).POST(
      jsonRequest("/api/payments/mock", { orderId: lateId, action: "capture" }, fx.pending.cookie)
    );

    const badAdjust = await adjustApi.POST(
      jsonRequest(
        `/api/messes/${fx.messId}/kitchen/adjust`,
        {
          slotId: fx.slotId,
          date: MONDAY,
          itemLabel: "Extra",
          qtyDelta: 0,
          reason: "x"
        },
        fx.owner
      ),
      { params: Promise.resolve({ id: fx.messId }) }
    );
    expect(badAdjust.status).toBe(400);
    const noReason = await adjustApi.POST(
      jsonRequest(
        `/api/messes/${fx.messId}/kitchen/adjust`,
        {
          slotId: fx.slotId,
          date: MONDAY,
          itemLabel: "Extra",
          qtyDelta: 2,
          reason: ""
        },
        fx.owner
      ),
      { params: Promise.resolve({ id: fx.messId }) }
    );
    expect(noReason.status).toBe(400);
    const adj = await adjustApi.POST(
      jsonRequest(
        `/api/messes/${fx.messId}/kitchen/adjust`,
        {
          slotId: fx.slotId,
          date: MONDAY,
          itemLabel: "Walk-in buffer",
          qtyDelta: 4,
          reason: "Festival rush expected"
        },
        fx.owner
      ),
      { params: Promise.resolve({ id: fx.messId }) }
    );
    expect(adj.status).toBe(201);

    const sheet = await buildSheet(fx.messId, fx.slotId, MONDAY);
    expect(sheet.sheet?.status).toBe("FINALIZED");
    expect(sheet.adjustmentTotal).toBe(4);
    expect(sheet.prepTotal).toBe(3 + 2 + 4 + 1);
    const kinds = sheet.lateChanges.map((l) => l.kind);
    expect(kinds).toContain("ORDER_CONFIRMED");
    expect(kinds).toContain("ADJUSTMENT");
    const adjEntry = sheet.lateChanges.find((l) => l.kind === "ADJUSTMENT");
    expect(adjEntry?.detail).toContain("Festival rush expected");
    void ownerUser;
    void finalizeSheet;
  }, 240000);

  it("scopes kitchen access (owner, assigned staff, strangers)", async () => {
    const fx = await fullKitchen();
    const kitchenApi = await import("@/app/api/messes/[id]/kitchen/route");
    const get = (cookie: string) =>
      kitchenApi.GET(
        new Request(
          `http://localhost/api/messes/${fx.messId}/kitchen?slotId=${fx.slotId}&date=${MONDAY}`,
          {
            headers: { cookie }
          }
        ),
        { params: Promise.resolve({ id: fx.messId }) }
      );
    expect((await get(fx.owner)).status).toBe(200);

    const staffCookie = await cookieFor("staff@example.com", "MESS_STAFF");
    expect((await get(staffCookie)).status).toBe(404);
    const staffApi = await import("@/app/api/messes/[id]/staff/route");
    await staffApi.POST(
      jsonRequest(`/api/messes/${fx.messId}/staff`, { email: "staff@example.com" }, fx.owner),
      { params: Promise.resolve({ id: fx.messId }) }
    );
    const staffSheet = await get(staffCookie);
    expect(staffSheet.status).toBe(200);
    const finalizeApi = await import("@/app/api/messes/[id]/kitchen/finalize/route");
    const fin = await finalizeApi.POST(
      jsonRequest(
        `/api/messes/${fx.messId}/kitchen/finalize`,
        { slotId: fx.slotId, date: MONDAY },
        staffCookie
      ),
      { params: Promise.resolve({ id: fx.messId }) }
    );
    expect(fin.status).toBe(200);

    const stranger = await cookieFor("stranger@example.com", "MESS_OWNER");
    expect((await get(stranger)).status).toBe(404);
    const customer = await cookieFor("cust@example.com");
    expect((await get(customer)).status).toBe(403);
  }, 240000);

  it("keeps committed orders visible on holidays (BR-03)", async () => {
    const fx = await fullKitchen();
    const { buildSheet } = await import("@/lib/kitchen");
    await db.holiday.create({
      data: { messId: fx.messId, date: new Date(`${MONDAY}T00:00:00.000Z`), reason: "Closed" }
    });
    const sheet = await buildSheet(fx.messId, fx.slotId, MONDAY);
    expect(sheet.menu?.status).toBe("closed");
    // Committed one-time orders survive; subscriber demand stops (no service).
    expect(sheet.oneTimeTotal).toBe(3);
    expect(sheet.packing.length).toBe(1);
    expect(sheet.subscribers).toBe(0);
  }, 180000);
});
