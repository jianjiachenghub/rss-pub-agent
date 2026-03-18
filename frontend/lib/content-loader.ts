import { readFileSync, existsSync } from "fs";
import { join } from "path";

const CONTENT_DIR = join(process.cwd(), "../content");

export interface DailyMeta {
  date: string;
  itemCount: number;
  categories: string[];
  avgScore: number;
  hasPodcast: boolean;
}

export function getAllDates(): string[] {
  const indexPath = join(CONTENT_DIR, "index.json");
  if (!existsSync(indexPath)) return [];
  const data = JSON.parse(readFileSync(indexPath, "utf-8"));
  return data.dates ?? [];
}

export function getDailyContent(date: string): string | null {
  const filePath = join(CONTENT_DIR, date, "daily.md");
  if (!existsSync(filePath)) return null;
  return readFileSync(filePath, "utf-8");
}

export function getDailyMeta(date: string): DailyMeta | null {
  const filePath = join(CONTENT_DIR, date, "meta.json");
  if (!existsSync(filePath)) return null;
  return JSON.parse(readFileSync(filePath, "utf-8"));
}

export function getPodcastScript(date: string): string | null {
  const filePath = join(CONTENT_DIR, date, "podcast-script.md");
  if (!existsSync(filePath)) return null;
  return readFileSync(filePath, "utf-8");
}
