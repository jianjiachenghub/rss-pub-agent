import type { DailyReport, Podcast } from "@/types";

const API_BASE = import.meta.env.VITE_API_URL || "";

export async function fetchDailyReports(): Promise<
  { date: string; title: string; summary: string; itemCount: number }[]
> {
  const response = await fetch(`${API_BASE}/api/reports`);
  if (!response.ok) {
    throw new Error("Failed to fetch reports");
  }
  const data = await response.json();
  return data.reports;
}

export async function fetchDailyReport(date: string): Promise<DailyReport> {
  const response = await fetch(`${API_BASE}/api/reports/${date}`);
  if (!response.ok) {
    throw new Error("Failed to fetch report");
  }
  const data = await response.json();
  return data;
}

export async function fetchPodcast(date: string): Promise<Podcast> {
  const response = await fetch(`${API_BASE}/api/podcast/${date}`);
  if (!response.ok) {
    throw new Error("Failed to fetch podcast");
  }
  const data = await response.json();
  return data;
}
