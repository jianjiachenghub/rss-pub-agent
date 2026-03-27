import { existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function resolveRepoSubdir(name: string): string {
  // Support both direct TS execution from `scripts/` and compiled JS execution from `scripts/dist/`.
  const candidates = [join(__dirname, `../../${name}`), join(__dirname, `../../../${name}`)];
  return candidates.find((candidate) => existsSync(candidate)) ?? candidates[0];
}

export const CONTENT_DIR = resolveRepoSubdir("content");
export const CONFIGS_DIR = resolveRepoSubdir("configs");
export const RUNTIME_DIR = resolveRepoSubdir(".runtime");

export function getContentDayDir(date: string): string {
  return join(CONTENT_DIR, date);
}

export function getRawContentDir(date: string): string {
  return join(getContentDayDir(date), "raw");
}

export function getDeliveryRecordPath(date: string): string {
  return join(RUNTIME_DIR, "delivery", `${date}.json`);
}
