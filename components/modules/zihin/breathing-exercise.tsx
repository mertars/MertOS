"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

type Phase = "hazir" | "nefes-al" | "tut" | "nefes-ver";

const PHASE_SECONDS: Record<Phase, number> = { hazir: 0, "nefes-al": 4, tut: 7, "nefes-ver": 8 };
const PHASE_LABEL: Record<Phase, string> = { hazir: "Başlamaya hazır ol", "nefes-al": "Nefes al", tut: "Tut", "nefes-ver": "Ver" };
const PHASE_SCALE: Record<Phase, number> = { hazir: 0.8, "nefes-al": 1.3, tut: 1.3, "nefes-ver": 0.8 };
const NEXT_PHASE: Record<Phase, Phase> = { hazir: "nefes-al", "nefes-al": "tut", tut: "nefes-ver", "nefes-ver": "nefes-al" };

/** Basit 4-7-8 nefes egzersizi — stres anında sakinleşmek için. */
export function BreathingExercise() {
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<Phase>("hazir");
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setSeconds((s) => {
        if (s > 1) return s - 1;
        setPhase((p) => NEXT_PHASE[p]);
        return PHASE_SECONDS[NEXT_PHASE[phase]];
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running, phase]);

  function start() {
    setPhase("nefes-al");
    setSeconds(PHASE_SECONDS["nefes-al"]);
    setRunning(true);
  }

  function stop() {
    setRunning(false);
    setPhase("hazir");
  }

  return (
    <div className="flex flex-col items-center gap-5 py-4">
      <div className="relative flex h-40 w-40 items-center justify-center">
        <motion.div
          className="absolute rounded-full bg-[var(--color-zihin)]/25 border border-[var(--color-zihin)]"
          animate={{ scale: running ? PHASE_SCALE[phase] : 0.8 }}
          transition={{ duration: running ? PHASE_SECONDS[phase] || 1 : 0.4, ease: "easeInOut" }}
          style={{ width: 120, height: 120 }}
        />
        <span className="relative text-[13px] font-semibold text-[var(--color-text-primary)]">{running ? seconds : ""}</span>
      </div>
      <p className="text-[13px] font-medium text-[var(--color-text-secondary)]">{running ? PHASE_LABEL[phase] : "4-7-8 nefes egzersizi"}</p>
      <Button variant={running ? "secondary" : "accent"} accentVar="--color-zihin" onClick={running ? stop : start}>
        {running ? "Durdur" : "Başlat"}
      </Button>
    </div>
  );
}
