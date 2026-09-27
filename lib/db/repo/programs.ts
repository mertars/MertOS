import { db } from "@/lib/db/schema";
import type { Program, ProgramDay, ProgramProgress, ProgramWeek } from "@/lib/db/types";
import { uid } from "@/lib/utils";

export async function getAllPrograms(): Promise<Program[]> {
  return db.programs.toArray();
}

export async function setActiveProgram(programId: string) {
  await db.transaction("rw", db.programs, db.programProgress, async () => {
    const all = await db.programs.toArray();
    await Promise.all(all.map((p) => db.programs.update(p.id, { isActive: p.id === programId })));

    const existingProgress = await db.programProgress.get(programId);
    if (!existingProgress) {
      const progress: ProgramProgress = {
        id: programId,
        programId,
        startedAt: new Date().toISOString(),
        currentWeek: 1,
        adjustments: [],
        updatedAt: new Date().toISOString(),
      };
      await db.programProgress.add(progress);
    }
  });
}

export async function createCustomProgram(name: string, description: string, days: Omit<ProgramDay, "id">[]): Promise<string> {
  const id = uid();
  const now = new Date().toISOString();
  const week: ProgramWeek = {
    weekNumber: 1,
    isDeload: false,
    focus: "Özel program",
    days: days.map((d) => ({ ...d, id: uid() })),
  };
  const program: Program = {
    id,
    name,
    description,
    weeks: [week],
    isCustom: true,
    isActive: false,
    createdAt: now,
    updatedAt: now,
  };
  await db.programs.add(program);
  return id;
}

export async function deleteCustomProgram(id: string) {
  const program = await db.programs.get(id);
  if (!program || !program.isCustom) return;
  await db.programs.delete(id);
  await db.programProgress.delete(id);
}
