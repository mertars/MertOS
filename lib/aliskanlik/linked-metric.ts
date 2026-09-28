import type { LongTermGoal } from "@/lib/db/types";
import { getAllPersonalRecords } from "@/lib/programs/records";
import { clamp } from "@/lib/utils";

/** Bağlı bir metrikten (kişisel rekorlardan) otomatik ilerleme yüzdesi hesaplar. */
export async function computeLinkedMetricProgress(goal: LongTermGoal): Promise<number | null> {
  if (!goal.linkedMetric || goal.linkedMetric === "none" || !goal.linkedMetricTargetValue) return null;
  const records = await getAllPersonalRecords();

  if (goal.linkedMetric === "run_10k_under_min" || goal.linkedMetric === "run_5k_under_min") {
    const category = goal.linkedMetric === "run_10k_under_min" ? "run_10k" : "run_5k";
    const pr = records.find((r) => r.category === category);
    if (!pr) return 0;
    const targetSec = goal.linkedMetricTargetValue * 60;
    if (pr.value <= targetSec) return 100;
    return clamp(Math.round((targetSec / pr.value) * 100), 0, 100);
  }

  if (goal.linkedMetric === "longest_run_km") {
    const pr = records.find((r) => r.category === "longest_run");
    if (!pr) return 0;
    const targetM = goal.linkedMetricTargetValue * 1000;
    return clamp(Math.round((pr.value / targetM) * 100), 0, 100);
  }

  return null;
}

export const LINKED_METRIC_LABEL: Record<string, string> = {
  run_10k_under_min: "10 km'yi X dakikanın altında koş",
  run_5k_under_min: "5 km'yi X dakikanın altında koş",
  longest_run_km: "X km kesintisiz koş",
  none: "Manuel ilerleme",
};
