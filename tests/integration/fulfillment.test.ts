import { execSync } from "node:child_process";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

const DEV_URL = "postgresql://smartmess:smartmess_dev_pw@localhost:5432/smartmess?schema=public";
const TEST_DB = "smartmess_test_fulfill";
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
  await db.fulfillmentAttempt.deleteMany();
  await db.fulfillment.deleteMany();
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
  name: "Fulfill Kitchen",
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

async function liveKitchen() {
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
  const itemId = (
    (await (
      await itemsApi.POST(
        jsonRequest(
          `/api/messes/${messId}/items`,
          { name: "Thali", pricePaise: 9000, vegType: "VEG" },
          owner
        ),
        { params: Promise.resolve({ id: messId }) }
      )
    ).json()) as { item: { id: string } }
  ).item.id;
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
    await weeklyItemsApi.POST(
      jsonRequest(`/api/messes/${messId}/weekly/${weekly.weekly.id}`, { itemId }, owner),
      { params: Promise.resolve({ id: messId, weeklyId: weekly.weekly.id }) }
    );
  }
  return { owner, admin, messId, slotId, itemId };
}

async function placeOrder(
  customerCookie: string,
  fx: { messId: string; slotId: string; itemId: string },
  fulfillment: "PICKUP" | "DELIVERY",
  addressId?: string
) {
  const ordersApi = await import("@/app/api/orders/route");
  const mockApi = await import("@/app/api/payments/mock/route");
  const created = (await (
    await ordersApi.POST(
      jsonRequest(
        "/api/orders",
        {
          messId: fx.messId,
          slotId: fx.slotId,
          serviceDate: MONDAY,
          items: [{ itemId: fx.itemId, qty: 1 }],
          fulfillment,
          ...(addressId ? { addressId } : {})
        },
        customerCookie
      )
    )
  ).json()) as { orderId: string };
  const settled = (await (
    await mockApi.POST(
      jsonRequest(
        "/api/payments/mock",
        { orderId: created.orderId, action: "capture" },
        customerCookie
      )
    )
  ).json()) as { outcome: string };
  expect(settled.outcome).toBe("CONFIRMED");
  return created.orderId;
}

