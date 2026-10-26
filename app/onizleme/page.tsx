import { DesignPreview, type PreviewScreen } from "@/components/fx/preview";
import type { EffectLevel } from "@/lib/assistant/config";

// Faz 3 tasarım önizlemesi (onay için). Giriş gerektirir (proxy.ts).
// ?ekran=bugun|asistan  ?efekt=tam|orta|dusuk|kapali  ?mic=konusuyor
const LEVELS: EffectLevel[] = ["tam", "orta", "dusuk", "kapali"];

export default async function OnizlemePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const q = await searchParams;
  const screen: PreviewScreen = q.ekran === "asistan" ? "asistan" : "bugun";
  const efekt = LEVELS.includes(q.efekt as EffectLevel) ? (q.efekt as EffectLevel) : undefined;
  return <DesignPreview screen={screen} efekt={efekt} speaking={q.mic === "konusuyor"} />;
}
