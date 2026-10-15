"use client";

import { useEffect, useState } from "react";
import { MapPin, Plus, Trash2 } from "lucide-react";
import { addressSchema } from "@/lib/auth-validation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/data/StateBlock";
import { PageHeader } from "@/components/data/PageHeader";

interface Address {
  id: string;
  label: string;
  line1: string;
  line2: string | null;
  locality: string;
  city: string;
  state: string;
  pincode: string;
  phone: string | null;
  isDefault: boolean;
}

const emptyForm = {
  label: "",
  line1: "",
  line2: "",
  locality: "",
  city: "",
  state: "Maharashtra",
  pincode: "",
  phone: ""
};

export function AddressesManager() {
  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch("/api/addresses", { cache: "no-store" });
    if (!res.ok) {
      setLoadError("Could not load addresses. Reload and try again.");
      return;
    }
    const body = (await res.json()) as { addresses: Address[] };
    setAddresses(body.addresses);
  }

  useEffect(() => {
    let cancelled = false;
    fetch("/api/addresses", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("load failed");
        const body = (await res.json()) as { addresses: Address[] };
        if (!cancelled) setAddresses(body.addresses);
      })
      .catch(() => {
        if (!cancelled) setLoadError("Could not load addresses. Reload and try again.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function set<K extends keyof typeof emptyForm>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function addAddress(event: React.FormEvent) {
    event.preventDefault();
    const parsed = addressSchema.safeParse({ ...form, isDefault: addresses?.length === 0 });
    if (!parsed.success) {
      setFormError(parsed.error.issues.map((i) => i.message).join(" "));
      return;
    }
    setFormError(null);
    setSaving(true);
    const res = await fetch("/api/addresses", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(parsed.data)
    });
    setSaving(false);
    if (!res.ok) {
      setFormError("Could not save this address. Check the details and try again.");
      return;
    }
    setForm(emptyForm);
    setShowForm(false);
    await refresh();
  }

  async function makeDefault(id: string) {
    const current = addresses?.find((a) => a.id === id);
    if (!current) return;
    setBusyId(id);
    const res = await fetch(`/api/addresses/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...current,
        line2: current.line2 ?? "",
        phone: current.phone ?? "",
        isDefault: true
      })
    });
    setBusyId(null);
    if (!res.ok) {
      setLoadError("Could not set the default. Try again.");
      return;
    }
    await refresh();
  }

  async function remove(id: string) {
    setBusyId(id);
    const res = await fetch(`/api/addresses/${id}`, { method: "DELETE" });
    setBusyId(null);
    if (!res.ok) {
      setLoadError("Could not delete. Try again.");
      return;
    }
    await refresh();
  }

  if (loadError && addresses === null) {
    return <ErrorBlock title="Addresses unavailable" description={loadError} />;
  }
  if (addresses === null) return <LoadingBlock label="Loading addresses…" />;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Customer · Addresses"
        title="Addresses"
        description="Where your meals go. The default is preselected at checkout."
        actions={
          !showForm && (
            <Button onClick={() => setShowForm(true)}>
              <Plus data-icon="inline-start" />
              Add address
            </Button>
          )
        }
      />
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>New address</CardTitle>
            <CardDescription>Deliverable address with a 6-digit pincode.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={addAddress} aria-label="Add address" noValidate>
              <FieldGroup>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="ad-label">Label</FieldLabel>
                    <Input
                      id="ad-label"
                      placeholder="Home"
                      value={form.label}
                      onChange={(e) => set("label", e.target.value)}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="ad-phone">Contact phone (optional)</FieldLabel>
                    <Input
                      id="ad-phone"
                      inputMode="numeric"
                      value={form.phone}
                      onChange={(e) => set("phone", e.target.value)}
                    />
                  </Field>
                </div>
                <Field>
                  <FieldLabel htmlFor="ad-line1">House / flat and street</FieldLabel>
                  <Input
                    id="ad-line1"
                    value={form.line1}
                    onChange={(e) => set("line1", e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="ad-line2">Landmark (optional)</FieldLabel>
                  <Input
                    id="ad-line2"
                    value={form.line2}
                    onChange={(e) => set("line2", e.target.value)}
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field>
                    <FieldLabel htmlFor="ad-locality">Locality</FieldLabel>
                    <Input
                      id="ad-locality"
                      value={form.locality}
                      onChange={(e) => set("locality", e.target.value)}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="ad-city">City</FieldLabel>
                    <Input
                      id="ad-city"
                      value={form.city}
                      onChange={(e) => set("city", e.target.value)}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="ad-pincode">Pincode</FieldLabel>
                    <Input
                      id="ad-pincode"
                      inputMode="numeric"
                      value={form.pincode}
                      onChange={(e) => set("pincode", e.target.value)}
                    />
                  </Field>
                </div>
                {formError && (
                  <Alert variant="destructive">
                    <AlertTitle>Check the address</AlertTitle>
                    <AlertDescription>{formError}</AlertDescription>
                  </Alert>
                )}
                <div className="flex gap-2">
                  <Button type="submit" disabled={saving}>
                    {saving && <Spinner data-icon="inline-start" />}
                    {saving ? "Saving…" : "Save address"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    Cancel
                  </Button>
                </div>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      )}
      {loadError && (
        <Alert variant="destructive">
          <AlertTitle>Something failed</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      )}
      {addresses.length === 0 && !showForm ? (
        <EmptyBlock
          icon={<MapPin />}
          title="No addresses yet"
          description="Add your first delivery address. It becomes the default automatically."
          action={
            <Button onClick={() => setShowForm(true)}>
              <Plus data-icon="inline-start" />
              Add address
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {addresses.map((address) => (
            <Card key={address.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {address.label}
                  {address.isDefault && <Badge>Default</Badge>}
                </CardTitle>
                <CardDescription>
                  {address.line1}
                  {address.line2 ? `, ${address.line2}` : ""}, {address.locality}, {address.city}{" "}
                  {address.pincode}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Separator className="mb-3" />
                <div className="flex flex-wrap gap-2">
                  {!address.isDefault && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busyId === address.id}
                      onClick={() => void makeDefault(address.id)}
                    >
                      Make default
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busyId === address.id}
                    onClick={() => void remove(address.id)}
                    aria-label={`Delete ${address.label}`}
                  >
                    <Trash2 data-icon="inline-start" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
