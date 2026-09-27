import type { ProgramDay } from "@/lib/db/types";
import { uid } from "@/lib/utils";

export interface Segment {
  id: string;
  label: string;
  seconds: number;
  kind: "isinma" | "calisma" | "dinlenme";
}

/** Interval gününün ısınma + sprint segment kuyruğunu oluşturur (finisher hariç). */
export function buildIntervalSegments(day: ProgramDay): Segment[] {
  const segments: Segment[] = [];
  if (day.interval) {
    segments.push({ id: uid(), label: "Isınma", seconds: day.interval.warmupMin * 60, kind: "isinma" });
    for (let i = 0; i < day.interval.rounds.count; i++) {
      segments.push({ id: uid(), label: `Sprint ${i + 1}/${day.interval.rounds.count}`, seconds: day.interval.rounds.workSec, kind: "calisma" });
      segments.push({ id: uid(), label: "Yürüyüş", seconds: day.interval.rounds.restSec, kind: "dinlenme" });
    }
  }
  return segments;
}

/** Finisher segment kuyruğu (ip atlama ya da EMOM) — hem interval hem kuvvet günlerinde kullanılır. */
export function buildFinisherSegments(day: ProgramDay): Segment[] {
  if (!day.finisher) return [];
  const segments: Segment[] = [];
  for (let i = 0; i < day.finisher.rounds; i++) {
    segments.push({ id: uid(), label: `${day.finisher.label} ${i + 1}/${day.finisher.rounds}`, seconds: day.finisher.workSec, kind: "calisma" });
    if (day.finisher.restSec > 0) {
      segments.push({ id: uid(), label: "Dinlenme", seconds: day.finisher.restSec, kind: "dinlenme" });
    }
  }
  return segments;
}

export function totalSeconds(segments: Segment[]): number {
  return segments.reduce((s, seg) => s + seg.seconds, 0);
}
