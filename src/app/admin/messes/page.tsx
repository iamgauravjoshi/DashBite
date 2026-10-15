import Link from "next/link";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/data/PageHeader";
import { StatusBadge } from "@/components/data/StatusBadge";
import { EmptyBlock } from "@/components/data/StateBlock";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Inbox } from "lucide-react";
import { requirePageAccess } from "@/lib/auth-guards";

export const metadata = { title: "Messes" };

const STATUSES = [
  "ALL",
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
  "SUSPENDED"
] as const;

export default async function AdminMessesPage({
  searchParams
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  await requirePageAccess("/admin/messes");
  const { status, q } = await searchParams;
  const active = STATUSES.includes(status as (typeof STATUSES)[number])
    ? (status as (typeof STATUSES)[number])
    : "ALL";
  const query = q?.trim() || undefined;
  const messes = await db.mess.findMany({
    where: {
      ...(active === "ALL" ? {} : { verificationStatus: active }),
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { locality: { contains: query, mode: "insensitive" } }
            ]
          }
        : {})
    },
    include: { owner: { select: { name: true, email: true } } },
    orderBy: { updatedAt: "desc" },
    take: 100
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Admin · Messes"
        title="Messes"
        description="Every listing with verification and publication state. Decisions happen in the review queue."
        actions={
          <Button variant="outline" size="sm" render={<Link href="/admin/verifications" />}>
            Open review queue
          </Button>
        }
      />
      <form method="get" aria-label="Filter messes" className="flex flex-wrap items-center gap-2">
        <label htmlFor="admin-mess-q" className="sr-only">
          Search messes
        </label>
        <input
          id="admin-mess-q"
          name="q"
          defaultValue={query ?? ""}
          placeholder="Search name or locality"
          className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring"
        />
        <label htmlFor="admin-mess-status" className="sr-only">
          Verification status
        </label>
        <select
          id="admin-mess-status"
          name="status"
          defaultValue={active}
          className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s === "ALL"
                ? "All statuses"
                : s.charAt(0) + s.slice(1).toLowerCase().replace("_", " ")}
            </option>
          ))}
        </select>
        <Button type="submit" size="sm" variant="outline">
          Filter
        </Button>
      </form>
      {messes.length === 0 ? (
        <EmptyBlock
          icon={<Inbox />}
          title="No messes match"
          description="Adjust the filters, or wait for owners to register."
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="tnum">{messes.length} listings</CardTitle>
            <CardDescription>Publication never implies approval — both are shown.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mess</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Listing</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {messes.map((mess) => (
                  <TableRow key={mess.id}>
                    <TableCell className="font-medium">
                      {mess.name}
                      <span className="block text-xs font-normal text-muted-foreground">
                        {mess.locality}, {mess.city}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{mess.owner.email}</TableCell>
                    <TableCell>
                      <StatusBadge status={mess.verificationStatus} />
                    </TableCell>
                    <TableCell>
                      {mess.published ? (
                        <Badge>Published</Badge>
                      ) : (
                        <Badge variant="outline">Unpublished</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
