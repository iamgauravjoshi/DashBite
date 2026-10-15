import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin } from "better-auth/plugins";
import { APIError } from "better-auth/api";
import { db } from "@/lib/db";
import { authRoles } from "@/lib/permissions";
import { isSignupRole } from "@/lib/roles";

/**
 * Dev-only email delivery. Production MUST configure real delivery (SMTP provider)
 * before pilot — see docs/operations.md. Throwing in production prevents silent drops.
 *
 * In non-production, sent mail is also appended to an in-memory outbox
 * (`devMailbox()`) so integration tests can complete verification/reset flows
 * without an SMTP server.
 */
export interface DevEmail {
  to: string;
  subject: string;
  text: string;
}

const mailboxKey = "__SMARTMESS_DEV_MAILBOX__";

export function devMailbox(): DevEmail[] {
  const store = globalThis as unknown as Record<string, DevEmail[] | undefined>;
  store[mailboxKey] ??= [];
  return store[mailboxKey] as DevEmail[];
}

export function clearDevMailbox(): void {
  devMailbox().length = 0;
}

async function sendDevEmail({ to, subject, text }: DevEmail) {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Email delivery is not configured. Set up the production mail provider before enabling verification/reset emails."
    );
  }
  devMailbox().push({ to, subject, text });
  console.log(`[DEV-ONLY EMAIL] to=${to} subject=${subject}\n${text}`);
}

const baseURL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

export const auth = betterAuth({
  baseURL,
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: [baseURL],
  database: prismaAdapter(db, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendDevEmail({
        to: user.email,
        subject: "Reset your SmartMess password",
        text: `Reset your password: ${url}\nThis link expires. If you did not request it, ignore this message.`
      });
    }
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendDevEmail({
        to: user.email,
        subject: "Verify your SmartMess email",
        text: `Verify your email: ${url}\nIf you did not create this account, ignore this message.`
      });
    }
  },
  user: {
    additionalFields: {
      status: { type: "string", required: false, defaultValue: "UNVERIFIED", input: false },
      phone: { type: "string", required: false }
    }
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const role = (user as { role?: string }).role ?? "CUSTOMER";
          if (role === "PLATFORM_ADMIN") {
            // Bootstrap exception: the very first admin is created via
            // `npx auth create-admin`. Later admins are managed in-console (Phase 10),
            // which will need admin-context awareness in this hook.
            const existing = await db.user.count({ where: { role: "PLATFORM_ADMIN" } });
            if (existing === 0) {
              return { data: { ...user, role, status: "ACTIVE" } };
            }
          }
          if (!isSignupRole(role)) {
            throw new APIError("FORBIDDEN", {
              message:
                role === "MESS_STAFF"
                  ? "Staff accounts are created by mess owners. Ask your owner for an invite."
                  : "This role cannot self-register."
            });
          }
          return { data: { ...user, role, status: "UNVERIFIED" } };
        }
      },
      update: {
        // Email verification flips emailVerified via this path — activate alongside.
        before: async (userData) => {
          if ((userData as { emailVerified?: boolean }).emailVerified === true) {
            return { data: { ...userData, status: "ACTIVE" } };
          }
        }
      }
    }
  },
  plugins: [
    admin({
      defaultRole: "CUSTOMER",
      adminRoles: ["PLATFORM_ADMIN"],
      roles: authRoles
    })
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24
  },
  // Rate limiting stays enabled in every real environment. Tests perform dozens
  // of auth calls in seconds and assert error codes, so it is off under test.
  rateLimit: { enabled: process.env.NODE_ENV !== "test" }
});

export type Session = typeof auth.$Infer.Session;
