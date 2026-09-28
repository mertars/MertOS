import { db } from "@/lib/db/schema";
import type { Book, GratitudeEntry, JournalEntry, MoodEntry, ReadingLog } from "@/lib/db/types";
import { uid } from "@/lib/utils";
import { startOfLocalDayIso, endOfLocalDayIso } from "./water";
import { dateKey } from "./workouts";

// --- Ruh Hali / Enerji / Stres ---

export async function addMoodEntry(input: { mood: number; energy: number; stress: number; note?: string }): Promise<string> {
  const id = uid();
  const entry: MoodEntry = {
    id,
    at: new Date().toISOString(),
    mood: input.mood as 1 | 2 | 3 | 4 | 5,
    energy: input.energy as 1 | 2 | 3 | 4 | 5,
    stress: input.stress as 1 | 2 | 3 | 4 | 5,
    note: input.note,
    createdAt: new Date().toISOString(),
  };
  await db.moodEntries.add(entry);
  return id;
}

export async function softDeleteMoodEntry(id: string) {
  await db.moodEntries.update(id, { deletedAt: new Date().toISOString() });
}

export async function restoreMoodEntry(id: string) {
  await db.moodEntries.update(id, { deletedAt: null });
}

export async function getMoodEntriesForDate(date: Date = new Date()) {
  const rows = await db.moodEntries.where("at").between(startOfLocalDayIso(date), endOfLocalDayIso(date), true, true).toArray();
  return rows.filter((r) => !r.deletedAt).sort((a, b) => a.at.localeCompare(b.at));
}

export async function getMoodEntriesInRange(start: Date, end: Date) {
  const rows = await db.moodEntries.where("at").between(start.toISOString(), end.toISOString(), true, true).toArray();
  return rows.filter((r) => !r.deletedAt);
}

// --- Günlük (journal) ---

export async function addJournalEntry(text: string, prompt?: string): Promise<string> {
  const id = uid();
  const now = new Date().toISOString();
  const entry: JournalEntry = { id, date: dateKey(), text, prompt, createdAt: now, updatedAt: now };
  await db.journalEntries.add(entry);
  return id;
}

export async function updateJournalEntry(id: string, text: string) {
  await db.journalEntries.update(id, { text, updatedAt: new Date().toISOString() });
}

export async function softDeleteJournalEntry(id: string) {
  await db.journalEntries.update(id, { deletedAt: new Date().toISOString() });
}

export async function restoreJournalEntry(id: string) {
  await db.journalEntries.update(id, { deletedAt: null });
}

export async function getAllJournalEntries(): Promise<JournalEntry[]> {
  const rows = await db.journalEntries.orderBy("date").reverse().toArray();
  return rows.filter((r) => !r.deletedAt);
}

// --- Minnettarlık ---

export async function addGratitudeEntry(items: string[]): Promise<string> {
  const id = uid();
  const entry: GratitudeEntry = { id, date: dateKey(), items: items.filter(Boolean), createdAt: new Date().toISOString() };
  await db.gratitudeEntries.add(entry);
  return id;
}

export async function getGratitudeEntryForToday(): Promise<GratitudeEntry | undefined> {
  const rows = await db.gratitudeEntries.where("date").equals(dateKey()).toArray();
  return rows[0];
}

export async function getAllGratitudeEntries(): Promise<GratitudeEntry[]> {
  const rows = await db.gratitudeEntries.orderBy("date").reverse().toArray();
  return rows;
}

// --- Okuma ---

export async function addBook(input: { title: string; author?: string; totalPages?: number }): Promise<string> {
  const id = uid();
  const now = new Date().toISOString();
  const book: Book = { id, title: input.title, author: input.author, totalPages: input.totalPages, currentPage: 0, status: "okunuyor", startedAt: now, createdAt: now };
  await db.books.add(book);
  return id;
}

export async function updateBookProgress(bookId: string, page: number) {
  const book = await db.books.get(bookId);
  if (!book) return;
  const patch: Partial<Book> = { currentPage: page };
  if (book.totalPages && page >= book.totalPages) {
    patch.status = "bitti";
    patch.finishedAt = new Date().toISOString();
  }
  await db.books.update(bookId, patch);
  await db.readingLogs.add({ id: uid(), bookId, page, at: new Date().toISOString() } satisfies ReadingLog);
}

export async function setBookStatus(bookId: string, status: Book["status"]) {
  await db.books.update(bookId, { status, finishedAt: status === "bitti" ? new Date().toISOString() : undefined });
}

export async function getAllBooks(): Promise<Book[]> {
  const rows = await db.books.toArray();
  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
