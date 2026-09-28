import { db } from "@/lib/db/schema";
import type { CoachMessage, CoachRequestKind } from "@/lib/db/types";
import { uid } from "@/lib/utils";
import { startOfLocalDayIso, endOfLocalDayIso } from "./water";

export async function addCoachMessage(role: "user" | "assistant", content: string, kind?: CoachRequestKind): Promise<string> {
  const id = uid();
  const entry: CoachMessage = { id, role, content, kind, createdAt: new Date().toISOString() };
  await db.coachMessages.add(entry);
  return id;
}

export async function getAllCoachMessages(): Promise<CoachMessage[]> {
  const rows = await db.coachMessages.orderBy("createdAt").toArray();
  return rows;
}

export async function getTodayCoachRequestCount(): Promise<number> {
  const rows = await db.coachMessages.where("createdAt").between(startOfLocalDayIso(), endOfLocalDayIso(), true, true).toArray();
  return rows.filter((r) => r.role === "assistant").length;
}

export async function hasGeneratedToday(kind: CoachRequestKind): Promise<boolean> {
  const rows = await db.coachMessages.where("createdAt").between(startOfLocalDayIso(), endOfLocalDayIso(), true, true).toArray();
  return rows.some((r) => r.kind === kind);
}

export async function hasGeneratedThisWeek(kind: CoachRequestKind): Promise<boolean> {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const rows = await db.coachMessages.where("createdAt").aboveOrEqual(weekAgo.toISOString()).toArray();
  return rows.some((r) => r.kind === kind);
}
