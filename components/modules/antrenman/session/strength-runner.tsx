"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { SegmentTimer } from "./segment-timer";
import type { StrengthPrescription } from "@/lib/db/types";
import { vibrate } from "@/lib/audio/beep";

export interface LoggedSet {
  exerciseId: string;
  exerciseName: string;
  setIndex: number;
  weightKg?: number;
  reps?: number;
  rpe?: number;
  restSec: number;
}

export function StrengthRunner({
  prescriptions,
  onAllComplete,
}: {
  prescriptions: StrengthPrescription[];
  onAllComplete: (sets: LoggedSet[]) => void;
}) {
  const rounds = prescriptions[0]?.sets ?? 3;
  const sequence = Array.from({ length: rounds }, (_, round) => prescriptions.map((p) => ({ ...p, round }))).flat();

  const [step, setStep] = useState(0);
  const [resting, setResting] = useState(false);
  const [logged, setLogged] = useState<LoggedSet[]>([]);
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [rpe, setRpe] = useState("");

  const current = sequence[step];
  const isLastStep = step >= sequence.length - 1;

  if (!current) return null;

  function handleLogSet() {
    const entry: LoggedSet = {
      exerciseId: current.exerciseId,
      exerciseName: current.exerciseName,
      setIndex: step,
      weightKg: weight ? Number(weight) : undefined,
      reps: reps ? Number(reps) : undefined,
      rpe: rpe ? Number(rpe) : undefined,
      restSec: current.restSec,
    };
    const next = [...logged, entry];
    setLogged(next);
    vibrate(80);
    setWeight("");
    setReps("");
    setRpe("");

    if (isLastStep) {
      onAllComplete(next);
      return;
    }
    if (current.restSec > 0) {
      setResting(true);
    } else {
      setStep((s) => s + 1);
    }
  }

  if (resting) {
    return (
      <Card className="flex flex-col items-center">
        <SegmentTimer
          segments={[{ id: "rest", label: "Dinlenme", seconds: current.restSec, kind: "dinlenme" }]}
          onComplete={() => {
            setResting(false);
            setStep((s) => s + 1);
          }}
        />
      </Card>
    );
  }

  return (
    <Card>
      <p className="text-[12px] font-medium text-[var(--color-text-secondary)] mb-1">
        Tur {current.round + 1}/{rounds} · Hareket {(step % prescriptions.length) + 1}/{prescriptions.length}
      </p>
      <p className="text-[19px] font-bold text-[var(--color-text-primary)] mb-1">{current.exerciseName}</p>
      <p className="text-[13px] text-[var(--color-text-secondary)] mb-4">Hedef: {current.reps} tekrar</p>

      <div className="grid grid-cols-3 gap-2.5 mb-4">
        <div>
          <Label>Ağırlık (kg)</Label>
          <Input inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="0" />
        </div>
        <div>
          <Label>Tekrar</Label>
          <Input inputMode="numeric" value={reps} onChange={(e) => setReps(e.target.value)} placeholder="0" />
        </div>
        <div>
          <Label>RPE</Label>
          <Input inputMode="numeric" value={rpe} onChange={(e) => setRpe(e.target.value)} placeholder="1-10" />
        </div>
      </div>

      <Button variant="accent" accentVar="--color-hareket" onClick={handleLogSet} className="w-full">
        {isLastStep ? "Son Seti Kaydet ve Bitir" : "Seti Kaydet ve Devam Et"}
      </Button>
    </Card>
  );
}
