import { notFound } from "next/navigation";
import PublicationShell from "@/components/PublicationShell";
import WeeklyDigest from "@/components/WeeklyDigest";
import {
  getAllDailyIssues,
  getWeeklyIssue,
  getWeeklyIssues,
} from "@/lib/content-loader";

export const dynamicParams = false;

export async function generateStaticParams() {
  return getWeeklyIssues("en").map((issue) => ({ week: issue.weekId }));
}

export default async function EnglishWeeklyPage({
  params,
}: {
  params: Promise<{ week: string }>;
}) {
  const { week } = await params;
  const weeklyIssue = getWeeklyIssue(week, "en");

  if (!weeklyIssue) notFound();

  const dailyIssues = getAllDailyIssues("en");
  const weeklyIssues = getWeeklyIssues("en");

  return (
    <PublicationShell
      locale="en"
      currentWeekId={weeklyIssue.weekId}
      dailyIssues={dailyIssues}
      weeklyIssues={weeklyIssues}
    >
      <WeeklyDigest locale="en" issue={weeklyIssue} />
    </PublicationShell>
  );
}
