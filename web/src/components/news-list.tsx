import type { NewsItem } from "@/types";
import { ExternalLink } from "lucide-react";

interface NewsListProps {
  items: NewsItem[];
}

export function NewsList({ items }: NewsListProps) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.id} className="flex items-start gap-3 group">
          <span className="text-muted-foreground mt-1.5">•</span>
          <div className="flex-1 min-w-0">
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium hover:underline inline-flex items-center gap-1"
            >
              {item.title}
              <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
            <p className="text-sm text-muted-foreground line-clamp-1">
              {item.oneLiner}
            </p>
          </div>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {item.source}
          </span>
        </li>
      ))}
    </ul>
  );
}
