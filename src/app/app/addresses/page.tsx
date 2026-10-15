import { AddressesManager } from "@/components/auth/AddressesManager";
import { requirePageAccess } from "@/lib/auth-guards";

export const metadata = { title: "Addresses" };

export default async function CustomerAddressesPage() {
  await requirePageAccess("/app/addresses");
  return <AddressesManager />;
}
