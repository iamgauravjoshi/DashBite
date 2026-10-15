"use client";

import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SlotManager } from "@/components/mess/SlotManager";
import { ItemManager } from "@/components/mess/ItemManager";
import { WeeklyPlanner } from "@/components/mess/WeeklyPlanner";
import { DatePlanner } from "@/components/mess/DatePlanner";
import { HolidayManager } from "@/components/mess/HolidayManager";

export function MenuConsole({
  messes,
  selectedId
}: {
  messes: Array<{ id: string; name: string; verificationStatus: string }>;
  selectedId: string;
}) {
  const router = useRouter();
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Choose mess">
        {messes.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => router.push(`/owner/menus?mess=${m.id}`)}
            aria-pressed={m.id === selectedId}
            className={
              m.id === selectedId
                ? "rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
                : "rounded-lg border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
            }
          >
            {m.name}
          </button>
        ))}
      </div>
      <Tabs defaultValue="slots">
        <TabsList aria-label="Menu sections">
          <TabsTrigger value="slots">Slots</TabsTrigger>
          <TabsTrigger value="items">Items</TabsTrigger>
          <TabsTrigger value="weekly">Weekly</TabsTrigger>
          <TabsTrigger value="dates">Dates</TabsTrigger>
          <TabsTrigger value="holidays">Holidays</TabsTrigger>
        </TabsList>
        <TabsContent value="slots" key={`slots-${selectedId}`}>
          <SlotManager messId={selectedId} />
        </TabsContent>
        <TabsContent value="items" key={`items-${selectedId}`}>
          <ItemManager messId={selectedId} />
        </TabsContent>
        <TabsContent value="weekly" key={`weekly-${selectedId}`}>
          <WeeklyPlanner messId={selectedId} />
        </TabsContent>
        <TabsContent value="dates" key={`dates-${selectedId}`}>
          <DatePlanner messId={selectedId} />
        </TabsContent>
        <TabsContent value="holidays" key={`holidays-${selectedId}`}>
          <HolidayManager messId={selectedId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
