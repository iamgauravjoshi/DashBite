import { Suspense } from "react";
import { redirect } from "next/navigation";
import { SignUpForm } from "@/components/auth/SignUpForm";
import { LoadingBlock } from "@/components/data/StateBlock";
import { getSessionUser } from "@/lib/auth-guards";
import { homeForRole } from "@/lib/auth-guards";

export const metadata = { title: "Create account" };

export default async function SignUpPage() {
  const user = await getSessionUser();
  if (user && user.emailVerified && user.status === "ACTIVE" && !user.banned) {
    redirect(homeForRole(user.role));
  }
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center px-4 py-12">
      <Suspense fallback={<LoadingBlock label="Loading sign-up…" />}>
        <SignUpForm />
      </Suspense>
    </div>
  );
}
