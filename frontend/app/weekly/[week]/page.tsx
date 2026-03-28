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
  return getWeeklyIssues().map((issue) => ({ week: issue.weekId }));
}

export default async function WeeklyPage({
  params,
}: {
  params: Promise<{ week: string }>;
}) {
  const { week } = await params;
  const weeklyIssue = getWeeklyIssue(week);

  if (!weeklyIssue) notFound();

  const dailyIssues = getAllDailyIssues();
  const weeklyIssues = getWeeklyIssues();
  const headerMeta = [
    weeklyIssue.rangeLabel,
    `${weeklyIssue.issueCount} daily issues`,
    `${weeklyIssue.itemCount} stories`,
    `avg ${weeklyIssue.avgScore}`,
  ];

  return (
    <PublicationShell
      currentWeekId={weeklyIssue.weekId}
      dailyIssues={dailyIssues}
      header={{
        section: "Weekly Brief",
        title: weeklyIssue.label,
        meta: headerMeta,
      }}
      weeklyIssues={weeklyIssues}
    >
      <WeeklyDigest issue={weeklyIssue} />
    </PublicationShell>
  );
}
