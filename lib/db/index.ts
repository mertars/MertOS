import { db } from "./schema";
import type { AppSettings, CigaretteSettings, Profile, ProgramProgress } from "./types";
import { MODULES } from "@/lib/registry/modules";
import { KONDISYON_8_HAFTA } from "@/lib/programs/kondisyon-8-hafta";

export { db } from "./schema";
export * from "./types";

const PROFILE_ID = "me";
const SETTINGS_ID = "app";
const CIGARETTE_SETTINGS_ID = "sigara";

export const SINGLETON_IDS = { PROFILE_ID, SETTINGS_ID, CIGARETTE_SETTINGS_ID };

function nowIso() {
  return new Date().toISOString();
}

function defaultProfile(): Profile {
  return {
    id: PROFILE_ID,
    name: "Mert",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
}

function defaultSettings(): AppSettings {
  const moduleToggles: Record<string, boolean> = {};
  for (const m of MODULES) moduleToggles[m.id] = m.enabledByDefault;
  return {
    id: SETTINGS_ID,
    theme: "koyu",
    unitSystem: "metrik",
    pinEnabled: false,
    moduleToggles,
    scoreWeights: { hareket: 0.4, yakit: 0.2, temiz: 0.25, zihin: 0.15 },
    dashboardCardOrder: ["skor", "siradaki", "hizli-seritler", "sigara", "hub-grid"],
    dashboardCardHidden: [],
    onboardingDone: false,
    updatedAt: nowIso(),
  };
}

function defaultCigaretteSettings(): CigaretteSettings {
  return {
    id: CIGARETTE_SETTINGS_ID,
    packPrice: 90,
    cigsPerPack: 20,
    baselineAvgPerDay: 10,
    quitMode: false,
    trainingProtectionEnabled: true,
    trainingProtectionWindowMin: 150,
    minGapMinutesGoal: 90,
    goalItems: [
      { id: "kulaklik", label: "Kablosuz Kulaklık", priceTl: 4500 },
      { id: "kosu-ayakkabisi", label: "Yeni Koşu Ayakkabısı", priceTl: 3500 },
      { id: "hafta-sonu-kacamagi", label: "Hafta Sonu Kaçamağı", priceTl: 6000 },
    ],
    updatedAt: nowIso(),
  };
}

/**
 * Uygulama ilk açıldığında (veya IndexedDB temizlendiğinde) gerekli tekil
 * kayıtları ve gömülü 8 haftalık programı oluşturur. Idempotent'tir.
 */
export async function ensureDefaults() {
  await db.transaction(
    "rw",
    db.profile,
    db.settings,
    db.cigaretteSettings,
    db.programs,
    db.programProgress,
    async () => {
      const profile = await db.profile.get(PROFILE_ID);
      if (!profile) await db.profile.add(defaultProfile());

      const settings = await db.settings.get(SETTINGS_ID);
      if (!settings) {
        await db.settings.add(defaultSettings());
      } else {
        // Registry'ye yeni modül eklendiyse toggle listesine ekle (geriye dönük uyumluluk).
        let changed = false;
        const toggles = { ...settings.moduleToggles };
        for (const m of MODULES) {
          if (!(m.id in toggles)) {
            toggles[m.id] = m.enabledByDefault;
            changed = true;
          }
        }
        if (changed) await db.settings.update(SETTINGS_ID, { moduleToggles: toggles });
      }

      const cigSettings = await db.cigaretteSettings.get(CIGARETTE_SETTINGS_ID);
      if (!cigSettings) await db.cigaretteSettings.add(defaultCigaretteSettings());

      const allPrograms = await db.programs.toArray();
      const activeProgram = allPrograms.find((p) => p.isActive);
      const anyEmbedded = allPrograms.find((p) => p.id === KONDISYON_8_HAFTA.id);
      if (!anyEmbedded) {
        const isActive = !activeProgram;
        await db.programs.add({ ...KONDISYON_8_HAFTA, isActive });
        if (isActive) {
          const progressRow: ProgramProgress = {
            id: KONDISYON_8_HAFTA.id,
            programId: KONDISYON_8_HAFTA.id,
            startedAt: nowIso(),
            currentWeek: 1,
            adjustments: [],
            updatedAt: nowIso(),
          };
          await db.programProgress.add(progressRow);
        }
      }
    },
  );
}

export async function getSettings(): Promise<AppSettings> {
  const s = await db.settings.get(SETTINGS_ID);
  if (s) return s;
  const d = defaultSettings();
  await db.settings.add(d);
  return d;
}

export async function getProfile(): Promise<Profile> {
  const p = await db.profile.get(PROFILE_ID);
  if (p) return p;
  const d = defaultProfile();
  await db.profile.add(d);
  return d;
}

export async function getCigaretteSettings(): Promise<CigaretteSettings> {
  const s = await db.cigaretteSettings.get(CIGARETTE_SETTINGS_ID);
  if (s) return s;
  const d = defaultCigaretteSettings();
  await db.cigaretteSettings.add(d);
  return d;
}
