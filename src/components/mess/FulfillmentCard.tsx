"use client";

import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { SuccessBlock } from "@/components/data/StateBlock";
import { FieldSet, FieldLegend } from "@/components/ui/field";

export function FulfillmentCard({
  messId,
  initial
}: {
  messId: string;
  initial: {
    deliveryFeePaise: number;
    pickupAllowed: boolean;
    deliveryAllowed: boolean;
    deliveryNote: string | null;
  };
}) {
  const [fee, setFee] = useState(String(initial.deliveryFeePaise / 100));
  const [pickup, setPickup] = useState(initial.pickupAllowed);
  const [delivery, setDelivery] = useState(initial.deliveryAllowed);
  const [note, setNote] = useState(initial.deliveryNote ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const paise = Math.round(Number(fee) * 100);
    if (!Number.isFinite(paise) || paise < 0 || paise > 50_000) {
      setError("Delivery fee must be ₹0 to ₹500.");
      return;
    }
    if (!pickup && !delivery) {
      setError("Keep at least one of pickup or delivery on.");
      return;
    }
    setError(null);
    setSaved(false);
    setPending(true);
    const res = await fetch(`/api/messes/${messId}/operations`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        deliveryFeePaise: paise,
        pickupAllowed: pickup,
        deliveryAllowed: delivery,
        deliveryNote: note
      })
    });
    setPending(false);
    if (!res.ok) {
      setError("Could not save. Try again.");
      return;
    }
    setSaved(true);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fulfillment and charges</CardTitle>
        <CardDescription>
          Live anytime — no re-verification. Applies to new orders only.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={save} aria-label="Fulfillment settings" noValidate>
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="ff-fee">Delivery fee (₹)</FieldLabel>
                <Input
                  id="ff-fee"
                  inputMode="decimal"
                  value={fee}
                  onChange={(e) => setFee(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="ff-note">
                  Delivery note{" "}
                  <span className="font-normal text-muted-foreground">(optional)</span>
                </FieldLabel>
                <Input
                  id="ff-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Free delivery above ₹299"
                />
              </Field>
            </div>
            <FieldSet>
              <FieldLegend>Offered fulfillment</FieldLegend>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="ff-pickup"
                    checked={pickup}
                    onCheckedChange={(v) => setPickup(v === true)}
                  />
                  <Label htmlFor="ff-pickup">Pickup</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="ff-delivery"
                    checked={delivery}
                    onCheckedChange={(v) => setDelivery(v === true)}
                  />
                  <Label htmlFor="ff-delivery">Delivery</Label>
                </div>
              </div>
            </FieldSet>
            {error && (
              <Alert variant="destructive">
                <AlertTitle>Could not save</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {saved && <SuccessBlock title="Saved" description="New orders use these settings." />}
            <div>
              <Button type="submit" disabled={pending}>
                {pending && <Spinner data-icon="inline-start" />}
                Save fulfillment
              </Button>
            </div>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
