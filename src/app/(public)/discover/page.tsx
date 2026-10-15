import { MapPin } from "lucide-react";
import { EmptyBlock } from "@/components/data/StateBlock";
import { PageHeader } from "@/components/data/PageHeader";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Discover messes" };

export default function DiscoverPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 md:px-6">
      <PageHeader
        eyebrow="Discovery"
        title="Find a mess near you"
        description="Search and filters arrive with Phase 3 verification. Only approved, published, serviceable messes will ever appear here."
      />
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">Pune · launch city</Badge>
        <Badge variant="outline">Filters: Phase 3</Badge>
        <Badge variant="outline">Listings: verified only</Badge>
      </div>
      <EmptyBlock
        icon={<MapPin />}
        title="No listings yet"
        description="Mess onboarding and verification open in Phase 3. When kitchens are approved and published, they will appear here with hours, prices, and pickup or delivery options."
      />
    </div>
  );
}
