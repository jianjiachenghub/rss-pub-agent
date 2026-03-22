import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Calendar, ChevronRight, BarChart3 } from "lucide-react";
import { fetchWeeklyReportList } from "@/lib/markdown";
import { formatDate } from "@/lib/utils";
import { ProgressiveReveal } from "@/components/stream-content";

export const Route = createFileRoute("/weekly")({
  component: WeeklyComponent,
});

function WeeklyComponent() {
  const { data: reports, isLoading } = useQuery({
    queryKey: ["weekly-reports"],
    queryFn: fetchWeeklyReportList,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-[#f5f5f5] rounded w-48 animate-pulse" />
        <div className="h-4 bg-[#f5f5f5] rounded w-96 animate-pulse" />
        <div className="grid gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 bg-[#f5f5f5] rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!reports?.length) {
    return (
      <div className="text-center py-24">
        <BarChart3 className="h-12 w-12 text-[#d4d4d4] mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-[#111111] mb-2">暂无周报</h2>
        <p className="text-[#666666]">周报将在每周日自动生成</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="space-y-3">
        <h1 className="text-3xl font-bold text-[#111111] tracking-tight">
          AI 周报
        </h1>
        <p className="text-[#666666] text-lg">
          每周深度复盘，洞察 AI 行业趋势
        </p>
      </div>

      {/* Weekly Cards */}
      <ProgressiveReveal delay={100} className="grid gap-4">
        {reports.map((report) => (
          <div
            key={report.week}
            className="group"
          >
            <div className="p-6 bg-[#fafafa] hover:bg-[#f5f5f5] rounded-xl border border-[#e5e5e5] hover:border-[#d4d4d4] transition-all duration-200 hover-lift">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2 text-sm text-[#666666]">
                    <Calendar className="h-4 w-4" />
                    <span>第 {report.week} 周</span>
                    <span className="text-[#d4d4d4]">·</span>
                    <span>{formatDate(report.startDate)} - {formatDate(report.endDate)}</span>
                  </div>
                  <h2 className="text-xl font-semibold text-[#111111] group-hover:text-[#0070f3] transition-colors">
                    {report.title}
                  </h2>
                  <p className="text-[#666666] line-clamp-2">
                    {report.summary}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-[#666666]">
                    <span>{report.dailyCount} 篇日报</span>
                    <span>{report.highlightCount} 条精选</span>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-[#a3a3a3] group-hover:text-[#111111] group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          </div>
        ))}
      </ProgressiveReveal>
    </div>
  );
}
