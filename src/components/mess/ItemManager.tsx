"use client";

import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { EmptyBlock, LoadingBlock } from "@/components/data/StateBlock";
import { formatINR } from "@/lib/menu-rules";

interface Item {
  id: string;
  name: string;
  description: string | null;
  pricePaise: number;
  vegType: string;
  photoUrl: string | null;
  active: boolean;
}

export function ItemManager({ messId }: { messId: string }) {
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [veg, setVeg] = useState("VEG");
  const [pending, setPending] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState("");

  async function load() {
    const res = await fetch(`/api/messes/${messId}/items`, { cache: "no-store" });
    if (!res.ok) {
      setError("Could not load items.");
      return;
    }
    setItems(((await res.json()) as { items: Item[] }).items);
  }

  useEffect(() => {
    setItems(null);
    setError(null);
    fetch(`/api/messes/${messId}/items`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("load");
        setItems(((await res.json()) as { items: Item[] }).items);
      })
      .catch(() => setError("Could not load items."));
  }, [messId]);

  async function add(event: React.FormEvent) {
    event.preventDefault();
    const paise = Math.round(Number(price) * 100);
    if (name.trim().length < 2 || !Number.isFinite(paise)) {
      setError("Give the item a name and a numeric price in rupees.");
      return;
    }
    setError(null);
    setPending(true);
    const res = await fetch(`/api/messes/${messId}/items`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: name.trim(), pricePaise: paise, vegType: veg })
    });
    setPending(false);
    if (!res.ok) {
      setError("Could not add — prices run ₹1 to ₹10,000.");
      return;
    }
    setName("");
    setPrice("");
    await load();
  }

  async function patch(id: string, patch: Record<string, unknown>) {
    setBusy(true);
    const res = await fetch(`/api/messes/${messId}/items/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch)
    });
    setBusy(false);
    if (!res.ok) setError("Could not update the item.");
    setEditing(null);
    await load();
  }

  if (error && items === null) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Items unavailable</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }
  if (items === null) return <LoadingBlock label="Loading items…" />;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Add an item</CardTitle>
          <CardDescription>
            Catalog entries are reused across weekly plans and dates. Prices are per portion in
            rupees.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={add} aria-label="Add item" noValidate>
            <FieldGroup>
              <div className="grid gap-4 sm:grid-cols-4">
                <Field>
                  <FieldLabel htmlFor="item-name">Name</FieldLabel>
                  <Input id="item-name" value={name} onChange={(e) => setName(e.target.value)} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="item-price">Price (₹)</FieldLabel>
                  <Input
                    id="item-price"
                    inputMode="decimal"
                    placeholder="90"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel>Type</FieldLabel>
                  <ToggleGroup
                    value={[veg]}
                    onValueChange={(value) => {
                      const next = value[value.length - 1];
                      if (next === "VEG" || next === "NON_VEG") setVeg(next);
                    }}
                    aria-label="Food type"
                  >
                    <ToggleGroupItem value="VEG" aria-label="Veg">
                      Veg
                    </ToggleGroupItem>
                    <ToggleGroupItem value="NON_VEG" aria-label="Non-veg">
                      Non-veg
                    </ToggleGroupItem>
                  </ToggleGroup>
                </Field>
                <div className="flex items-end">
                  <Button type="submit" disabled={pending}>
                    {pending && <Spinner data-icon="inline-start" />}
                    Add item
                  </Button>
                </div>
              </div>
              {error && (
                <Alert variant="destructive">
                  <AlertTitle>Could not save</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      {items.length === 0 ? (
        <EmptyBlock
          title="No items yet"
          description="Add your first dish above. Weekly plans and date menus pick from this catalog."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((item) => (
            <Card key={item.id}>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2">
                  {item.name}
                  <Badge variant={item.vegType === "VEG" ? "secondary" : "outline"}>
                    {item.vegType === "VEG" ? "Veg" : "Non-veg"}
                  </Badge>
                  {!item.active && <Badge variant="outline">Off</Badge>}
                </CardTitle>
                <CardDescription className="tnum">{formatINR(item.pricePaise)}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-3">
                {editing === item.id ? (
                  <form
                    className="flex flex-wrap items-center gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const paise = Math.round(Number(editPrice) * 100);
                      if (Number.isFinite(paise)) void patch(item.id, { pricePaise: paise });
                    }}
                    aria-label={`Edit price for ${item.name}`}
                  >
                    <Label htmlFor={`price-${item.id}`} className="sr-only">
                      New price in rupees
                    </Label>
                    <Input
                      id={`price-${item.id}`}
                      inputMode="decimal"
                      className="w-24"
                      defaultValue={(item.pricePaise / 100).toString()}
                      onChange={(e) => setEditPrice(e.target.value)}
                    />
                    <Button type="submit" size="sm" disabled={busy}>
                      Save
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditing(null)}
                    >
                      Cancel
                    </Button>
                  </form>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => setEditing(item.id)}>
                    Edit price
                  </Button>
                )}
                <div className="flex items-center gap-2">
                  <Switch
                    id={`item-${item.id}`}
                    checked={item.active}
                    disabled={busy}
                    onCheckedChange={(v) => void patch(item.id, { active: v })}
                  />
                  <Label htmlFor={`item-${item.id}`}>Listed</Label>
                </div>
              </CardContent>
              {item.description && (
                <CardContent>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
