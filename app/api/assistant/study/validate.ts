import type { Client } from "@libsql/client";
import { z } from "zod";
import { isValidDate, istanbulNow } from "@/lib/assistant/time";
import { listCourses } from "@/lib/server/study-repo";

// Ders/sınav uçlarının ortak doğrulaması: ders gerçekten var mı, tarih geçerli ve ileri değil mi.

export const blockEntry = z.object({
  date: z.string().refine(isValidDate),
  courseId: z.string().min(1).max(20),
  blocks: z.number().int().min(1).max(20),
  note: z.string().trim().max(200).nullable().optional(),
});

export async function knownCourse(db: Client, courseId: string): Promise<boolean> {
  return (await listCourses(db)).some((c) => c.id === courseId);
}

export function notFuture(date: string): boolean {
  return date <= istanbulNow().date;
}
