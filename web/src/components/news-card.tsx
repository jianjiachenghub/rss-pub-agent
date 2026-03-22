import type { NewsItem } from "@/types";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { ExternalLink } from "lucide-react";

interface NewsCardProps {
  item: NewsItem;
  featured?: boolean;
}

export function NewsCard({ item, featured }: NewsCardProps) {
  return (
    <Card
      className={
        featured
          ? "border-l-4 border-l-orange-500 transition-shadow hover:shadow-md"
          : "transition-shadow hover:shadow-md"
      }
    >
      <CardHeader className={featured ? "pb-4" : "pb-2"}>
        <CardTitle className={featured ? "text-lg" : "text-base"}>
          {item.oneLiner}
        </CardTitle>
        {featured && (
          <CardDescription className="line-clamp-2">
            {item.whyItMatters}
          </CardDescription>
        )}
      </CardHeader>
      <CardFooter className="flex items-center justify-between text-sm text-muted-foreground">
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
          {item.source}
          <ExternalLink className="h-3 w-3" />
        </a>
        <span className="font-medium">{item.weightedScore}分</span>
      </CardFooter>
    </Card>
  );
}
