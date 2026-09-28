"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { addHeartMetric } from "@/lib/db/repo/health";

export function AddHeartSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [restingHr, setRestingHr] = useState("");
  const [hrv, setHrv] = useState("");
  const [vo2max, setVo2max] = useState("");

  async function handleSave() {
    if (!restingHr && !hrv && !vo2max) return;
    await addHeartMetric({
      date: new Date().toISOString().slice(0, 10),
      restingHr: restingHr ? Number(restingHr) : undefined,
      hrv: hrv ? Number(hrv) : undefined,
      vo2max: vo2max ? Number(vo2max) : undefined,
      source: "manuel",
    });
    onOpenChange(false);
    setRestingHr("");
    setHrv("");
    setVo2max("");
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Kalp Verisi Ekle">
      <div className="space-y-4">
        <div>
          <Label>Dinlenik nabız (bpm)</Label>
          <Input inputMode="numeric" value={restingHr} onChange={(e) => setRestingHr(e.target.value)} placeholder="opsiyonel" />
        </div>
        <div>
          <Label>HRV (ms)</Label>
          <Input inputMode="numeric" value={hrv} onChange={(e) => setHrv(e.target.value)} placeholder="opsiyonel" />
        </div>
        <div>
          <Label>VO2max</Label>
          <Input inputMode="numeric" value={vo2max} onChange={(e) => setVo2max(e.target.value)} placeholder="opsiyonel" />
        </div>
        <Button variant="accent" accentVar="--color-kondisyon" className="w-full" onClick={handleSave}>
          Kaydet
        </Button>
      </div>
    </Sheet>
  );
}
