const SHANGHAI_OFFSET_MS = 8 * 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export interface BusinessDateWindow {
  targetDate: string;
  startMs: number;
  endMs: number;
  startIso: string;
  endIso: string;
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function assertValidBusinessDate(value: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`Invalid business date "${value}". Expected YYYY-MM-DD.`);
  }
}

function formatBusinessDateFromUtcMs(utcMs: number): string {
  const shifted = new Date(utcMs + SHANGHAI_OFFSET_MS);
  return `${shifted.getUTCFullYear()}-${pad2(shifted.getUTCMonth() + 1)}-${pad2(
    shifted.getUTCDate()
  )}`;
}

export function getBusinessDate(now: Date = new Date()): string {
  return formatBusinessDateFromUtcMs(now.getTime());
}

export function getBusinessDateWindow(targetDate: string): BusinessDateWindow {
  assertValidBusinessDate(targetDate);

  const [year, month, day] = targetDate.split("-").map(Number);
  const startMs = Date.UTC(year, month - 1, day) - SHANGHAI_OFFSET_MS;
  const endMs = startMs + ONE_DAY_MS;

  return {
    targetDate,
    startMs,
    endMs,
    startIso: new Date(startMs).toISOString(),
    endIso: new Date(endMs).toISOString(),
  };
}

export function shiftBusinessDate(targetDate: string, days: number): string {
  const { startMs } = getBusinessDateWindow(targetDate);
  return formatBusinessDateFromUtcMs(startMs + days * ONE_DAY_MS);
}

export function getDefaultTargetDate(now: Date = new Date()): string {
  return shiftBusinessDate(getBusinessDate(now), -1);
}

export function getBusinessDateForTimestamp(timestamp: string | undefined): string | null {
  if (!timestamp) return null;

  const time = new Date(timestamp).getTime();
  if (!Number.isFinite(time)) return null;

  return formatBusinessDateFromUtcMs(time);
}

export function isTimestampInBusinessDate(
  timestamp: string | undefined,
  targetDate: string
): boolean {
  if (!timestamp) return false;

  const time = new Date(timestamp).getTime();
  if (!Number.isFinite(time)) return false;

  const { startMs, endMs } = getBusinessDateWindow(targetDate);
  return time >= startMs && time < endMs;
}

export function formatBusinessTime(timestamp: string | undefined): string {
  if (!timestamp) return "";

  const time = new Date(timestamp).getTime();
  if (!Number.isFinite(time)) return "";

  const shifted = new Date(time + SHANGHAI_OFFSET_MS);
  return `${pad2(shifted.getUTCHours())}:${pad2(shifted.getUTCMinutes())}`;
}
