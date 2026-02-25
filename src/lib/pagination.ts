export const DEFAULT_PAGE_SIZE = 20;

export function encodeCursor(date: Date): string {
  return Buffer.from(date.toISOString()).toString("base64");
}

export function parseCursor(cursor: string): Date | null {
  try {
    const decoded = Buffer.from(cursor, "base64").toString("utf-8");
    const date = new Date(decoded);
    if (isNaN(date.getTime())) return null;
    return date;
  } catch {
    return null;
  }
}
