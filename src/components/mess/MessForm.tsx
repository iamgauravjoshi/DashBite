"use client";

import { useState } from "react";
import { messFormSchema, type MessPayload } from "@/lib/mess-validation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export type MessFormValues = {
  name: string;
  description: string;
  phone: string;
  line1: string;
  locality: string;
  city: string;
  state: string;
  pincode: string;
  vegType: "VEG" | "NON_VEG" | "BOTH";
  pickupAllowed: boolean;
  deliveryAllowed: boolean;
  deliveryNote: string;
  areasText: string;
  operatingDays: string[];
  opensAt: string;
  closesAt: string;
};

export const emptyMessForm: MessFormValues = {
  name: "",
  description: "",
  phone: "",
  line1: "",
  locality: "",
  city: "Pune",
  state: "Maharashtra",
  pincode: "",
  vegType: "BOTH",
  pickupAllowed: true,
  deliveryAllowed: true,
  deliveryNote: "",
  areasText: "",
  operatingDays: ["MON", "TUE", "WED", "THU", "FRI", "SAT"],
  opensAt: "07:00",
  closesAt: "21:00"
};

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;

export function toPayload(form: MessFormValues) {
  return {
    name: form.name,
    description: form.description,
    phone: form.phone,
    line1: form.line1,
    locality: form.locality,
    city: form.city,
    state: form.state,
    pincode: form.pincode,
    vegType: form.vegType,
    pickupAllowed: form.pickupAllowed,
    deliveryAllowed: form.deliveryAllowed,
    deliveryNote: form.deliveryNote,
    serviceAreas: form.areasText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    operatingDays: form.operatingDays,
    opensAt: form.opensAt,
    closesAt: form.closesAt
  };
}

