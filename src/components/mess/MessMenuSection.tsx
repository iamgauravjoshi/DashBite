import Link from "next/link";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyBlock } from "@/components/data/StateBlock";
import { getMenuForDate } from "@/lib/menus";
import { formatINR } from "@/lib/menu-rules";
import { addDays, isValidDateString, todayInTz } from "@/lib/ist";
import { UtensilsCrossed } from "lucide-react";

const CLOSED_COPY: Record<string, string> = {
  SLOT_INACTIVE: "This slot is not served right now.",
  NOT_OPERATING_DAY: "The kitchen rests this day.",
  HOLIDAY: "Holiday — the whole kitchen is closed.",
  DATE_CLOSED: "Closed this date by the kitchen.",
  NO_MENU: "No menu planned for this date yet."
};

export async function MessMenuSection({
  messId,
  date,
  slotId
}: {
  messId: string;
  date: string;
  slotId: string | null;
}) {
  const timezone = "Asia/Kolkata";
  const today = todayInTz(timezone);
  const activeDate = isValidDateString(date) && date >= today ? date : today;
  const slots = await db.menuSlot.findMany({
    where: { messId, active: true },
    orderBy: { sortOrder: "asc" }
  });
  if (slots.length === 0) {
    return (
      <EmptyBlock
        icon={<UtensilsCrossed />}
        title="Menu coming soon"
        description="This kitchen is still planning its slots. Check back shortly."
      />
    );
  }
  const activeSlot = slots.find((s) => s.id === slotId) ?? slots[0];
  const menu = await getMenuForDate(messId, activeDate, activeSlot.id);
  const dates = Array.from({ length: 7 }, (_, i) => addDays(today, i));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Choose a date">
        {dates.map((d) => (
          <Button
            key={d}
            variant={d === activeDate ? "default" : "outline"}
            size="sm"
            render={<Link href={`?date=${d}&slot=${activeSlot.id}`} />}
          >
            <span className="tnum">{d.slice(5).replace("-", "/")}</span>
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Choose a slot">
        {slots.map((s) => (
          <Button
            key={s.id}
            variant={s.id === activeSlot.id ? "default" : "outline"}
            size="sm"
            render={<Link href={`?date=${activeDate}&slot=${s.id}`} />}
          >
            {s.name}
          </Button>
        ))}
      </div>
      {!menu || menu.status === "closed" ? (
        <EmptyBlock
          icon={<UtensilsCrossed />}
          title="Kitchen closed"
          description={
            menu?.closedReason
              ? CLOSED_COPY[menu.closedReason]
              : "No menu planned for this date yet."
          }
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>
              {menu.slotName} · <span className="tnum">{activeDate}</span>
            </CardTitle>
            <CardDescription>
              Order by <span className="tnum">{menu.cutoffTime}</span> IST
              {menu.orderable ? "" : " — cutoff passed for today, future dates stay open"} ·{" "}
              {menu.capacity != null && <span className="tnum">{menu.capacity} meals planned</span>}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-3">
              {menu.items.map((item) => (
                <li
                  key={item.itemId}
                  className="flex items-start justify-between gap-3 rounded-lg border px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                      {item.name}
                      <Badge variant={item.vegType === "VEG" ? "secondary" : "outline"}>
                        {item.vegType === "VEG" ? "Veg" : "Non-veg"}
                      </Badge>
                    </p>
                    {item.description && (
                      <p className="mt-0.5 text-sm text-muted-foreground">{item.description}</p>
                    )}
                  </div>
                  <p className="tnum shrink-0 text-sm font-semibold">
                    {formatINR(item.pricePaise)}
                  </p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
