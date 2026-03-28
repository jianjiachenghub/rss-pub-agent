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
    `${weeklyIssue.issueCount} 期日更`,
    `${weeklyIssue.itemCount} 条资讯`,
    `均分 ${weeklyIssue.avgScore}`,
  ];

  return (
    <PublicationShell
      currentWeekId={weeklyIssue.weekId}
      dailyIssues={dailyIssues}
      header={{
        section: "本周综览",
        title: weeklyIssue.label,
        meta: headerMeta,
      }}
      weeklyIssues={weeklyIssues}
    >
      <WeeklyDigest issue={weeklyIssue} />
    </PublicationShell>
  );
}
