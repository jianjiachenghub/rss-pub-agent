import { existsSync } from "fs";
import { readFile } from "fs/promises";
import { join } from "path";
import type {
  CoverageStats,
  EditorialAgenda,
  EventCandidate,
  FetchCheckpoint,
  FetchMetrics,
  RawNewsItem,
} from "./types.js";
import { getRawContentDir } from "./runtime-paths.js";

async function readJsonFile<T>(path: string): Promise<T> {
  const raw = await readFile(path, "utf-8");
  return JSON.parse(raw) as T;
}

export function rawSnapshotExists(date: string, fileName: string): boolean {
  return existsSync(join(getRawContentDir(date), fileName));
}

export async function readRawJson<T>(
  date: string,
  fileName: string
): Promise<T> {
  return readJsonFile<T>(join(getRawContentDir(date), fileName));
}

export async function readRawJsonLines<T>(
  date: string,
  fileName: string
): Promise<T[]> {
  const path = join(getRawContentDir(date), fileName);
  const raw = await readFile(path, "utf-8");
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as T);
}

export async function readPrimaryRawItems(date: string): Promise<RawNewsItem[]> {
  return readRawJsonLines<RawNewsItem>(date, "folo-list.jsonl");
}

export async function readEventCandidates(
  date: string
): Promise<EventCandidate[]> {
  return readRawJson<EventCandidate[]>(date, "event-candidates.json");
}

export async function readCoverageStats(date: string): Promise<CoverageStats> {
  return readRawJson<CoverageStats>(date, "coverage-stats.json");
}

export async function readFetchMetrics(date: string): Promise<FetchMetrics> {
  return readRawJson<FetchMetrics>(date, "fetch-metrics.json");
}

export async function readFetchCheckpoint(
  date: string
): Promise<FetchCheckpoint> {
  return readRawJson<FetchCheckpoint>(date, "checkpoint.json");
}

export async function readRawCandidates(date: string): Promise<RawNewsItem[]> {
  return readRawJson<RawNewsItem[]>(date, "raw-candidates.json");
}

export async function readEditorialAgenda(
  date: string
): Promise<EditorialAgenda> {
  return readRawJson<EditorialAgenda>(date, "editorial-agenda.json");
}
