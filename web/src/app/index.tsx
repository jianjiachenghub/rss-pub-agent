import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Calendar, ChevronRight } from "lucide-react";
import { fetchReportList } from "@/lib/markdown";
import { formatDate } from "@/lib/utils";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ProgressiveReveal } from "@/components/stream-content";

export const Route = createFileRoute("/")({
  component: HomeComponent,
});

function HomeComponent() {
  const { data: reports, isLoading } = useQuery({
    queryKey: ["reports"],
    queryFn: fetchReportList,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-5 bg-muted rounded w-1/3 mb-2" />
              <div className="h-4 bg-muted rounded w-2/3" />
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  if (!reports?.length) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">暂无日报</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold mb-6">历史日报</h1>
      <ProgressiveReveal delay={80}>
        {reports.map((report) => (
          <Link
            key={report.date}
            to="/$date"
            params={{ date: report.date }}
            className="block"
          >
            <Card className="transition-colors hover:bg-muted/50 cursor-pointer group">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <Calendar className="h-4 w-4" />
                      {formatDate(report.date)}
                    </div>
                    <CardTitle className="text-lg mb-2">{report.title}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {report.summary}
                    </CardDescription>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
                <div className="text-sm text-muted-foreground mt-2">
                  {report.itemCount} 条资讯
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </ProgressiveReveal>
    </div>
  );
}
