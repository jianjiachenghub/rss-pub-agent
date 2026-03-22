export interface NewsItem {
  id: string;
  title: string;
  oneLiner: string;
  whyItMatters: string;
  url: string;
  source: string;
  category: string;
  weightedScore: number;
  isFeatured?: boolean;
}

export interface DailyReport {
  date: string;
  title: string;
  summary: string;
  featured: NewsItem[];
  categories: {
    name: string;
    items: NewsItem[];
  }[];
}

export interface Podcast {
  date: string;
  audioUrl?: string;
  duration?: number;
}

export type Category = 
  | "产品更新"
  | "前沿研究"
  | "行业动态"
  | "开源项目"
  | "社媒热点";
