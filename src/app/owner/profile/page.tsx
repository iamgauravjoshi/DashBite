import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/auth/ProfileForm";
import { PageHeader } from "@/components/data/PageHeader";
import { requireUsableAccount } from "@/lib/auth-guards";

export const metadata = { title: "Profile" };

export default async function OwnerProfilePage() {
  const user = await requireUsableAccount("/owner/profile");
  if (user.role !== "MESS_OWNER" && user.role !== "MESS_STAFF") redirect("/forbidden");
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Owner · Profile"
        title="Profile"
        description="Your name and contact details."
      />
      <ProfileForm initial={user} />
    </div>
  );
}
