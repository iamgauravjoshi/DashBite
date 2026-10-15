import { Suspense } from "react";
import { redirect } from "next/navigation";
import { SignInForm } from "@/components/auth/SignInForm";
import { LoadingBlock } from "@/components/data/StateBlock";
import { getSessionUser, homeForRole } from "@/lib/auth-guards";

export const metadata = { title: "Sign in" };

export default async function SignInPage() {
  const user = await getSessionUser();
  if (user && user.emailVerified && user.status === "ACTIVE" && !user.banned) {
    redirect(homeForRole(user.role));
  }
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center px-4 py-12">
      <Suspense fallback={<LoadingBlock label="Loading sign-in…" />}>
        <SignInForm />
      </Suspense>
    </div>
  );
}
