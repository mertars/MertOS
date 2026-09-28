import { addMonths } from "date-fns";
import { db } from "@/lib/db/schema";
import type { CategoryBudget, Expense, SavingsGoal, Subscription, TransactionType } from "@/lib/db/types";
import { uid } from "@/lib/utils";
import { dateKey } from "./workouts";

// --- Gelir / Gider ---

export async function addTransaction(input: { type: TransactionType; amount: number; category: string; date?: Date; note?: string }): Promise<string> {
  const id = uid();
  const tx: Expense = {
    id,
    date: dateKey(input.date),
    amount: input.amount,
    category: input.category,
    source: "manuel",
    note: input.note,
    type: input.type,
    createdAt: new Date().toISOString(),
  };
  await db.expenses.add(tx);
  return id;
}

export async function softDeleteTransaction(id: string) {
  await db.expenses.update(id, { deletedAt: new Date().toISOString() });
}

export async function restoreTransaction(id: string) {
  await db.expenses.update(id, { deletedAt: null });
}

export async function getTransactionsInRange(start: Date, end: Date): Promise<Expense[]> {
  const rows = await db.expenses.where("date").between(dateKey(start), dateKey(end), true, true).toArray();
  return rows.filter((r) => !r.deletedAt).sort((a, b) => b.date.localeCompare(a.date));
}

export async function getAllTransactions(): Promise<Expense[]> {
  const rows = await db.expenses.toArray();
  return rows.filter((r) => !r.deletedAt).sort((a, b) => b.date.localeCompare(a.date));
}

export function summarize(transactions: Expense[]) {
  let gelir = 0;
  let gider = 0;
  for (const t of transactions) {
    if ((t.type ?? "gider") === "gelir") gelir += t.amount;
    else gider += t.amount;
  }
  return { gelir, gider, net: gelir - gider };
}

// --- Bütçe ---

export async function setCategoryBudget(category: string, monthlyLimitTl: number) {
  const existing = (await db.categoryBudgets.toArray()).find((b) => b.category === category);
  const row: CategoryBudget = { id: existing?.id ?? uid(), category, monthlyLimitTl };
  await db.categoryBudgets.put(row);
}

export async function getCategoryBudgets(): Promise<CategoryBudget[]> {
  return db.categoryBudgets.toArray();
}

export async function deleteCategoryBudget(id: string) {
  await db.categoryBudgets.delete(id);
}

// --- Abonelikler ---

export async function addSubscription(input: { name: string; amountTl: number; billingCycle: "aylik" | "yillik"; nextRenewalDate: string; category?: string }): Promise<string> {
  const id = uid();
  const sub: Subscription = { id, ...input, active: true, createdAt: new Date().toISOString() };
  await db.subscriptions.add(sub);
  return id;
}

export async function getActiveSubscriptions(): Promise<Subscription[]> {
  const rows = await db.subscriptions.toArray();
  return rows.filter((s) => s.active).sort((a, b) => a.nextRenewalDate.localeCompare(b.nextRenewalDate));
}

export async function deactivateSubscription(id: string) {
  await db.subscriptions.update(id, { active: false });
}

/** Aboneliği "ödendi" işaretler: bir gider kaydı oluşturur ve yenilenme tarihini ileri alır. */
export async function markSubscriptionPaid(id: string) {
  const sub = await db.subscriptions.get(id);
  if (!sub) return;
  await addTransaction({ type: "gider", amount: sub.amountTl, category: sub.category ?? "Abonelik", note: sub.name });
  const next = sub.billingCycle === "aylik" ? addMonths(new Date(sub.nextRenewalDate), 1) : addMonths(new Date(sub.nextRenewalDate), 12);
  await db.subscriptions.update(id, { nextRenewalDate: next.toISOString() });
}

export function daysUntil(dateIso: string): number {
  return Math.ceil((new Date(dateIso).getTime() - Date.now()) / 86_400_000);
}

// --- Birikim Hedefleri ---

export async function addSavingsGoal(input: { name: string; targetTl: number; targetDate?: string }): Promise<string> {
  const id = uid();
  const goal: SavingsGoal = { id, name: input.name, targetTl: input.targetTl, targetDate: input.targetDate, createdAt: new Date().toISOString() };
  await db.savingsGoals.add(goal);
  return id;
}

export async function getSavingsGoals(): Promise<SavingsGoal[]> {
  return db.savingsGoals.toArray();
}

export async function contributeToGoal(goalId: string, amount: number) {
  await db.savingsContributions.add({ id: uid(), goalId, amount, date: dateKey(), createdAt: new Date().toISOString() });
  const goal = await db.savingsGoals.get(goalId);
  if (goal) {
    const total = await getGoalTotal(goalId);
    if (total >= goal.targetTl && !goal.achievedAt) await db.savingsGoals.update(goalId, { achievedAt: new Date().toISOString() });
  }
}

export async function getGoalTotal(goalId: string): Promise<number> {
  const rows = await db.savingsContributions.where("goalId").equals(goalId).toArray();
  return rows.reduce((s, r) => s + r.amount, 0);
}
