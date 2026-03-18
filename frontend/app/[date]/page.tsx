import { getAllDates, getDailyContent, getDailyMeta, getGroupedByYear } from "@/lib/content-loader";
import Sidebar from "@/components/Sidebar";
import DailyReport from "@/components/DailyReport";
import { notFound } from "next/navigation";

export const dynamicParams = false;

export async function generateStaticParams() {
  return getAllDates().map((date) => ({ date }));
}

export default async function DailyPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  const content = getDailyContent(date);
  if (!content) notFound();

  const meta = getDailyMeta(date);
  const years = getGroupedByYear();

  return (
    <>
      <Sidebar currentDate={date} years={years} />
      <main className="flex-1 p-6 md:p-10 max-w-4xl mx-auto overflow-y-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">{date} · 日报</h1>
          {meta && (
            <div className="flex gap-4 mt-2 text-sm text-gray-500">
              <span>{meta.itemCount} 条精选</span>
              <span>均分 {meta.avgScore}</span>
              {meta.hasPodcast && <span>🎙 有播客</span>}
            </div>
          )}
        </div>
        <DailyReport content={content} />
      </main>
    </>
  );
}
