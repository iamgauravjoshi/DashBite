import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center px-4 py-12">
      <ForgotPasswordForm />
    </div>
  );
}
