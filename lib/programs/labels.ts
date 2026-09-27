import { Activity, Dumbbell, Footprints, Gauge, Shuffle, Timer, Zap, type LucideIcon } from "lucide-react";
import type { WorkoutType } from "@/lib/db/types";

export const KIND_LABEL: Record<WorkoutType, string> = {
  kosu: "Koşu",
  interval: "Interval",
  kuvvet: "Kuvvet",
  halisaha: "Halısaha",
  yuruyus: "Yürüyüş",
  ip_atlama: "İp Atlama",
  serbest: "Serbest",
};

export const KIND_ICON: Record<WorkoutType, LucideIcon> = {
  kosu: Footprints,
  interval: Zap,
  kuvvet: Dumbbell,
  halisaha: Gauge,
  yuruyus: Activity,
  ip_atlama: Timer,
  serbest: Shuffle,
};

export const FEEL_LABEL: Record<number, string> = {
  1: "Çok kolay",
  2: "Kolay",
  3: "Orta",
  4: "Zor",
  5: "Çok zor",
};
