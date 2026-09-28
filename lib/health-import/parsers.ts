import { healthImportPayloadSchema, type HealthImportPayload } from "./schema";

export class HealthImportError extends Error {}

const WORKOUT_NAME_MAP: Record<string, HealthImportPayload["workouts"][number]["type"]> = {
  running: "kosu",
  run: "kosu",
  walking: "yuruyus",
  walk: "yuruyus",
  "functional strength training": "kuvvet",
  "traditional strength training": "kuvvet",
  "high intensity interval training": "interval",
  hiit: "interval",
  soccer: "halisaha",
  football: "halisaha",
  "jump rope": "ip_atlama",
  other: "serbest",
};

type Json = Record<string, unknown>;

function obj(v: unknown): Json | undefined {
  return v && typeof v === "object" ? (v as Json) : undefined;
}

function arr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function str(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

/** Bir metrik satırının/nesnesinin `.qty` (ya da doğrudan sayısal) değerini okur. */
function qty(v: unknown): number | undefined {
  const o = obj(v);
  if (o && "qty" in o) return Number(o.qty);
  if (typeof v === "number") return v;
  return undefined;
}

function toMs(v: unknown): number | null {
  const s = str(v);
  if (!s) return null;
  const t = new Date(s.replace(" ", "T")).getTime();
  return Number.isNaN(t) ? null : t;
}

/** Health Auto Export'un yaygın JSON dışa aktarma şeklini normalize şemaya çevirir (best-effort). */
function fromHealthAutoExport(raw: unknown): HealthImportPayload {
  const root = obj(raw);
  const data = obj(root?.data);
  const metrics = arr(data?.metrics ?? root?.metrics).map((m) => obj(m)).filter((m): m is Json => Boolean(m));
  const workoutsRaw = arr(data?.workouts ?? root?.workouts).map((w) => obj(w)).filter((w): w is Json => Boolean(w));

  function metricRows(name: string): Json[] {
    const found = metrics.find((m) => m.name === name);
    return arr(found?.data).map((r) => obj(r)).filter((r): r is Json => Boolean(r));
  }
  function latestQty(name: string): number | undefined {
    const rows = metricRows(name);
    return rows.length > 0 ? qty(rows[rows.length - 1]) : undefined;
  }
  function sumQty(name: string): number | undefined {
    const rows = metricRows(name);
    if (rows.length === 0) return undefined;
    return rows.reduce((s, r) => s + (qty(r) ?? 0), 0);
  }

  const workouts = workoutsRaw
    .map((w) => {
      const startMs = toMs(w.start);
      const endMs = toMs(w.end);
      if (!startMs) return null;
      const durationSec = w.duration != null ? Number(w.duration) : endMs ? Math.round((endMs - startMs) / 1000) : undefined;
      if (!durationSec) return null;
      const distanceKm = qty(w.distance);
      return {
        type: WORKOUT_NAME_MAP[String(w.name ?? "").toLowerCase()] ?? "serbest",
        startedAt: new Date(startMs).toISOString(),
        durationSec,
        distanceM: distanceKm ? Math.round(distanceKm * 1000) : undefined,
        avgHr: qty(w.avgHeartRate),
        maxHr: qty(w.maxHeartRate),
      };
    })
    .filter((w): w is NonNullable<typeof w> => w !== null);

  const sleepRows = metricRows("sleep_analysis");
  const lastSleep = sleepRows[sleepRows.length - 1];
  const toMin = (v: unknown) => (v != null ? Math.round(Number(v) * 60) : undefined);
  const sleep = lastSleep
    ? {
        bedTime: str(lastSleep.sleepStart ?? lastSleep.startDate ?? lastSleep.date) ?? "",
        wakeTime: str(lastSleep.sleepEnd ?? lastSleep.endDate ?? lastSleep.date) ?? "",
        durationMin: toMin(lastSleep.asleep),
        deepMin: toMin(lastSleep.deep),
        remMin: toMin(lastSleep.rem),
        lightMin: toMin(lastSleep.core),
        awakeMin: toMin(lastSleep.awake),
      }
    : undefined;

  return healthImportPayloadSchema.parse({
    source: "health-auto-export",
    workouts,
    steps: sumQty("step_count"),
    activeEnergyKcal: sumQty("active_energy"),
    restingHr: latestQty("resting_heart_rate"),
    hrv: latestQty("heart_rate_variability"),
    vo2max: latestQty("vo2_max"),
    weightKg: latestQty("weight_body_mass"),
    sleep: sleep && sleep.bedTime && sleep.wakeTime ? sleep : undefined,
  });
}

// healthImportPayloadSchema'nın her alanı optional/defaultlı olduğu için boş bir obje
// bile onu "geçer" — bu yüzden doğrudan formatı denemeden önce en az bir tanıdık
// üst-seviye alanın gerçekten var olduğunu kontrol ediyoruz (yoksa Health Auto Export
// gibi `data.metrics`/`data.workouts` altında iç içe geçmiş formatlar hiç denenmeden
// sessizce boş bir sonuçla eşleşirdi).
const DIRECT_FORMAT_KEYS = ["source", "workouts", "steps", "activeEnergyKcal", "restingHr", "hrv", "vo2max", "weightKg", "sleep"] as const;

function looksLikeDirectFormat(raw: unknown): boolean {
  const o = obj(raw);
  return o != null && DIRECT_FORMAT_KEYS.some((k) => k in o);
}

/** Ham JSON'u (herhangi bir kaynaktan) normalize edilmiş içe aktarma şemasına çevirir. */
export function parseHealthImportInput(rawText: string): HealthImportPayload {
  let raw: unknown;
  try {
    raw = JSON.parse(rawText);
  } catch {
    throw new HealthImportError("Bu metin geçerli bir JSON değil. Kestirmenin çıktısını kontrol et.");
  }

  if (looksLikeDirectFormat(raw)) {
    const direct = healthImportPayloadSchema.safeParse(raw);
    if (direct.success) return direct.data;
  }

  try {
    return fromHealthAutoExport(raw);
  } catch {
    throw new HealthImportError(
      "Veri MertOS Sync ya da Health Auto Export formatına uymuyor. README'deki JSON şablonunu kontrol et.",
    );
  }
}
