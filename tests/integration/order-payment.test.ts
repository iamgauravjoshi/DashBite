import { execSync } from "node:child_process";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

const DEV_URL = "postgresql://smartmess:smartmess_dev_pw@localhost:5432/smartmess?schema=public";
const TEST_DB = "smartmess_test_orders";
const TEST_URL = `postgresql://smartmess:smartmess_dev_pw@localhost:5432/${TEST_DB}?schema=public`;

let db!: import("@prisma/client").PrismaClient;
let auth!: (typeof import("@/lib/auth"))["auth"];
let devMailbox!: (typeof import("@/lib/auth"))["devMailbox"];
let clearDevMailbox!: (typeof import("@/lib/auth"))["clearDevMailbox"];
let authHandler!: typeof import("@/app/api/auth/[...all]/route");
let signUpRoute!: typeof import("@/app/api/auth/sign-up/route");
let previewRoute!: typeof import("@/app/api/orders/preview/route");
let ordersRoute!: typeof import("@/app/api/orders/route");
let orderByIdRoute!: typeof import("@/app/api/orders/[id]/route");
let cancelRoute!: typeof import("@/app/api/orders/[id]/cancel/route");
let mockPayRoute!: typeof import("@/app/api/payments/mock/route");
let messOrdersRoute!: typeof import("@/app/api/messes/[id]/orders/route");
let ownerCancelRoute!: typeof import("@/app/api/messes/[id]/orders/[orderId]/cancel/route");