async function fulfillmentOf(orderId: string) {
  return db.fulfillment.findUniqueOrThrow({ where: { orderId } });
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

describe("pickup path", () => {
  it("auto-creates, advances READY to PICKED_UP, reconciles without touching money", async () => {
    const fx = await liveKitchen();
    const customer = await cookieFor("cust@example.com");
    const orderId = await placeOrder(customer, fx, "PICKUP");
    const created = await fulfillmentOf(orderId);
    expect(created.status).toBe("PENDING");

    const advanceApi = await import("@/app/api/messes/[id]/fulfillment/[fid]/route");
    const adv = (fid: string, body: unknown, cookie: string, messId = fx.messId) =>
      advanceApi.POST(
        jsonRequest(`/api/messes/${messId}/fulfillment/${fid}/advance`, body, cookie),
        {
          params: Promise.resolve({ id: messId, fid })
        }
      );

    // Pickup orders skip assignment.
    const noAssign = await adv(created.id, { to: "ASSIGNED" }, fx.owner);
    expect(noAssign.status).toBe(409);

    const ready = await adv(created.id, { to: "READY" }, fx.owner);
    expect(ready.status).toBe(200);
    const picked = await adv(created.id, { to: "PICKED_UP" }, fx.owner);
    expect(picked.status).toBe(200);

    const order = await db.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(order.status).toBe("COMPLETED");
    const payment = await db.payment.findFirstOrThrow({ where: { orderId } });
    expect(payment.status).toBe("CAPTURED");
    expect(await db.refund.count()).toBe(0);

    // Terminal: nothing further moves.
    const again = await adv(created.id, { to: "READY" }, fx.owner);
    expect(again.status).toBe(409);
  }, 240000);
});

describe("delivery path with agent", () => {
  it("assigns, dispatches, delivers, and isolates strangers", async () => {
    const fx = await liveKitchen();
    const agent = await cookieFor("agent@example.com", "DELIVERY_AGENT");
    const otherAgent = await cookieFor("other-agent@example.com", "DELIVERY_AGENT");
    const customer = await cookieFor("cust@example.com");
    const addressesApi = await import("@/app/api/addresses/route");
    const addressId = (
      (await (
        await addressesApi.POST(
          jsonRequest(
            "/api/addresses",
            {
              label: "Home",
              line1: "9, FC Road",
              locality: "Shivajinagar",
              city: "Pune",
              pincode: "411005"
            },
            customer
          )
        )
      ).json()) as { address: { id: string } }
    ).address.id;
    const orderId = await placeOrder(customer, fx, "DELIVERY", addressId);
    const created = await fulfillmentOf(orderId);

    const advanceApi = await import("@/app/api/messes/[id]/fulfillment/[fid]/route");
    const adv = (body: unknown, cookie: string) =>
      advanceApi.POST(
        jsonRequest(`/api/messes/${fx.messId}/fulfillment/${created.id}/advance`, body, cookie),
        {
          params: Promise.resolve({ id: fx.messId, fid: created.id })
        }
      );

    expect((await adv({ to: "READY" }, fx.owner)).status).toBe(200);
    // Unknown email and wrong role rejected.
    expect(
      (
        await adv(
          { to: "ASSIGNED", assigneeType: "AGENT", assigneeEmail: "ghost@example.com" },
          fx.owner
        )
      ).status
    ).toBe(404);
    const assigned = await adv(
      { to: "ASSIGNED", assigneeType: "AGENT", assigneeEmail: "agent@example.com" },
      fx.owner
    );
    expect(assigned.status).toBe(200);

    // Stranger agent sees and touches nothing.
    const tasksApi = await import("@/app/api/delivery/tasks/route");
    const otherTasks = (await (
      await tasksApi.GET(
        new Request("http://localhost/api/delivery/tasks", { headers: { cookie: otherAgent } })
      )
    ).json()) as { tasks: unknown[] };
    expect(otherTasks.tasks).toEqual([]);
    const foreign = await adv({ to: "DISPATCHED" }, otherAgent);
    expect(foreign.status).toBe(404);

    // Agent sees address + instructions for their stop only.
    const mine = (await (
      await tasksApi.GET(
        new Request("http://localhost/api/delivery/tasks", { headers: { cookie: agent } })
      )
    ).json()) as {
      tasks: Array<{ order: { address: { line1: string } | null }; mess: { name: string } }>;
    };
    expect(mine.tasks.length).toBe(1);
    expect(mine.tasks[0].order.address?.line1).toBe("9, FC Road");

    expect((await adv({ to: "DISPATCHED" }, agent)).status).toBe(200);
    expect((await adv({ to: "DELIVERED" }, agent)).status).toBe(200);
    const order = await db.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(order.status).toBe("COMPLETED");
    const history = (await (
      await tasksApi.GET(
        new Request("http://localhost/api/delivery/tasks?history=true", {
          headers: { cookie: agent }
        })
      )
    ).json()) as { tasks: unknown[] };
    expect(history.tasks.length).toBe(1);
  }, 240000);

  it("records failed attempts with reasons and flags review", async () => {
    const fx = await liveKitchen();
    const agent = await cookieFor("agent@example.com", "DELIVERY_AGENT");
    const customer = await cookieFor("cust@example.com");
    const addressesApi = await import("@/app/api/addresses/route");
    const addressId = (
      (await (
        await addressesApi.POST(
          jsonRequest(
            "/api/addresses",
            {
              label: "Home",
              line1: "9, FC Road",
              locality: "Shivajinagar",
              city: "Pune",
              pincode: "411005"
            },
            customer
          )
        )
      ).json()) as { address: { id: string } }
    ).address.id;
    const orderId = await placeOrder(customer, fx, "DELIVERY", addressId);
    const created = await fulfillmentOf(orderId);
    const advanceApi = await import("@/app/api/messes/[id]/fulfillment/[fid]/route");
    const failApi = await import("@/app/api/messes/[id]/fulfillment/[fid]/fail/route");
    const adv = (body: unknown, cookie: string) =>
      advanceApi.POST(
        jsonRequest(`/api/messes/${fx.messId}/fulfillment/${created.id}/advance`, body, cookie),
        {
          params: Promise.resolve({ id: fx.messId, fid: created.id })
        }
      );
    await adv({ to: "READY" }, fx.owner);
    await adv(
      { to: "ASSIGNED", assigneeType: "AGENT", assigneeEmail: "agent@example.com" },
      fx.owner
    );
    await adv({ to: "DISPATCHED" }, agent);

    const fail = (body: unknown, cookie: string) =>
      failApi.POST(
        jsonRequest(`/api/messes/${fx.messId}/fulfillment/${created.id}/fail`, body, cookie),
        {
          params: Promise.resolve({ id: fx.messId, fid: created.id })
        }
      );
    // Reason required; OTHER needs a note.
    expect((await fail({}, agent)).status).toBe(400);
    expect((await fail({ reason: "NOPE" }, agent)).status).toBe(400);
    expect((await fail({ reason: "OTHER" }, agent)).status).toBe(400);
    const first = await fail({ reason: "CUSTOMER_UNAVAILABLE" }, agent);
    expect(first.status).toBe(200);
    expect(((await first.json()) as { failedAttempts: number }).failedAttempts).toBe(1);
    // Status stays actionable; order untouched.
    const mid = await fulfillmentOf(orderId);
    expect(mid.status).toBe("DISPATCHED");
    expect((await db.order.findUniqueOrThrow({ where: { id: orderId } })).status).toBe("CONFIRMED");
    const second = await fail({ reason: "OTHER", note: "Gate locked, guard called" }, agent);
    expect(((await second.json()) as { failedAttempts: number }).failedAttempts).toBe(2);

    // Owner reassigns after failures; audit shows the trail.
    const staff = await cookieFor("staff@example.com", "MESS_STAFF");
    await db.messStaff.create({
      data: {
        messId: fx.messId,
        userId: (await db.user.findUniqueOrThrow({ where: { email: "staff@example.com" } })).id
      }
    });
    const reassign = await adv(
      { to: "ASSIGNED", assigneeType: "STAFF", assigneeEmail: "staff@example.com" },
      fx.owner
    );
    expect(reassign.status).toBe(200);
    void staff;
    const attempts = await db.fulfillmentAttempt.findMany({
      where: { fulfillmentId: created.id },
      orderBy: { createdAt: "asc" }
    });
    expect(attempts.map((a) => a.action)).toEqual([
      "CREATED",
      "READY",
      "ASSIGNED",
      "DISPATCHED",
      "FAILED_ATTEMPT",
      "FAILED_ATTEMPT",
      "REASSIGNED"
    ]);
  }, 240000);
});

describe("guards and reconciliation", () => {
  it("blocks jumps, customers, and foreign messes; money never moves on delivery events", async () => {
    const fx = await liveKitchen();
    const customer = await cookieFor("cust@example.com");
    const orderId = await placeOrder(customer, fx, "PICKUP");
    const created = await fulfillmentOf(orderId);
    const advanceApi = await import("@/app/api/messes/[id]/fulfillment/[fid]/route");
    const adv = (body: unknown, cookie: string, messId = fx.messId) =>
      advanceApi.POST(
        jsonRequest(`/api/messes/${messId}/fulfillment/${created.id}/advance`, body, cookie),
        {
          params: Promise.resolve({ id: messId, fid: created.id })
        }
      );

    expect((await adv({ to: "DELIVERED" }, fx.owner)).status).toBe(409);
    expect((await adv({ to: "READY" }, customer)).status).toBe(403);
    const otherOwner = await cookieFor("other@example.com", "MESS_OWNER");
    expect((await adv({ to: "READY" }, otherOwner, "nope")).status).toBe(404);

    await adv({ to: "READY" }, fx.owner);
    await adv({ to: "PICKED_UP" }, fx.owner);
    const payment = await db.payment.findFirstOrThrow({ where: { orderId } });
    expect(payment.status).toBe("CAPTURED");
    expect(await db.refund.count()).toBe(0);
    const day = await db.slotDay.findFirstOrThrow({ where: { messId: fx.messId } });
    expect(day.booked).toBe(1);
  }, 240000);
});
