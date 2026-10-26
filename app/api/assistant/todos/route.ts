import { NextResponse } from "next/server";
import { z } from "zod";
import { istanbulNow } from "@/lib/assistant/time";
import { getDb } from "@/lib/server/db";
import { errorResponse } from "@/lib/server/http";
import { addTodo, listTodos } from "@/lib/server/todo-repo";

const DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** Yapılacaklar — varsayılan bugün. `?from=YYYY-MM-DD&to=YYYY-MM-DD` */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const today = istanbulNow().date;
  const from = DATE.safeParse(url.searchParams.get("from")).data ?? today;
  const to = DATE.safeParse(url.searchParams.get("to")).data ?? from;
  try {
    return NextResponse.json({ todos: await listTodos(await getDb(), from, to) });
  } catch (e) {
    return errorResponse(e);
  }
}

const bodySchema = z.object({
  title: z.string().trim().min(1).max(80),
  date: DATE.optional(),
  time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .nullable()
    .optional(),
});

/** Bugün ekranından elle ekleme. */
export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Geçersiz madde." }, { status: 400 });
  try {
    const todo = await addTodo(await getDb(), { title: parsed.data.title, date: parsed.data.date ?? istanbulNow().date, time: parsed.data.time ?? null });
    return NextResponse.json({ todo });
  } catch (e) {
    return errorResponse(e);
  }
}
