import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Calendar, Headphones, ExternalLink } from "lucide-react";
import { fetchReport } from "@/lib/markdown";
import { formatDate } from "@/lib/utils";
import { ProgressiveReveal } from "@/components/stream-content";

export const Route = createFileRoute("/$date")({
  component: DailyReportComponent,
  loader: ({ params }) => ({ date: params.date }),
});

function DailyReportComponent() {
  const loaderData = Route.useLoaderData();
  const date = loaderData?.date || "";
  
  const { data: report, isLoading } = useQuery({
    queryKey: ["report", date],
    queryFn: () => fetchReport(date),
  });

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-8 bg-[#f5f5f5] rounded w-64" />
        <div className="h-4 bg-[#f5f5f5] rounded w-full max-w-2xl" />
        <div className="h-32 bg-[#f5f5f5] rounded-xl" />
        <div className="h-64 bg-[#f5f5f5] rounded-xl" />
      </div>
    );
  }

  if (!report) {
    throw notFound();
  }

  return (
    <div className="space-y-10">
      {/* Back Button */}
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm text-[#666666] hover:text-[#111111] transition-colors group"
      >
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
        返回日报列表
      </Link>

      {/* Hero Section */}
      <header className="space-y-6">
        <div className="flex items-center gap-2 text-sm text-[#666666]">
          <Calendar className="h-4 w-4" />
          <span>{formatDate(date)}</span>
        </div>
        
        <h1 className="text-4xl font-bold text-[#111111] tracking-tight leading-tight">
          {report.title}
        </h1>
        
        {report.summary && (
          <blockquote className="text-xl text-[#666666] italic border-l-2 border-[#e5e5e5] pl-4">
            {report.summary}
          </blockquote>
        )}

        {/* Podcast Link */}
        <Link
          to="/podcast/$date"
          params={{ date }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#111111] text-white text-sm font-medium rounded-lg hover:bg-[#333333] transition-colors"
        >
          <Headphones className="h-4 w-4" />
          收听语音版
        </Link>
      </header>

      {/* Featured Section */}
      {report.featured.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-[#111111] flex items-center gap-2">
            <span className="text-xl">🔥</span>
            今日重点
          </h2>
          <ProgressiveReveal delay={100} className="grid gap-4">
            {report.featured.map((item, index) => (
              <FeaturedCard key={index} item={item} />
            ))}
          </ProgressiveReveal>
        </section>
      )}

      {/* Categories Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        <ProgressiveReveal delay={80}>
          {report.categories.map((category) => (
            <section key={category.name} className="space-y-3 mb-6">
              <h3 className="text-base font-semibold text-[#111111] flex items-center gap-2">
                <span>{category.icon}</span>
                {category.name}
              </h3>
              <ul className="space-y-2">
                {category.items.map((item, itemIndex) => (
                  <li key={itemIndex}>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-start gap-2 text-sm"
                    >
                      <span className="text-[#a3a3a3] mt-1">·</span>
                      <div className="flex-1 min-w-0">
                        <span className="text-[#111111] group-hover:text-[#0070f3] transition-colors font-medium">
                          {item.title}
                        </span>
                        {item.description && (
                          <p className="text-[#666666] text-xs mt-0.5 line-clamp-1">
                            {item.description}
                          </p>
                        )}
                      </div>
                      <ExternalLink className="h-3 w-3 text-[#d4d4d4] group-hover:text-[#a3a3a3] flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-all" />
                    </a>
                    <div className="text-xs text-[#a3a3a3] ml-4 mt-0.5">
                      {item.source}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </ProgressiveReveal>
      </div>
    </div>
  );
}

function FeaturedCard({ item }: { item: { title: string; description: string; url: string; source: string; score: string } }) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block p-5 bg-[#fafafa] hover:bg-[#f5f5f5] rounded-xl border-l-4 border-l-[#0070f3] border-y border-r border-[#e5e5e5] hover:border-[#d4d4d4] transition-all duration-200 hover-lift group"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0 space-y-2">
          <h3 className="text-lg font-semibold text-[#111111] group-hover:text-[#0070f3] transition-colors">
            {item.title}
          </h3>
          <p className="text-[#666666] text-sm line-clamp-2">
            {item.description}
          </p>
          <div className="flex items-center gap-3 text-xs text-[#a3a3a3]">
            <span>{item.source}</span>
            <span>·</span>
            <span className="text-[#0070f3] font-medium">{item.score}分</span>
          </div>
        </div>
        <ExternalLink className="h-4 w-4 text-[#d4d4d4] group-hover:text-[#a3a3a3] flex-shrink-0 opacity-0 group-hover:opacity-100 transition-all" />
      </div>
    </a>
  );
}
