"use client";

import { Droplets, Cigarette } from "lucide-react";
import { addWaterEntry, softDeleteWaterEntry } from "@/lib/db/repo/water";
import { addCigaretteEntry, softDeleteCigaretteEntry } from "@/lib/db/repo/cigarette";
import { showUndoToast } from "@/lib/store/toast-store";
import { motion } from "framer-motion";

const WATER_ML = 250;

export function QuickStrip() {
  async function handleWater() {
    const id = await addWaterEntry(WATER_ML);
    showUndoToast(`${WATER_ML} ml su eklendi`, () => softDeleteWaterEntry(id));
  }

  async function handleCigarette() {
    const id = await addCigaretteEntry();
    showUndoToast("Sigara kaydedildi", () => softDeleteCigaretteEntry(id));
  }

  return (
    <div className="flex gap-3 px-5">
      <StripButton icon={Droplets} label={`+${WATER_ML} ml Su`} colorVar="--color-su" onClick={handleWater} />
      <StripButton icon={Cigarette} label="+1 Sigara" colorVar="--color-sigara" onClick={handleCigarette} />
    </div>
  );
}

function StripButton({
  icon: Icon,
  label,
  colorVar,
  onClick,
}: {
  icon: typeof Droplets;
  label: string;
  colorVar: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="flex-1 flex items-center justify-center gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] py-3.5 min-h-11"
    >
      <Icon className="h-4 w-4" style={{ color: `var(${colorVar})` }} />
      <span className="text-[13px] font-semibold text-[var(--color-text-primary)]">{label}</span>
    </motion.button>
  );
}
