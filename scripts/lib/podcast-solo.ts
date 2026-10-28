export const SOLO_PODCAST_FILE_NAME = "podcast-script-solo.md";

interface SoloPodcastOptions {
  date: string;
  reportName?: string;
}

export function validateSoloPodcastDate(date: string): void {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(Date.parse(`${date}T00:00:00Z`)) ||
    new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date
  ) {
    throw new Error("Solo podcast date must be a valid YYYY-MM-DD date");
  }
}

// Keep the words and numbers already approved in the canonical daily report.
// Only visual Markdown (images, destinations, emphasis) is unsuitable for reading aloud.
export function toSpokenText(text: string): string {
  return text
    .replace(/!\[[^\]]*\]\([^\n]*?\)(?:\{[^}]*\})?/g, "")
    .replace(/\[([^\]]+)\]\([^\n]*?\)/g, "$1")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(?<!\w)\*([^*\n]+)\*(?!\w)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .trim();
}

function sentence(text: string): string {
  return /[。！？.!?]$/.test(text) ? text : `${text}。`;
}

export function renderSoloPodcastScript(
  dailyMarkdown: string,
  options: SoloPodcastOptions
): string {
  validateSoloPodcastDate(options.date);
  const body = dailyMarkdown
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/^---\s*\n[\s\S]*?\n---\s*(?:\n|$)/, "");
  const originalTitle = body.match(/^#\s+(.+)$/m)?.[1] ?? "";
  const reportName =
    options.reportName?.trim() || originalTitle.split(/[|｜]/)[0].trim() || "个人日报";
  const [year, month, day] = options.date.split("-");
  const displayDate = `${year}年${Number(month)}月${Number(day)}日`;
  const paragraphs = [
    `# ${reportName} | ${displayDate} | 单播版`,
    `大家好，欢迎收听${reportName}。今天播报的是${displayDate}的完整日报。`,
  ];
  let mainTitleSeen = false;
  let mainItemCount = 0;
  let secondaryItemCount = 0;
  let hasNarrative = false;

  for (const rawLine of body.split("\n")) {
    const line = rawLine.trim();
    if (!line || /^[-*_]{3,}$/.test(line)) continue;

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      const title = toSpokenText(heading[2]);
      if (level === 1 && !mainTitleSeen) {
        mainTitleSeen = true;
        continue;
      }
      if (level === 3) {
        mainItemCount += 1;
        paragraphs.push(sentence(`第 ${mainItemCount} 条，${title}`));
      } else {
        paragraphs.push(`${level >= 4 ? "###" : "##"} ${title}`);
      }
      continue;
    }

    const text = toSpokenText(line.replace(/^>\s?/, ""));
    if (!text) continue;
    hasNarrative = true;

    const secondary = text.match(
      /^[-*+]\s+\[(\d{1,2}):(\d{2})\]\s+(.+)\s+\|\s+(.+)$/
    );
    if (secondary) {
      secondaryItemCount += 1;
      const [, hour, minute, title, source] = secondary;
      paragraphs.push(
        `补充资讯第 ${secondaryItemCount} 条，${Number(hour)} 点 ${Number(minute)} 分。${sentence(title)}来源是${sentence(source)}`
      );
      continue;
    }

    const score = text.match(/^评分\s+(\d+(?:\.\d+)?)\s*[·|]\s*来源\s+(.+)$/);
    if (score) {
      paragraphs.push(`这条新闻的评分是 ${score[1]} 分。来源是${sentence(score[2])}`);
      continue;
    }

    const detail = text.match(/^(事件|解读)[：:]\s*(.*)$/);
    paragraphs.push(
      detail ? `${detail[1]}是，${sentence(detail[2])}` : text.replace(/^[-*+]\s+/, "")
    );
  }

  if (!hasNarrative) {
    throw new Error("Cannot generate a solo podcast without daily report content");
  }
  paragraphs.push(`以上是${displayDate}的完整日报。感谢收听，我们下期再见。`);
  return `${paragraphs.join("\n\n")}\n`;
}