export function MessForm({
  initial = emptyMessForm,
  submitLabel,
  onSubmit,
  pending,
  serverError
}: {
  initial?: MessFormValues;
  submitLabel: string;
  onSubmit: (payload: MessPayload) => Promise<void>;
  pending: boolean;
  serverError: string | null;
}) {
  const [form, setForm] = useState<MessFormValues>(initial);
  const [errors, setErrors] = useState<string[]>([]);

  function set<K extends keyof MessFormValues>(key: K, value: MessFormValues[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleDay(day: string, checked: boolean) {
    setForm((prev) => ({
      ...prev,
      operatingDays: checked
        ? [...prev.operatingDays, day]
        : prev.operatingDays.filter((d) => d !== day)
    }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const payload = toPayload(form);
    const parsed = messFormSchema.safeParse(payload);
    if (!parsed.success) {
      setErrors(parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`));
      return;
    }
    setErrors([]);
    await onSubmit(parsed.data);
  }

  const areaCount = toPayload(form).serviceAreas.length;

  return (
    <form onSubmit={handleSubmit} aria-label="Mess details" noValidate>
      <FieldGroup>
        <Card>
          <CardHeader>
            <CardTitle>Identity and contact</CardTitle>
            <CardDescription>Shown to customers exactly as entered.</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="mf-name">Mess name</FieldLabel>
                <Input
                  id="mf-name"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="mf-desc">
                  Description <span className="font-normal text-muted-foreground">(optional)</span>
                </FieldLabel>
                <Textarea
                  id="mf-desc"
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="mf-phone">Contact phone</FieldLabel>
                <Input
                  id="mf-phone"
                  inputMode="numeric"
                  autoComplete="tel"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                />
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Kitchen location</CardTitle>
            <CardDescription>Customers see locality and city while discovering.</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="mf-line1">Shop / house and street</FieldLabel>
                <Input
                  id="mf-line1"
                  value={form.line1}
                  onChange={(e) => set("line1", e.target.value)}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="mf-locality">Locality</FieldLabel>
                  <Input
                    id="mf-locality"
                    value={form.locality}
                    onChange={(e) => set("locality", e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="mf-city">City</FieldLabel>
                  <Input
                    id="mf-city"
                    value={form.city}
                    onChange={(e) => set("city", e.target.value)}
                  />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="mf-state">State</FieldLabel>
                  <Input
                    id="mf-state"
                    value={form.state}
                    onChange={(e) => set("state", e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="mf-pincode">Pincode</FieldLabel>
                  <Input
                    id="mf-pincode"
                    inputMode="numeric"
                    value={form.pincode}
                    onChange={(e) => set("pincode", e.target.value)}
                  />
                </Field>
              </div>
            </FieldGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Food and fulfillment</CardTitle>
            <CardDescription>What you serve and how customers receive it.</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel>Food type</FieldLabel>
                <ToggleGroup
                  value={[form.vegType]}
                  onValueChange={(value) => {
                    const next = value[value.length - 1];
                    if (next === "VEG" || next === "NON_VEG" || next === "BOTH")
                      set("vegType", next);
                  }}
                  aria-label="Food type"
                >
                  <ToggleGroupItem value="VEG" aria-label="Veg only">
                    Veg
                  </ToggleGroupItem>
                  <ToggleGroupItem value="NON_VEG" aria-label="Non-veg">
                    Non-veg
                  </ToggleGroupItem>
                  <ToggleGroupItem value="BOTH" aria-label="Both veg and non-veg">
                    Both
                  </ToggleGroupItem>
                </ToggleGroup>
              </Field>
              <FieldSet>
                <FieldLegend>Fulfillment</FieldLegend>
                <Field orientation="horizontal">
                  <Checkbox
                    id="mf-pickup"
                    checked={form.pickupAllowed}
                    onCheckedChange={(v) => set("pickupAllowed", v === true)}
                  />
                  <Label htmlFor="mf-pickup">Self-pickup</Label>
                </Field>
                <Field orientation="horizontal">
                  <Checkbox
                    id="mf-delivery"
                    checked={form.deliveryAllowed}
                    onCheckedChange={(v) => set("deliveryAllowed", v === true)}
                  />
                  <Label htmlFor="mf-delivery">Delivery</Label>
                </Field>
              </FieldSet>
              <Field>
                <FieldLabel htmlFor="mf-areas">Served localities (comma separated)</FieldLabel>
                <Input
                  id="mf-areas"
                  placeholder="Camp, MG Road, Koregaon Park"
                  value={form.areasText}
                  onChange={(e) => set("areasText", e.target.value)}
                />
                <FieldDescription>
                  {areaCount === 0
                    ? "Add at least one locality you serve."
                    : `${areaCount} ${areaCount === 1 ? "locality" : "localities"} will be listed.`}
                </FieldDescription>
                {areaCount > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {toPayload(form).serviceAreas.map((area) => (
                      <Badge key={area} variant="secondary">
                        {area}
                      </Badge>
                    ))}
                  </div>
                )}
              </Field>
              <Field>
                <FieldLabel htmlFor="mf-note">
                  Delivery note{" "}
                  <span className="font-normal text-muted-foreground">(optional)</span>
                </FieldLabel>
                <Input
                  id="mf-note"
                  placeholder="Free delivery above ₹299 within 3 km"
                  value={form.deliveryNote}
                  onChange={(e) => set("deliveryNote", e.target.value)}
                />
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Operating hours</CardTitle>
            <CardDescription>
              Daily window in 24-hour time. Slots and cutoffs arrive in Phase 4.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <FieldSet>
                <FieldLegend>Operating days</FieldLegend>
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  {DAYS.map((day) => (
                    <Field key={day} orientation="horizontal">
                      <Checkbox
                        id={`mf-day-${day}`}
                        checked={form.operatingDays.includes(day)}
                        onCheckedChange={(v) => toggleDay(day, v === true)}
                      />
                      <Label htmlFor={`mf-day-${day}`}>{day}</Label>
                    </Field>
                  ))}
                </div>
              </FieldSet>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="mf-opens">Opens at</FieldLabel>
                  <Input
                    id="mf-opens"
                    type="time"
                    value={form.opensAt}
                    onChange={(e) => set("opensAt", e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="mf-closes">Closes at</FieldLabel>
                  <Input
                    id="mf-closes"
                    type="time"
                    value={form.closesAt}
                    onChange={(e) => set("closesAt", e.target.value)}
                  />
                </Field>
              </div>
            </FieldGroup>
          </CardContent>
        </Card>

        {errors.length > 0 && (
          <Alert variant="destructive">
            <AlertTitle>Check the highlighted details</AlertTitle>
            <AlertDescription>
              <ul className="list-disc pl-4">
                {errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
        {serverError && (
          <Alert variant="destructive">
            <AlertTitle>Could not save</AlertTitle>
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}
        <div>
          <Button type="submit" disabled={pending}>
            {pending && <Spinner data-icon="inline-start" />}
            {pending ? "Saving…" : submitLabel}
          </Button>
        </div>
        <Separator />
      </FieldGroup>
    </form>
  );
}
