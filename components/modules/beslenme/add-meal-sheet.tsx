"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus, Search, X } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { PhotoPicker } from "@/components/ui/photo-picker";
import { addCustomFood, addMealEntry, buildMealItem, savePhoto, searchFoods, softDeleteMealEntry } from "@/lib/db/repo/meals";
import { sumMacros } from "@/lib/nutrition/tdee";
import { showUndoToast } from "@/lib/store/toast-store";
import type { FoodItem, MealEntryItem, MealType } from "@/lib/db/types";

const MEAL_TYPE_OPTIONS: { value: MealType; label: string }[] = [
  { value: "kahvalti", label: "Kahvaltı" },
  { value: "ogle", label: "Öğle" },
  { value: "aksam", label: "Akşam" },
  { value: "atistirmalik", label: "Atıştırmalık" },
];

export function AddMealSheet({
  open,
  onOpenChange,
  defaultMealType = "kahvalti",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultMealType?: MealType;
}) {
  const [mealType, setMealType] = useState<MealType>(defaultMealType);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<MealEntryItem[]>([]);
  const [note, setNote] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [creatingFood, setCreatingFood] = useState(false);

  const results = useLiveQuery(() => searchFoods(query), [query]);
  const totals = sumMacros(items.map((i) => i.macro));

  function reset() {
    setMealType(defaultMealType);
    setQuery("");
    setItems([]);
    setNote("");
    setPhotoPreview(null);
    setPhotoBlob(null);
    setCreatingFood(false);
  }

  function addFood(food: FoodItem) {
    setItems((prev) => [...prev, buildMealItem(food, 1)]);
    setQuery("");
  }

  function updateQuantity(index: number, quantity: number) {
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== index) return it;
        const factor = quantity / it.quantity;
        return {
          ...it,
          quantity,
          macro: {
            kcal: Math.round(it.macro.kcal * factor),
            proteinG: Math.round(it.macro.proteinG * factor * 10) / 10,
            carbG: Math.round(it.macro.carbG * factor * 10) / 10,
            fatG: Math.round(it.macro.fatG * factor * 10) / 10,
          },
        };
      }),
    );
  }

  function handlePhotoSelect(blob: Blob) {
    setPhotoBlob(blob);
    setPhotoPreview(URL.createObjectURL(blob));
  }

  async function handleSave() {
    if (items.length === 0) return;
    let photoId: string | undefined;
    if (photoBlob) photoId = await savePhoto(photoBlob);
    const id = await addMealEntry({ mealType, items, photoId, note: note || undefined });
    onOpenChange(false);
    reset();
    showUndoToast("Öğün kaydedildi", () => softDeleteMealEntry(id));
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
      title="Öğün Ekle"
      className="max-h-[92dvh]"
    >
      <div className="space-y-4">
        <Segmented options={MEAL_TYPE_OPTIONS} value={mealType} onChange={setMealType} />

        {items.length > 0 && (
          <div className="rounded-2xl bg-[var(--color-card-raised)] p-3 space-y-2">
            {items.map((it, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="flex-1 text-[13px] text-[var(--color-text-primary)] truncate">{it.name}</span>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={it.quantity}
                  onChange={(e) => updateQuantity(i, Number(e.target.value) || 0)}
                  className="w-16 h-8 px-2 text-[12px] text-center"
                />
                <span className="text-[11px] text-[var(--color-text-tertiary)] w-14">{it.unit}</span>
                <span className="text-[12px] tabular-nums-tight text-[var(--color-text-secondary)] w-12 text-right">{it.macro.kcal} kcal</span>
                <button onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== i))} className="text-[var(--color-text-tertiary)] p-1" aria-label="Kaldır">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <div className="flex justify-between pt-1 border-t border-[var(--color-border)] text-[12px] font-semibold text-[var(--color-text-primary)]">
              <span>Toplam</span>
              <span className="tabular-nums-tight">
                {totals.kcal} kcal · P{totals.proteinG}g K{totals.carbG}g Y{totals.fatG}g
              </span>
            </div>
          </div>
        )}

        <div>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-tertiary)]" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Besin ara (örn. yumurta, tavuk)" className="pl-10" />
          </div>

          <div className="mt-2 max-h-56 overflow-y-auto space-y-1">
            {(results ?? []).map((food) => (
              <button
                key={food.id}
                onClick={() => addFood(food)}
                className="w-full flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 bg-[var(--color-card-raised)] active:scale-[0.98] transition-transform"
              >
                <div className="min-w-0 text-left">
                  <p className="text-[13px] font-medium text-[var(--color-text-primary)] truncate">{food.name}</p>
                  <p className="text-[11px] text-[var(--color-text-tertiary)]">
                    {food.unit} · {food.macroPerUnit.kcal} kcal
                  </p>
                </div>
                <Plus className="h-4 w-4 text-[var(--color-beslenme)] shrink-0" />
              </button>
            ))}
            {query && (results ?? []).length === 0 && !creatingFood && (
              <button onClick={() => setCreatingFood(true)} className="text-[12.5px] font-medium text-[var(--color-beslenme)] py-2">
&quot;{query}&quot; bulunamadı — yeni besin ekle
              </button>
            )}
          </div>

          {creatingFood && (
            <CustomFoodForm
              initialName={query}
              onCancel={() => setCreatingFood(false)}
              onCreated={(food) => {
                addFood(food);
                setCreatingFood(false);
              }}
            />
          )}
        </div>

        <div className="flex items-center gap-3">
          <PhotoPicker previewUrl={photoPreview} onSelect={handlePhotoSelect} onRemove={() => { setPhotoPreview(null); setPhotoBlob(null); }} label="Öğün fotoğrafı" />
          <div className="flex-1">
            <Label>Not</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="opsiyonel" />
          </div>
        </div>

        <Button variant="accent" accentVar="--color-beslenme" onClick={handleSave} className="w-full" disabled={items.length === 0}>
          Öğünü Kaydet
        </Button>
      </div>
    </Sheet>
  );
}

