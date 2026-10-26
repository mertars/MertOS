export type TaskStatus = "bitti" | "devam" | "bekliyor";
export function parseTasks(text: string): { title: string; status: TaskStatus }[] | null;
export function parseHeadings(text: string): string[];
export function repoFromRemote(url: string): string | null;