function jsonRequest(path: string, body: unknown, cookie?: string, method = "POST") {
  return new Request(`http://localhost${path}`, {
    method,
    headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
}

async function cleanDb() {
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
  name: "Order Kitchen",
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

async function liveKitchen(
  ownerCookie: string,
  adminCookie: string,
  overrides: Record<string, unknown> = {}
) {
  const messesApi = await import("@/app/api/messes/route");
  const submitApi = await import("@/app/api/messes/[id]/submit/route");
  const decisionApi = await import("@/app/api/admin/messes/[id]/decision/route");
  const publishApi = await import("@/app/api/messes/[id]/publish/route");
  const created = (await (
    await messesApi.POST(jsonRequest("/api/messes", { ...MESS, ...overrides }, ownerCookie))
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
  // Weekday 1..5 set below by tests via direct insert; create Monday template here.
  const weekly = (await (
    await weeklyApi.POST(
      jsonRequest(
        `/api/messes/${messId}/weekly`,
        { slotId: slot.slot.id, dayOfWeek: 1, capacity: 10 },
        ownerCookie
      ),
      { params: Promise.resolve({ id: messId }) }
    )
  ).json()) as { weekly: { id: string } };
  const weeklyItemsApi = await import("@/app/api/messes/[id]/weekly/[weeklyId]/route");
  await weeklyItemsApi.POST(
    jsonRequest(
      `/api/messes/${messId}/weekly/${weekly.weekly.id}`,
      { itemId: item.item.id },
      ownerCookie
    ),
    { params: Promise.resolve({ id: messId, weeklyId: weekly.weekly.id }) }
  );
  return { messId, slotId: slot.slot.id, itemId: item.item.id };
}

const MONDAY = "2026-10-26";

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
  previewRoute = await import("@/app/api/orders/preview/route");
  ordersRoute = await import("@/app/api/orders/route");
  orderByIdRoute = await import("@/app/api/orders/[id]/route");
  cancelRoute = await import("@/app/api/orders/[id]/cancel/route");
  mockPayRoute = await import("@/app/api/payments/mock/route");
  messOrdersRoute = await import("@/app/api/messes/[id]/orders/route");
  ownerCancelRoute = await import("@/app/api/messes/[id]/orders/[orderId]/cancel/route");
}, 180000);

beforeEach(async () => {
  await cleanDb();
  clearDevMailbox();
});

describe("quote and validation", () => {
  it("prices lines, adds delivery fee, and rejects bad carts", async () => {
    const owner = await cookieFor("owner@example.com", "MESS_OWNER");
    const admin = await cookieFor("admin@example.com", "PLATFORM_ADMIN");
    const customer = await cookieFor("cust@example.com");
    const { messId, slotId, itemId } = await liveKitchen(owner, admin);

    const preview = await previewRoute.POST(
      jsonRequest(
        "/api/orders/preview",
        {
          messId,
          slotId,
          serviceDate: MONDAY,
          items: [{ itemId, qty: 2 }],
          fulfillment: "PICKUP"
        },
        customer
      )
    );
    expect(preview.status).toBe(200);
    const quote = (
      (await preview.json()) as {
        quote: {
          itemTotalPaise: number;
          payablePaise: number;
          deliveryFeePaise: number;
          orderable: boolean;
        };
      }
    ).quote;
    expect(quote.itemTotalPaise).toBe(18000);
    expect(quote.deliveryFeePaise).toBe(0);
    expect(quote.payablePaise).toBe(18000);
    expect(quote.orderable).toBe(true);

    const unknown = await previewRoute.POST(
      jsonRequest(
        "/api/orders/preview",
        {
          messId,
          slotId,
          serviceDate: MONDAY,
          items: [{ itemId: "nope", qty: 1 }],
          fulfillment: "PICKUP"
        },
        customer
      )
    );
    expect(unknown.status).toBe(409);

    const noAddress = await previewRoute.POST(
      jsonRequest(
        "/api/orders/preview",
        {
          messId,
          slotId,
          serviceDate: MONDAY,
          items: [{ itemId, qty: 1 }],
          fulfillment: "DELIVERY"
        },
        customer
      )
    );
    expect(noAddress.status).toBe(409);

    const past = await previewRoute.POST(
      jsonRequest(
        "/api/orders/preview",
        {
          messId,
          slotId,
          serviceDate: "2020-01-01",
          items: [{ itemId, qty: 1 }],
          fulfillment: "PICKUP"
        },
        customer
      )
    );
    expect(past.status).toBe(409);
  }, 180000);
});

describe("happy path and duplicates", () => {
  it("confirms on payment, ignores duplicate notifications", async () => {
    const owner = await cookieFor("owner@example.com", "MESS_OWNER");
    const admin = await cookieFor("admin@example.com", "PLATFORM_ADMIN");
    const customer = await cookieFor("cust@example.com");
    const { messId, slotId, itemId } = await liveKitchen(owner, admin);

    const created = (await (
      await ordersRoute.POST(
        jsonRequest(
          "/api/orders",
          {
            messId,
            slotId,
            serviceDate: MONDAY,
            items: [{ itemId, qty: 2 }],
            fulfillment: "PICKUP"
          },
          customer
        )
      )
    ).json()) as { orderId: string; provider: string; payablePaise: number };
    expect(created.provider).toBe("MOCK");
    expect(created.payablePaise).toBe(18000);

    const first = await mockPayRoute.POST(
      jsonRequest("/api/payments/mock", { orderId: created.orderId, action: "capture" }, customer)
    );
    expect(first.status).toBe(200);
    expect(((await first.json()) as { outcome: string }).outcome).toBe("CONFIRMED");

    const order = await db.order.findUniqueOrThrow({ where: { id: created.orderId } });
    expect(order.status).toBe("CONFIRMED");
    const payment = await db.payment.findFirstOrThrow({ where: { orderId: created.orderId } });
    expect(payment.status).toBe("CAPTURED");
    expect(payment.providerPaymentId).toBeTruthy();

    // Duplicate notification: same deterministic event id → no double effect.
    const again = await mockPayRoute.POST(
      jsonRequest("/api/payments/mock", { orderId: created.orderId, action: "capture" }, customer)
    );
    expect(((await again.json()) as { outcome: string }).outcome).toBe("DUPLICATE");
    const day = await db.slotDay.findFirstOrThrow({ where: { messId, slotId } });
    expect(day.booked).toBe(2);

    // Owner queue and customer detail agree.
    const queue = (await (
      await messOrdersRoute.GET(
        new Request(`http://localhost/api/messes/${messId}/orders`, { headers: { cookie: owner } }),
        { params: Promise.resolve({ id: messId }) }
      )
    ).json()) as { orders: Array<{ id: string; status: string; payablePaise: number }> };
    expect(queue.orders.some((o) => o.id === created.orderId && o.status === "CONFIRMED")).toBe(
      true
    );
    const detail = await orderByIdRoute.GET(
      new Request(`http://localhost/api/orders/${created.orderId}`, {
        headers: { cookie: customer }
      }),
      { params: Promise.resolve({ id: created.orderId }) }
    );
    expect(detail.status).toBe(200);
  }, 180000);

  it("fails cleanly on payment failure and expires unpaid orders", async () => {
    const owner = await cookieFor("owner@example.com", "MESS_OWNER");
    const admin = await cookieFor("admin@example.com", "PLATFORM_ADMIN");
    const customer = await cookieFor("cust@example.com");
    const { messId, slotId, itemId } = await liveKitchen(owner, admin);

    const created = (await (
      await ordersRoute.POST(
        jsonRequest(
          "/api/orders",
          {
            messId,
            slotId,
            serviceDate: MONDAY,
            items: [{ itemId, qty: 1 }],
            fulfillment: "PICKUP"
          },
          customer
        )
      )
    ).json()) as { orderId: string };
    const failed = await mockPayRoute.POST(
      jsonRequest("/api/payments/mock", { orderId: created.orderId, action: "fail" }, customer)
    );
    expect(((await failed.json()) as { outcome: string }).outcome).toBe("FAILED");
    const order = await db.order.findUniqueOrThrow({ where: { id: created.orderId } });
    expect(order.status).toBe("PENDING_PAYMENT");
    const day = await db.slotDay.findFirst({ where: { messId, slotId } });
    expect(day?.booked ?? 0).toBe(0);

    await db.order.update({
      where: { id: created.orderId },
      data: { expiresAt: new Date("2020-01-01T00:00:00Z") }
    });
    const { expirePendingOrders } = await import("@/lib/payments");
    expect(await expirePendingOrders(new Date("2020-01-02T00:00:00Z"))).toBe(1);
    const expired = await db.order.findUniqueOrThrow({ where: { id: created.orderId } });
    expect(expired.status).toBe("CANCELLED");
    expect(expired.cancelReason).toBe("PAYMENT_EXPIRED");
  }, 180000);
});

describe("concurrent purchases share one capacity pool", () => {
  it("confirms exactly capacity and refunds the rest (BR-07)", async () => {
    const owner = await cookieFor("owner@example.com", "MESS_OWNER");
    const admin = await cookieFor("admin@example.com", "PLATFORM_ADMIN");
    const { messId, slotId, itemId } = await liveKitchen(owner, admin);
    // Shrink Monday capacity to 5 through a date override.
    const datesApi = await import("@/app/api/messes/[id]/dates/route");
    await datesApi.POST(
      jsonRequest(
        `/api/messes/${messId}/dates`,
        { slotId, date: MONDAY, capacity: 5, items: [{ itemId, pricePaise: 9000 }] },
        owner
      ),
      { params: Promise.resolve({ id: messId }) }
    );
    const buyers = await Promise.all(
      Array.from({ length: 8 }, (_, i) => cookieFor(`buyer${i}@example.com`))
    );
    const results = await Promise.all(
      buyers.map(async (cookie) => {
        const created = (await (
          await ordersRoute.POST(
            jsonRequest(
              "/api/orders",
              {
                messId,
                slotId,
                serviceDate: MONDAY,
                items: [{ itemId, qty: 1 }],
                fulfillment: "PICKUP"
              },
              cookie
            )
          )
        ).json()) as { orderId: string };
        const settled = (await (
          await mockPayRoute.POST(
            jsonRequest(
              "/api/payments/mock",
              { orderId: created.orderId, action: "capture" },
              cookie
            )
          )
        ).json()) as { outcome: string };
        return settled.outcome;
      })
    );
    expect(results.filter((o) => o === "CONFIRMED").length).toBe(5);
    expect(results.filter((o) => o === "SOLD_OUT").length).toBe(3);
    const day = await db.slotDay.findFirstOrThrow({ where: { messId, slotId } });
    expect(day.booked).toBe(5);
    // Money reconciles: captured == 5 meals, refunded == 3 meals.
    const captured = await db.payment.aggregate({
      where: { order: { messId }, status: "CAPTURED" },
      _sum: { amountPaise: true }
    });
    const refunded = await db.refund.aggregate({ _sum: { amountPaise: true } });
    expect(captured._sum.amountPaise).toBe(5 * 9000);
    expect(refunded._sum.amountPaise).toBe(3 * 9000);
    const refunds = await db.refund.findMany();
    expect(refunds.every((r) => r.status === "COMPLETED" && r.reason === "SOLD_OUT")).toBe(true);
  }, 240000);
});

describe("cancellation and isolation", () => {
  it("refunds future confirmed orders and blocks post-cutoff ones", async () => {
    const owner = await cookieFor("owner@example.com", "MESS_OWNER");
    const admin = await cookieFor("admin@example.com", "PLATFORM_ADMIN");
    const customer = await cookieFor("cust@example.com");
    const { messId, slotId, itemId } = await liveKitchen(owner, admin);

    const created = (await (
      await ordersRoute.POST(
        jsonRequest(
          "/api/orders",
          {
            messId,
            slotId,
            serviceDate: MONDAY,
            items: [{ itemId, qty: 2 }],
            fulfillment: "PICKUP"
          },
          customer
        )
      )
    ).json()) as { orderId: string };
    await mockPayRoute.POST(
      jsonRequest("/api/payments/mock", { orderId: created.orderId, action: "capture" }, customer)
    );
    const cancelled = await cancelRoute.POST(
      jsonRequest(`/api/orders/${created.orderId}/cancel`, {}, customer),
      { params: Promise.resolve({ id: created.orderId }) }
    );
    expect(cancelled.status).toBe(200);
    expect(((await cancelled.json()) as { refunded: boolean }).refunded).toBe(true);
    const day = await db.slotDay.findFirstOrThrow({ where: { messId, slotId } });
    expect(day.booked).toBe(0);
    const refund = await db.refund.findFirstOrThrow({
      where: { payment: { orderId: created.orderId } }
    });
    expect(refund.reason).toBe("CUSTOMER_CANCEL");

    // Simulate the service day arriving with a passed cutoff.
    const created2 = (await (
      await ordersRoute.POST(
        jsonRequest(
          "/api/orders",
          {
            messId,
            slotId,
            serviceDate: MONDAY,
            items: [{ itemId, qty: 1 }],
            fulfillment: "PICKUP"
          },
          customer
        )
      )
    ).json()) as { orderId: string };
    await mockPayRoute.POST(
      jsonRequest("/api/payments/mock", { orderId: created2.orderId, action: "capture" }, customer)
    );
    const today = new Date().toISOString().slice(0, 10);
    await db.order.update({
      where: { id: created2.orderId },
      data: { serviceDate: new Date(`${today}T00:00:00.000Z`) }
    });
    await db.menuSlot.update({ where: { id: slotId }, data: { cutoffTime: "00:00" } });
    const late = await cancelRoute.POST(
      jsonRequest(`/api/orders/${created2.orderId}/cancel`, {}, customer),
      { params: Promise.resolve({ id: created2.orderId }) }
    );
    expect(late.status).toBe(409);
  }, 240000);

  it("lets owners cancel with reason and isolates strangers", async () => {
    const owner = await cookieFor("owner@example.com", "MESS_OWNER");
    const otherOwner = await cookieFor("other@example.com", "MESS_OWNER");
    const admin = await cookieFor("admin@example.com", "PLATFORM_ADMIN");
    const customer = await cookieFor("cust@example.com");
    const stranger = await cookieFor("stranger@example.com");
    const { messId, slotId, itemId } = await liveKitchen(owner, admin);

    const created = (await (
      await ordersRoute.POST(
        jsonRequest(
          "/api/orders",
          {
            messId,
            slotId,
            serviceDate: MONDAY,
            items: [{ itemId, qty: 1 }],
            fulfillment: "PICKUP"
          },
          customer
        )
      )
    ).json()) as { orderId: string };
    await mockPayRoute.POST(
      jsonRequest("/api/payments/mock", { orderId: created.orderId, action: "capture" }, customer)
    );

    const noReason = await ownerCancelRoute.POST(
      jsonRequest(`/api/messes/${messId}/orders/${created.orderId}/cancel`, {}, owner),
      { params: Promise.resolve({ id: messId, orderId: created.orderId }) }
    );
    expect(noReason.status).toBe(400);
    const foreign = await ownerCancelRoute.POST(
      jsonRequest(
        `/api/messes/${messId}/orders/${created.orderId}/cancel`,
        { reason: "Nope" },
        otherOwner
      ),
      { params: Promise.resolve({ id: messId, orderId: created.orderId }) }
    );
    expect(foreign.status).toBe(404);
    const done = await ownerCancelRoute.POST(
      jsonRequest(
        `/api/messes/${messId}/orders/${created.orderId}/cancel`,
        { reason: "Kitchen fire" },
        owner
      ),
      { params: Promise.resolve({ id: messId, orderId: created.orderId }) }
    );
    expect(done.status).toBe(200);

    const peek = await orderByIdRoute.GET(
      new Request(`http://localhost/api/orders/${created.orderId}`, {
        headers: { cookie: stranger }
      }),
      { params: Promise.resolve({ id: created.orderId }) }
    );
    expect(peek.status).toBe(404);
    const steal = await cancelRoute.POST(
      jsonRequest(`/api/orders/${created.orderId}/cancel`, {}, stranger),
      { params: Promise.resolve({ id: created.orderId }) }
    );
    expect(steal.status).toBe(404);
  }, 240000);
});
