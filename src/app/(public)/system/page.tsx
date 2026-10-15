"use client";

import { CalendarClock, Plus } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/data/StatusBadge";
import { ErrorBlock, SuccessBlock } from "@/components/data/StateBlock";
import { PageHeader } from "@/components/data/PageHeader";

export default function SystemPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-10 md:px-6">
      <PageHeader
        eyebrow="Design reference"
        title="System"
        description="Shared tokens and components. Sample rows illustrate layout only — never product data."
      />

      {/* Type + buttons + badges */}
      <section aria-labelledby="sys-primitives" className="flex flex-col gap-4">
        <h2 id="sys-primitives" className="text-xl font-semibold tracking-tight">
          Primitives
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Buttons</CardTitle>
              <CardDescription>One primary per region. Verbs, not vague labels.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-2">
                <Button>Save changes</Button>
                <Button variant="outline">View orders</Button>
                <Button variant="ghost">Dismiss</Button>
                <Button variant="destructive">Suspend mess</Button>
                <Button size="sm">
                  <Plus data-icon="inline-start" />
                  Add item
                </Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
              <CardDescription>
                Color never carries meaning alone — labels always present.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <StatusBadge status="confirmed" />
                <StatusBadge status="pending" />
                <StatusBadge status="paused" />
                <StatusBadge status="suspended" />
                <Badge variant="outline">Cutoff 09:30 IST</Badge>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Numbers</CardTitle>
              <CardDescription>Tabular numerals for money and counts.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="tnum text-2xl font-semibold">₹12,480.00</p>
              <p className="tnum text-sm text-muted-foreground">
                142 / 200 meals · +12.4% vs yesterday
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <Separator />

      {/* Form */}
      <section aria-labelledby="sys-form" className="flex flex-col gap-4">
        <h2 id="sys-form" className="text-xl font-semibold tracking-tight">
          Forms
        </h2>
        <Card>
          <CardHeader>
            <CardTitle>Mess profile (example layout)</CardTitle>
            <CardDescription>
              Persistent labels, inline validation, no placeholder-only labels.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(event) => event.preventDefault()}
              aria-label="Example mess profile form"
            >
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="sys-name">Mess name</FieldLabel>
                  <Input
                    id="sys-name"
                    placeholder="e.g. Annapurna Mess"
                    autoComplete="organization"
                  />
                  <FieldDescription>Shown to customers exactly as entered.</FieldDescription>
                </Field>
                <Field data-invalid>
                  <FieldLabel htmlFor="sys-phone">Contact phone</FieldLabel>
                  <Input
                    id="sys-phone"
                    inputMode="tel"
                    autoComplete="tel"
                    aria-invalid
                    placeholder="10-digit mobile number"
                  />
                  <FieldError>Enter a valid 10-digit mobile number.</FieldError>
                </Field>
                <Field>
                  <FieldLabel htmlFor="sys-notes">Kitchen notes</FieldLabel>
                  <Textarea id="sys-notes" placeholder="Allergens, spice level, packing notes" />
                </Field>
                <FieldSet>
                  <FieldLegend>Serves</FieldLegend>
                  <Field orientation="horizontal">
                    <Checkbox id="sys-veg" />
                    <FieldContent>
                      <Label htmlFor="sys-veg">Veg</Label>
                    </FieldContent>
                  </Field>
                  <Field orientation="horizontal">
                    <Checkbox id="sys-nonveg" />
                    <FieldContent>
                      <Label htmlFor="sys-nonveg">Non-veg</Label>
                    </FieldContent>
                  </Field>
                </FieldSet>
                <div className="flex gap-2">
                  <Button type="submit">Save changes</Button>
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </div>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      </section>

      <Separator />

      {/* Table + tabs */}
      <section aria-labelledby="sys-data" className="flex flex-col gap-4">
        <h2 id="sys-data" className="text-xl font-semibold tracking-tight">
          Data
        </h2>
        <Tabs defaultValue="slots">
          <TabsList aria-label="Menu views">
            <TabsTrigger value="slots">Slots</TabsTrigger>
            <TabsTrigger value="counts">Counts</TabsTrigger>
          </TabsList>
          <TabsContent value="slots">
            <Card>
              <CardHeader>
                <CardTitle>Meal slots (layout sample)</CardTitle>
                <CardDescription>
                  Illustrative rows — real slots are configured in Phase 4.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Slot</TableHead>
                      <TableHead>Cutoff (IST)</TableHead>
                      <TableHead className="text-right">Capacity</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Breakfast</TableCell>
                      <TableCell>07:30</TableCell>
                      <TableCell className="tnum text-right">80</TableCell>
                      <TableCell>
                        <StatusBadge status="active" />
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Lunch</TableCell>
                      <TableCell>09:30</TableCell>
                      <TableCell className="tnum text-right">200</TableCell>
                      <TableCell>
                        <StatusBadge status="active" />
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Dinner</TableCell>
                      <TableCell>16:00</TableCell>
                      <TableCell className="tnum text-right">160</TableCell>
                      <TableCell>
                        <StatusBadge status="paused" />
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="counts">
            <div className="flex flex-col gap-2" role="status" aria-label="Loading kitchen counts">
              <Skeleton className="h-8 w-1/2" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </TabsContent>
        </Tabs>
      </section>

      <Separator />

      {/* Feedback */}
      <section aria-labelledby="sys-feedback" className="flex flex-col gap-4">
        <h2 id="sys-feedback" className="text-xl font-semibold tracking-tight">
          Feedback
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-3">
            <SuccessBlock
              title="Order confirmed"
              description="Payment succeeded and the kitchen has the ticket. Fulfillment tracking is separate."
            />
            <ErrorBlock
              title="Payment failed"
              description="No order was created and nothing was charged. Retry or choose another method."
            />
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Confirmations</CardTitle>
              <CardDescription>
                Destructive and consequential actions always confirm first.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog>
                <DialogTrigger
                  render={<Button variant="outline">Preview skip confirmation</Button>}
                />
                <DialogContent aria-describedby={undefined}>
                  <DialogHeader>
                    <DialogTitle>Skip lunch on Friday?</DialogTitle>
                    <DialogDescription>
                      This meal returns to your remaining balance. Skips after 09:30 IST apply to
                      the next eligible day.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline">Keep meal</Button>
                    <Button>Skip this meal</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarClock className="size-4" aria-hidden="true" />
                Cutoff-aware, consequence-first — the Phase 6 standard.
              </p>
            </CardContent>
          </Card>
        </div>
        <Alert>
          <AlertTitle>Keyboard and screen readers</AlertTitle>
          <AlertDescription>
            Skip links, landmarks, focus-visible rings, aria-current on active nav, and required
            dialog titles ship in every shell. Esc closes dialogs and sheets.
          </AlertDescription>
        </Alert>
      </section>
    </div>
  );
}
