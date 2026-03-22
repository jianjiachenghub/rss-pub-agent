import { marked } from "marked";

// ==================== 日报类型 ====================
export interface ParsedReport {
  date: string;
  title: string;
  summary: string;
  featured: FeaturedItem[];
  categories: CategorySection[];
}

export interface FeaturedItem {
  title: string;
  description: string;
  url: string;
  source: string;
  score: string;
}

export interface CategorySection {
  name: string;
  icon: string;
  items: NewsItem[];
}

export interface NewsItem {
  title: string;
  url: string;
  source: string;
  description?: string;
}

export interface ReportIndex {
  date: string;
  title: string;
  summary: string;
  itemCount: number;
}

// ==================== 周报类型 ====================
export interface WeeklyReportIndex {
  week: string;
  title: string;
  summary: string;
  startDate: string;
  endDate: string;
  dailyCount: number;
  highlightCount: number;
}

export interface ParsedWeeklyReport {
  week: string;
  title: string;
  summary: string;
  startDate: string;
  endDate: string;
  highlights: WeeklyHighlight[];
  trends: WeeklyTrend[];
  dailySummaries: DailySummary[];
}

export interface WeeklyHighlight {
  title: string;
  description: string;
  url: string;
  source: string;
  date: string;
}

export interface WeeklyTrend {
  category: string;
  trend: string;
  description: string;
}

export interface DailySummary {
  date: string;
  title: string;
  summary: string;
  keyPoints: string[];
}

// ==================== 日报解析 ====================
export function parseReportMarkdown(content: string, date: string): ParsedReport {
  // 移除 frontmatter
  let cleanContent = content;
  if (content.startsWith("---")) {
    const endIndex = content.indexOf("---", 3);
    if (endIndex !== -1) {
      cleanContent = content.slice(endIndex + 3).trim();
    }
  }

  const lines = cleanContent.split("\n");
  let title = "";
  let summary = "";
  const featured: FeaturedItem[] = [];
  const categories: CategorySection[] = [];

  let currentCategory: CategorySection | null = null;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();

    // 跳过空行
    if (line === "") {
      i++;
      continue;
    }

    // 提取标题
    if (line.startsWith("# ") && !title) {
      title = line.replace("# ", "").trim();
      i++;
      continue;
    }

    // 提取摘要（blockquote）
    if (line.startsWith("> ") && !summary) {
      summary = line.replace("> ", "").trim();
      i++;
      continue;
    }

    // 跳过分隔线
    if (line === "---") {
      i++;
      continue;
    }

    // 分类部分（## 开头）
    if (line.startsWith("## ")) {
      const categoryName = line.replace("## ", "").trim();
      const icon = extractIcon(categoryName);
      currentCategory = {
        name: categoryName,
        icon,
        items: [],
      };
      categories.push(currentCategory);
      i++;
      continue;
    }

    // 新闻条目（### 开头）
    if (line.startsWith("### ") && currentCategory) {
      const newsItem = parseNewsItem(lines, i);
      if (newsItem) {
        currentCategory.items.push(newsItem);
        
        // 高分项加入重点
        const scoreMatch = newsItem.title.match(/(\d+)分/);
        if (scoreMatch && parseInt(scoreMatch[1]) >= 70) {
          featured.push({
            title: newsItem.title.replace(/^###\s*/, ""),
            description: newsItem.description || "",
            url: newsItem.url,
            source: newsItem.source,
            score: scoreMatch[1],
          });
        }
        
        i = newsItem.nextIndex;
        continue;
      }
    }

    i++;
  }

  // 如果没有提取到摘要，使用默认描述
  if (!summary) {
    summary = `${featured.length > 0 ? featured.length : categories.reduce((acc, cat) => acc + cat.items.length, 0)} 条精选资讯`;
  }

  return {
    date,
    title: title || `AI 日报 - ${date}`,
    summary,
    featured,
    categories,
  };
}

interface ParsedNewsItem {
  title: string;
  url: string;
  source: string;
  description?: string;
  nextIndex: number;
}

function parseNewsItem(lines: string[], startIndex: number): ParsedNewsItem | null {
  let i = startIndex;
  const titleLine = lines[i].trim();
  
  // 提取标题
  const titleMatch = titleLine.match(/^###\s+(.+)$/);
  if (!titleMatch) return null;
  
  const title = titleMatch[1].trim();
  i++;

  let url = "";
  let source = "";
  let description = "";

  // 解析后续行
  while (i < lines.length) {
    const line = lines[i].trim();
    
    // 遇到下一个标题或分隔线就结束
    if (line.startsWith("### ") || line.startsWith("## ") || line === "---") {
      break;
    }

    // 提取评分和来源
    if (line.includes("分") && line.includes("来源:")) {
      const sourceMatch = line.match(/来源:\s*\[([^\]]+)\]\(([^)]+)\)/);
      if (sourceMatch) {
        source = sourceMatch[1];
        url = sourceMatch[2];
      }
    }

    // 如果不是评分行，且不为空行，追加到 description
    if (line && !line.includes("分") && !line.includes("来源:")) {
      description += lines[i] + "\n";
    }

    i++;
  }

  // 清理多余空行
  description = description.trim();

  return {
    title,
    url: url || "#",
    source: source || "未知来源",
    description,
    nextIndex: i,
  };
}

function extractIcon(categoryName: string): string {
  const iconMap: Record<string, string> = {
    "AI 领域": "🤖",
    "科技": "💻",
    "软件工程": "⚙️",
    "商业财经": "💼",
    "投资理财": "📈",
    "时政军事": "🌍",
    "社交媒体": "📱",
  };
  
  for (const [name, icon] of Object.entries(iconMap)) {
    if (categoryName.includes(name)) return icon;
  }
  
  return "📰";
}

// ==================== 周报解析 ====================
export function parseWeeklyReportMarkdown(_content: string, week: string): ParsedWeeklyReport {
  return {
    week,
    title: `AI 周报 - 第${week}周`,
    summary: "",
    startDate: "",
    endDate: "",
    highlights: [],
    trends: [],
    dailySummaries: [],
  };
}

// ==================== 数据获取 ====================

export async function fetchReportList(): Promise<ReportIndex[]> {
  const response = await fetch("/reports/index.json");
  if (!response.ok) {
    return [];
  }
  return response.json();
}

export async function fetchReport(date: string): Promise<ParsedReport> {
  const response = await fetch(`/reports/${date}.md`);
  if (!response.ok) {
    throw new Error(`Failed to fetch report for ${date}`);
  }
  const content = await response.text();
  return parseReportMarkdown(content, date);
}

export async function fetchWeeklyReportList(): Promise<WeeklyReportIndex[]> {
  const response = await fetch("/reports/weekly-index.json");
  if (!response.ok) {
    return [];
  }
  return response.json();
}

export async function fetchWeeklyReport(week: string): Promise<ParsedWeeklyReport> {
  const response = await fetch(`/reports/weekly-${week}.md`);
  if (!response.ok) {
    throw new Error(`Failed to fetch weekly report for ${week}`);
  }
  const content = await response.text();
  return parseWeeklyReportMarkdown(content, week);
}

// ==================== 流式渲染 ====================
export async function* streamMarkdown(content: string): AsyncGenerator<string> {
  const tokens = marked.lexer(content);
  
  for (const token of tokens) {
    await new Promise(resolve => setTimeout(resolve, 50));
    yield marked.parser([token]);
  }
}
