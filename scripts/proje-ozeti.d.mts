export type TaskStatus = "bitti" | "devam" | "bekliyor";
export function parseTasks(text: string): { title: string; status: TaskStatus }[] | null;
export function parseHeadings(text: string): string[];
export function repoFromRemote(url: string): string | null;
export function summarizeFolder(
  dir: string,
  repoArg?: string,
): { repo: string | null; tasks: { title: string; status: TaskStatus }[] | null; stateHeadings: string[] | null; dirtyCount: number | null; branch: string | null; fetchedAt: string };
