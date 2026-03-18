import { getAllDates, getDailyContent, getDailyMeta } from "@/lib/content-loader";
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

  return (
    <>
      <Sidebar currentDate={date} />
      <main className="flex-1 p-6 md:p-10 max-w-4xl mx-auto overflow-y-auto">
        {meta && (
          <div className="flex gap-4 mb-6 text-sm text-gray-500">
            <span>{meta.itemCount} 条精选</span>
            <span>均分 {meta.avgScore}</span>
            {meta.hasPodcast && <span>有播客</span>}
          </div>
        )}
        <DailyReport content={content} />
      </main>
    </>
  );
}
