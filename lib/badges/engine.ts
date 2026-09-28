import { db } from "@/lib/db/schema";
import { BADGE_DEFINITIONS } from "./definitions";

/** Henüz kazanılmamış ama artık kriterleri karşılanan rozetleri işaretler. Yeni kazanılanları döndürür. */
export async function evaluateAndAwardBadges(): Promise<string[]> {
  const earned = await db.earnedBadges.toArray();
  const earnedIds = new Set(earned.map((e) => e.badgeId));
  const newly: string[] = [];

  for (const badge of BADGE_DEFINITIONS) {
    if (earnedIds.has(badge.id)) continue;
    const met = await badge.check().catch(() => false);
    if (met) {
      await db.earnedBadges.add({ id: badge.id, badgeId: badge.id, earnedAt: new Date().toISOString() });
      newly.push(badge.id);
    }
  }
  return newly;
}

export async function getEarnedBadgeIds(): Promise<Set<string>> {
  const rows = await db.earnedBadges.toArray();
  return new Set(rows.map((r) => r.badgeId));
}
