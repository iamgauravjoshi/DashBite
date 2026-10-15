import { ProfileForm } from "@/components/auth/ProfileForm";
import { PageHeader } from "@/components/data/PageHeader";
import { requirePageAccess } from "@/lib/auth-guards";

export const metadata = { title: "Profile" };

export default async function CustomerProfilePage() {
  const user = await requirePageAccess("/app/profile");
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Customer · Profile"
        title="Profile"
        description="Your name and contact details."
      />
      <ProfileForm initial={user} />
    </div>
  );
}