function CustomFoodForm({
  initialName,
  onCancel,
  onCreated,
}: {
  initialName: string;
  onCancel: () => void;
  onCreated: (food: FoodItem) => void;
}) {
  const [name, setName] = useState(initialName);
  const [unit, setUnit] = useState("100 g");
  const [kcal, setKcal] = useState("");
  const [protein, setProtein] = useState("");
  const [carb, setCarb] = useState("");
  const [fat, setFat] = useState("");

  async function handleCreate() {
    if (!name.trim() || !kcal) return;
    const food = await addCustomFood({
      name: name.trim(),
      unit,
      macroPerUnit: {
        kcal: Number(kcal) || 0,
        proteinG: Number(protein) || 0,
        carbG: Number(carb) || 0,
        fatG: Number(fat) || 0,
      },
    });
    onCreated(food);
  }

  return (
    <div className="mt-2 rounded-2xl border border-[var(--color-border)] p-3 space-y-2.5">
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Besin adı" />
      <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="Birim (örn. 100 g, adet)" />
      <div className="grid grid-cols-4 gap-2">
        <Input inputMode="numeric" value={kcal} onChange={(e) => setKcal(e.target.value)} placeholder="kcal" className="px-2 text-[12px]" />
        <Input inputMode="numeric" value={protein} onChange={(e) => setProtein(e.target.value)} placeholder="P g" className="px-2 text-[12px]" />
        <Input inputMode="numeric" value={carb} onChange={(e) => setCarb(e.target.value)} placeholder="K g" className="px-2 text-[12px]" />
        <Input inputMode="numeric" value={fat} onChange={(e) => setFat(e.target.value)} placeholder="Y g" className="px-2 text-[12px]" />
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" className="flex-1" onClick={onCancel}>
          Vazgeç
        </Button>
        <Button variant="accent" accentVar="--color-beslenme" size="sm" className="flex-1" onClick={handleCreate}>
          Ekle
        </Button>
      </div>
    </div>
  );
}
