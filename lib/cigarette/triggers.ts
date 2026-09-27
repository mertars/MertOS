import type { CigaretteTrigger } from "@/lib/db/types";

export const TRIGGER_LABELS: Record<CigaretteTrigger, string> = {
  kahve: "Kahve",
  stres: "Stres",
  yemek_sonrasi: "Yemek sonrası",
  sosyal: "Sosyal",
  can_sikintisi: "Can sıkıntısı",
  is: "İş",
  diger: "Diğer",
};

export const TRIGGER_LIST = Object.keys(TRIGGER_LABELS) as CigaretteTrigger[];
