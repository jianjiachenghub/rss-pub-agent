import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { getRawContentDir } from "./runtime-paths.js";

export async function writeRawJson(
  date: string,
  fileName: string,
  payload: unknown
): Promise<void> {
  const dir = getRawContentDir(date);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, fileName), JSON.stringify(payload, null, 2), "utf-8");
}

export async function writeRawJsonLines<T>(
  date: string,
  fileName: string,
  items: T[]
): Promise<void> {
  const dir = getRawContentDir(date);
  await mkdir(dir, { recursive: true });
  const body = items.map((item) => JSON.stringify(item)).join("\n");
  await writeFile(join(dir, fileName), body, "utf-8");
}
