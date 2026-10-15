import { execSync } from "node:child_process";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

const DEV_URL = "postgresql://smartmess:smartmess_dev_pw@localhost:5432/smartmess?schema=public";
const TEST_DB = "smartmess_test_menu";
const TEST_URL = `postgresql://smartmess:smartmess_dev_pw@localhost:5432/${TEST_DB}?schema=public`;

let db!: import("@prisma/client").PrismaClient;
let auth!: (typeof import("@/lib/auth"))["auth"];
let devMailbox!: (typeof import("@/lib/auth"))["devMailbox"];
let clearDevMailbox!: (typeof import("@/lib/auth"))["clearDevMailbox"];
let authHandler!: typeof import("@/app/api/auth/[...all]/route");
let slotsRoute!: typeof import("@/app/api/messes/[id]/slots/route");

function jsonRequest(path: string, body: unknown, cookie?: string, method = "POST") {
  return new Request(`http://localhost${path}`, {
    method,
    headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
}

async function cleanDb() {
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
  const signUp = await import("@/app/api/auth/sign-up/route");
  const res = await signUp.POST(
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
  name: "Capacity Kitchen",
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
  operatingDays: ["MON", "TUE", "WED", "THU", "FRI", "SAT"],
  opensAt: "07:00",
  closesAt: "21:00"
};

async function setupKitchen() {
  const cookie = await cookieFor("owner@example.com", "MESS_OWNER");
  const messes = await import("@/app/api/messes/route");
  const created = (await (await messes.POST(jsonRequest("/api/messes", MESS, cookie))).json()) as {
    mess: { id: string };
  };
  const messId = created.mess.id;
  // Monday 2026-10-26 lunch; slot + items + weekly template.
  const slot = (await (
    await slotsRoute.POST(
      jsonRequest(
        `/api/messes/${messId}/slots`,
        { name: "Lunch", cutoffTime: "09:30", sortOrder: 1 },
        cookie
      ),
      { params: Promise.resolve({ id: messId }) }
    )
  ).json()) as { slot: { id: string } };
  const slotId = slot.slot.id;
  const itemsApi = await import("@/app/api/messes/[id]/items/route");
  const itemA = (await (
    await itemsApi.POST(
      jsonRequest(
        `/api/messes/${messId}/items`,
        { name: "Dal Khichdi", pricePaise: 9000, vegType: "VEG" },
        cookie
      ),
      { params: Promise.resolve({ id: messId }) }
    )
  ).json()) as { item: { id: string } };
  const itemB = (await (
    await itemsApi.POST(
      jsonRequest(
        `/api/messes/${messId}/items`,
        { name: "Chicken Curry", pricePaise: 14000, vegType: "NON_VEG" },
        cookie
      ),
      { params: Promise.resolve({ id: messId }) }
    )
  ).json()) as { item: { id: string } };
  const weeklyApi = await import("@/app/api/messes/[id]/weekly/route");
  const weekly = (await (
    await weeklyApi.POST(
      jsonRequest(`/api/messes/${messId}/weekly`, { slotId, dayOfWeek: 1, capacity: 10 }, cookie),
      { params: Promise.resolve({ id: messId }) }
    )
  ).json()) as { weekly: { id: string } };
  const weeklyItemsApi = await import("@/app/api/messes/[id]/weekly/[weeklyId]/route");
  await weeklyItemsApi.POST(
    jsonRequest(
      `/api/messes/${messId}/weekly/${weekly.weekly.id}`,
      { itemId: itemA.item.id },
      cookie
    ),
    { params: Promise.resolve({ id: messId, weeklyId: weekly.weekly.id }) }
  );
  await weeklyItemsApi.POST(
    jsonRequest(
      `/api/messes/${messId}/weekly/${weekly.weekly.id}`,
      { itemId: itemB.item.id },
      cookie
    ),
    { params: Promise.resolve({ id: messId, weeklyId: weekly.weekly.id }) }
  );
  return {
    cookie,
    messId,
    slotId,
    itemA: itemA.item.id,
    itemB: itemB.item.id,
    weeklyId: weekly.weekly.id
  };
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
  slotsRoute = await import("@/app/api/messes/[id]/slots/route");
}, 180000);

beforeEach(async () => {
  await cleanDb();
  clearDevMailbox();
});

describe("menu resolution", () => {
  it("serves weekly menus, honors holidays and date overrides", async () => {
    const { cookie, messId, slotId, itemA } = await setupKitchen();
    const { getMenuForDate } = await import("@/lib/menus");
    const datesApi = await import("@/app/api/messes/[id]/dates/route");
    const monday = "2026-10-26";
    const tuesday = "2026-10-27";

    const weekly = await getMenuForDate(messId, monday, slotId, {
      now: new Date("2026-10-25T00:00:00Z")
    });
    expect(weekly?.status).toBe("open");
    expect(weekly?.items.map((i) => i.name).sort()).toEqual(["Chicken Curry", "Dal Khichdi"]);
    expect(weekly?.items.find((i) => i.name === "Dal Khichdi")?.pricePaise).toBe(9000);
    expect(weekly?.capacity).toBe(10);
    expect(weekly?.orderable).toBe(true);

    const noMenu = await getMenuForDate(messId, tuesday, slotId, {
      now: new Date("2026-10-25T00:00:00Z")
    });
    expect(noMenu?.status).toBe("closed");
    expect(noMenu?.closedReason).toBe("NO_MENU");

    await db.holiday.create({
      data: { messId, date: new Date("2026-10-26T00:00:00.000Z"), reason: "Diwali" }
    });
    const holidayMenu = await getMenuForDate(messId, monday, slotId, {
      now: new Date("2026-10-25T00:00:00Z")
    });
    expect(holidayMenu?.status).toBe("closed");
    expect(holidayMenu?.closedReason).toBe("HOLIDAY");
    await db.holiday.deleteMany({ where: { messId } });

    // Date override: close the day, then reopen with a single custom-priced item.
    const closeRes = await datesApi.POST(
      jsonRequest(`/api/messes/${messId}/dates`, { slotId, date: monday, closed: true }, cookie),
      { params: Promise.resolve({ id: messId }) }
    );
    expect(closeRes.status).toBe(201);
    const closedMenu = await getMenuForDate(messId, monday, slotId, {
      now: new Date("2026-10-25T00:00:00Z")
    });
    expect(closedMenu?.status).toBe("closed");
    expect(closedMenu?.closedReason).toBe("DATE_CLOSED");

    const customRes = await datesApi.POST(
      jsonRequest(
        `/api/messes/${messId}/dates`,
        {
          slotId,
          date: monday,
          closed: false,
          capacity: 5,
          items: [{ itemId: itemA, pricePaise: 7500 }]
        },
        cookie
      ),
      { params: Promise.resolve({ id: messId }) }
    );
    expect(customRes.status).toBe(201);
    const custom = await getMenuForDate(messId, monday, slotId, {
      now: new Date("2026-10-25T00:00:00Z")
    });
    expect(custom?.status).toBe("open");
    expect(custom?.items.map((i) => i.name)).toEqual(["Dal Khichdi"]);
    expect(custom?.items[0]?.pricePaise).toBe(7500);
    expect(custom?.capacity).toBe(5);
  }, 180000);
});

describe("change isolation (BR-14)", () => {
  it("freezes date-menu snapshots against catalog and template edits", async () => {
    const { cookie, messId, slotId, itemA, weeklyId } = await setupKitchen();
    const { getMenuForDate } = await import("@/lib/menus");
    const datesApi = await import("@/app/api/messes/[id]/dates/route");
    const itemsApi = await import("@/app/api/messes/[id]/items/[itemId]/route");
    const weeklyItemsApi =
      await import("@/app/api/messes/[id]/weekly/[weeklyId]/items/[linkId]/route");
    const monday = "2026-11-02";

    // Snapshot Monday from the weekly template.
    const snap = await datesApi.POST(
      jsonRequest(
        `/api/messes/${messId}/dates`,
        {
          slotId,
          date: monday,
          closed: false,
          capacity: 10,
          items: [{ itemId: itemA, pricePaise: 9000 }]
        },
        cookie
      ),
      { params: Promise.resolve({ id: messId }) }
    );
    expect(snap.status).toBe(201);

    // Catalog price change must not move the snapshot.
    const edit = await itemsApi.PATCH(
      jsonRequest(`/api/messes/${messId}/items/${itemA}`, { pricePaise: 12000 }, cookie, "PATCH"),
      { params: Promise.resolve({ id: messId, itemId: itemA }) }
    );
    expect(edit.status).toBe(200);
    const afterCatalog = await getMenuForDate(messId, monday, slotId, {
      now: new Date("2026-11-01T00:00:00Z")
    });
    expect(afterCatalog?.items[0]?.pricePaise).toBe(9000);

    // Weekly template change must not move the snapshot either.
    const links = await db.weeklyMenuItem.findMany({ where: { weeklyMenuId: weeklyId } });
    const link = links.find((l) => l.itemId === itemA);
    if (!link) throw new Error("weekly link missing");
    await weeklyItemsApi.PATCH(
      jsonRequest(
        `/api/messes/${messId}/weekly/${weeklyId}/items/${link.id}`,
        { pricePaise: 5000 },
        cookie,
        "PATCH"
      ),
      { params: Promise.resolve({ id: messId, weeklyId, linkId: link.id }) }
    );
    const afterTemplate = await getMenuForDate(messId, monday, slotId, {
      now: new Date("2026-11-01T00:00:00Z")
    });
    expect(afterTemplate?.items[0]?.pricePaise).toBe(9000);

    // Deactivating the catalog item hides it from display, row intact.
    await itemsApi.PATCH(
      jsonRequest(`/api/messes/${messId}/items/${itemA}`, { active: false }, cookie, "PATCH"),
      {
        params: Promise.resolve({ id: messId, itemId: itemA })
      }
    );
    const hidden = await getMenuForDate(messId, monday, slotId, {
      now: new Date("2026-11-01T00:00:00Z")
    });
    expect(hidden?.status).toBe("closed");
    expect(await db.dateMenuItem.count({ where: { dateMenu: { messId } } })).toBe(1);
  }, 180000);
});

describe("capacity ledger (BR-07)", () => {
  it("never oversells under concurrency and floors edits at booked", async () => {
    const { messId, slotId } = await setupKitchen();
    const { ensureSlotDay, tryReserve, releaseReservation, syncSlotDayCapacity } =
      await import("@/lib/capacity");
    const monday = "2026-10-26";

    const day = await ensureSlotDay(messId, slotId, monday);
    expect(day).toMatchObject({ capacity: 10, booked: 0, left: 10 });
    expect(await ensureSlotDay(messId, slotId, "2026-10-27")).toBeNull();

    const results = await Promise.all(
      Array.from({ length: 20 }, () => tryReserve(messId, slotId, monday, 1))
    );
    expect(results.filter((r) => r.ok).length).toBe(10);
    expect(results.filter((r) => !r.ok).length).toBe(10);
    const booked = await db.slotDay.findUniqueOrThrow({
      where: { messId_slotId_date: { messId, slotId, date: new Date("2026-10-26T00:00:00.000Z") } }
    });
    expect(booked.booked).toBe(10);

    await releaseReservation(messId, slotId, monday, 3);
    const after = await db.slotDay.findUniqueOrThrow({
      where: { messId_slotId_date: { messId, slotId, date: new Date("2026-10-26T00:00:00.000Z") } }
    });
    expect(after.booked).toBe(7);

    // Lowering capacity below booked floors at booked instead of stranding.
    await syncSlotDayCapacity(messId, slotId, monday, 5);
    const floored = await db.slotDay.findUniqueOrThrow({
      where: { messId_slotId_date: { messId, slotId, date: new Date("2026-10-26T00:00:00.000Z") } }
    });
    expect(floored.capacity).toBe(7);
    await syncSlotDayCapacity(messId, slotId, monday, 12);
    const raised = await db.slotDay.findUniqueOrThrow({
      where: { messId_slotId_date: { messId, slotId, date: new Date("2026-10-26T00:00:00.000Z") } }
    });
    expect(raised.capacity).toBe(12);
  }, 180000);

  it("closes ordering at the cutoff while keeping the menu viewable", async () => {
    const { messId, slotId } = await setupKitchen();
    const { getMenuForDate } = await import("@/lib/menus");
    const monday = "2026-10-26";
    // 09:29 IST == 03:59 UTC; 09:30 IST == 04:00 UTC.
    const before = await getMenuForDate(messId, monday, slotId, {
      now: new Date("2026-10-26T03:59:00Z")
    });
    expect(before?.status).toBe("open");
    expect(before?.orderable).toBe(true);
    const atCutoff = await getMenuForDate(messId, monday, slotId, {
      now: new Date("2026-10-26T04:00:00Z")
    });
    expect(atCutoff?.status).toBe("open");
    expect(atCutoff?.orderable).toBe(false);
    const future = await getMenuForDate(messId, "2026-11-02", slotId, {
      now: new Date("2026-10-26T04:00:00Z")
    });
    expect(future?.status).toBe("open");
    expect(future?.orderable).toBe(true);
    const past = await getMenuForDate(messId, monday, slotId, {
      now: new Date("2026-10-27T00:00:00Z")
    });
    expect(past?.orderable).toBe(false);
  }, 180000);
});

describe("menu API isolation", () => {
  it("blocks staff writes and cross-owner access", async () => {
    const { cookie, messId, slotId } = await setupKitchen();
    void cookie;
    const staffCookie = await cookieFor("staff@example.com", "MESS_STAFF");
    const otherCookie = await cookieFor("other@example.com", "MESS_OWNER");

    const staffWrite = await slotsRoute.POST(
      jsonRequest(
        `/api/messes/${messId}/slots`,
        { name: "Snack", cutoffTime: "17:00" },
        staffCookie
      ),
      { params: Promise.resolve({ id: messId }) }
    );
    expect(staffWrite.status).toBe(403);
    const staffRead = await slotsRoute.GET(
      new Request(`http://localhost/api/messes/${messId}/slots`, {
        headers: { cookie: staffCookie }
      }),
      { params: Promise.resolve({ id: messId }) }
    );
    expect(staffRead.status).toBe(403);

    const foreign = await slotsRoute.GET(
      new Request(`http://localhost/api/messes/${messId}/slots`, {
        headers: { cookie: otherCookie }
      }),
      { params: Promise.resolve({ id: messId }) }
    );
    expect(foreign.status).toBe(404);
    void slotId;
  }, 180000);

  it("manages holidays with validation", async () => {
    const { cookie, messId } = await setupKitchen();
    const holidaysApi = await import("@/app/api/messes/[id]/holidays/route");
    const monday = "2026-12-28";
    const created = await holidaysApi.POST(
      jsonRequest(`/api/messes/${messId}/holidays`, { date: monday, reason: "Year end" }, cookie),
      { params: Promise.resolve({ id: messId }) }
    );
    expect(created.status).toBe(201);
    const dup = await holidaysApi.POST(
      jsonRequest(`/api/messes/${messId}/holidays`, { date: monday }, cookie),
      { params: Promise.resolve({ id: messId }) }
    );
    expect(dup.status).toBe(409);
    const past = await holidaysApi.POST(
      jsonRequest(`/api/messes/${messId}/holidays`, { date: "2020-01-01" }, cookie),
      { params: Promise.resolve({ id: messId }) }
    );
    expect(past.status).toBe(400);
    const listed = (await (
      await holidaysApi.GET(
        new Request(`http://localhost/api/messes/${messId}/holidays`, { headers: { cookie } }),
        { params: Promise.resolve({ id: messId }) }
      )
    ).json()) as { holidays: Array<{ id: string }> };
    expect(listed.holidays.length).toBe(1);
    const removed = await holidaysApi.DELETE(
      new Request(
        `http://localhost/api/messes/${messId}/holidays?holidayId=${listed.holidays[0].id}`,
        {
          headers: { cookie }
        }
      ),
      { params: Promise.resolve({ id: messId }) }
    );
    expect(removed.status).toBe(200);
  }, 180000);
});
