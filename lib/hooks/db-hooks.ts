"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db, SINGLETON_IDS } from "@/lib/db";

export function useSettings() {
  return useLiveQuery(() => db.settings.get(SINGLETON_IDS.SETTINGS_ID), []);
}

export function useProfile() {
  return useLiveQuery(() => db.profile.get(SINGLETON_IDS.PROFILE_ID), []);
}

export function useCigaretteSettings() {
  return useLiveQuery(() => db.cigaretteSettings.get(SINGLETON_IDS.CIGARETTE_SETTINGS_ID), []);
}

export function useNotificationSettings() {
  return useLiveQuery(() => db.notificationSettings.get(SINGLETON_IDS.NOTIFICATION_SETTINGS_ID), []);
}

export function useActiveProgram() {
  return useLiveQuery(async () => {
    const all = await db.programs.toArray();
    return all.find((p) => p.isActive) ?? null;
  }, []);
}

export function useProgramProgress(programId: string | undefined) {
  return useLiveQuery(async () => {
    if (!programId) return undefined;
    return db.programProgress.get(programId);
  }, [programId]);
}
