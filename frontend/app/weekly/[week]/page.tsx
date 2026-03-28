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

  return (
    <PublicationShell
      currentWeekId={weeklyIssue.weekId}
      dailyIssues={dailyIssues}
      masthead={
        <div className="w-full max-w-3xl text-center">
          <div className="font-mono text-[10px] uppercase tracking-[0.34em] text-black/45">
            Weekly Brief / Archive Composite
          </div>
          <div className="mt-2 text-sm leading-6 text-black/62">
            This weekly view is composed on the frontend from archived daily issues
            without writing back into the shared content source.
          </div>
        </div>
      }
      weeklyIssues={weeklyIssues}
    >
      <WeeklyDigest issue={weeklyIssue} />
    </PublicationShell>
  );
}
