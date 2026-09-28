"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { PhotoPicker } from "@/components/ui/photo-picker";
import { addBodyMetric, saveBodyPhoto, softDeleteBodyMetric } from "@/lib/db/repo/health";
import { showUndoToast } from "@/lib/store/toast-store";

export function AddBodySheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [weight, setWeight] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [waist, setWaist] = useState("");
  const [chest, setChest] = useState("");
  const [arm, setArm] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);

  function reset() {
    setWeight("");
    setBodyFat("");
    setWaist("");
    setChest("");
    setArm("");
    setPhotoPreview(null);
    setPhotoBlob(null);
  }

  async function handleSave() {
    if (!weight && !bodyFat && !waist && !chest && !arm && !photoBlob) return;
    let photoId: string | undefined;
    if (photoBlob) photoId = await saveBodyPhoto(photoBlob);
    const id = await addBodyMetric({
      date: new Date().toISOString().slice(0, 10),
      weightKg: weight ? Number(weight) : undefined,
      bodyFatPct: bodyFat ? Number(bodyFat) : undefined,
      waistCm: waist ? Number(waist) : undefined,
      chestCm: chest ? Number(chest) : undefined,
      armCm: arm ? Number(arm) : undefined,
      photoId,
      source: "manuel",
    });
    onOpenChange(false);
    reset();
    showUndoToast("Vücut ölçümü kaydedildi", () => softDeleteBodyMetric(id));
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
      title="Vücut Ölçümü"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Kilo (kg)</Label>
            <Input inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} />
          </div>
          <div>
            <Label>Yağ oranı (%)</Label>
            <Input inputMode="decimal" value={bodyFat} onChange={(e) => setBodyFat(e.target.value)} placeholder="opsiyonel" />
          </div>
          <div>
            <Label>Bel (cm)</Label>
            <Input inputMode="decimal" value={waist} onChange={(e) => setWaist(e.target.value)} placeholder="opsiyonel" />
          </div>
          <div>
            <Label>Göğüs (cm)</Label>
            <Input inputMode="decimal" value={chest} onChange={(e) => setChest(e.target.value)} placeholder="opsiyonel" />
          </div>
          <div>
            <Label>Kol (cm)</Label>
            <Input inputMode="decimal" value={arm} onChange={(e) => setArm(e.target.value)} placeholder="opsiyonel" />
          </div>
        </div>

        <PhotoPicker previewUrl={photoPreview} onSelect={(b) => { setPhotoBlob(b); setPhotoPreview(URL.createObjectURL(b)); }} onRemove={() => { setPhotoPreview(null); setPhotoBlob(null); }} label="İlerleme fotoğrafı" />

        <Button variant="accent" accentVar="--color-hareket" className="w-full" onClick={handleSave}>
          Kaydet
        </Button>
      </div>
    </Sheet>
  );
}
