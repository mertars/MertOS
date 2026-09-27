import { db, SINGLETON_IDS } from "@/lib/db";
import { generateSalt, hashPin } from "./crypto";

export async function setPin(pin: string) {
  const salt = generateSalt();
  const pinHash = await hashPin(pin, salt);
  await db.settings.update(SINGLETON_IDS.SETTINGS_ID, {
    pinEnabled: true,
    pinHash,
    pinSalt: salt,
    pinLength: pin.length,
    updatedAt: new Date().toISOString(),
  });
}

export async function disablePin() {
  await db.settings.update(SINGLETON_IDS.SETTINGS_ID, {
    pinEnabled: false,
    pinHash: undefined,
    pinSalt: undefined,
    pinLength: undefined,
    updatedAt: new Date().toISOString(),
  });
}
