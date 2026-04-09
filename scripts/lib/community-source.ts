import type { NewsCategory } from "./types.js";

const VALID_CATEGORIES: NewsCategory[] = [
  "ai",
  "tech",
  "software",
  "business",
  "investment",
  "politics",
  "social",
];

const COMMUNITY_SOURCE_PATTERNS = [
  /v2ex/i,
  /hacker news/i,
  /ask hn/i,
  /reddit/i,
  /lobsters/i,
  /product hunt/i,
  /zhihu/i,
  /weibo/i,
  /\bx:\s/i,
  /\btwitter\b/i,
  /telegram/i,
  /xueqiu/i,
];

const COMMUNITY_URL_PATTERNS = [
  /v2ex\.com/i,
  /news\.ycombinator\.com/i,
  /reddit\.com/i,
  /lobste\.rs/i,
  /producthunt\.com/i,
  /zhihu\.com/i,
  /weibo\.com/i,
  /(?:^|\/\/)x\.com/i,
  /twitter\.com/i,
  /t\.me\//i,
  /xueqiu\.com/i,
];

const QUESTION_TITLE_PATTERNS = [
  /^ask hn:/i,
  /^who is hiring/i,
  /^how\s+/i,
  /^what\s+/i,
  /^why\s+/i,
  /^请教/u,
  /^求助/u,
  /^问下/u,
  /^请问/u,
  /^如何/u,
  /^怎么/u,
  /^有偿/u,
];

const COMMUNITY_PROMOTION_PATTERNS = [
  /promotion/i,
  /sponsor/i,
  /sponsored/i,
  /giveaway/i,
  /discount/i,
  /coupon/i,
  /invite code/i,
  /referral/i,
  /hiring/i,
  /recruit/i,
  /推广/u,
  /抽奖/u,
  /注册送/u,
  /优惠/u,
  /邀请码/u,
  /内测/u,
  /公测/u,
  /白嫖/u,
  /招募/u,
  /招聘/u,
  /拼车/u,
  /渠道/u,
  /充值/u,
  /首充/u,
  /付费求/u,
];

const COMMUNITY_SIGNAL_PATTERNS = [
  /open source/i,
  /release/i,
  /released/i,
  /changelog/i,
  /benchmark/i,
  /dataset/i,
  /paper/i,
  /postmortem/i,
  /incident/i,
  /outage/i,
  /\bbug\b/i,
  /security/i,
  /\bcve\b/i,
  /\bapi\b/i,
  /\bsdk\b/i,
  /framework/i,
  /integration/i,
  /case study/i,
  /evaluation/i,
  /latency/i,
  /performance/i,
  /开源/u,
  /发布/u,
  /版本/u,
  /更新/u,
  /数据集/u,
  /论文/u,
  /评测/u,
  /实测/u,
  /测试/u,
  /基准/u,
  /性能/u,
  /故障/u,
  /事故/u,
  /复盘/u,
  /漏洞/u,
  /安全/u,
  /接口/u,
  /框架/u,
  /集成/u,
  /案例/u,
  /成本/u,
];

function normalizeText(text: string | undefined): string {
  return (text ?? "").replace(/\s+/g, " ").trim();
}

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

export function normalizeNewsCategory(category: string): NewsCategory {
  return VALID_CATEGORIES.includes(category as NewsCategory)
    ? (category as NewsCategory)
    : "social";
}

export function isCommunitySource(item: {
  source?: string;
  url?: string;
}): boolean {
  const source = normalizeText(item.source);
  const url = normalizeText(item.url);

  return (
    matchesAny(source, COMMUNITY_SOURCE_PATTERNS) ||
    matchesAny(url, COMMUNITY_URL_PATTERNS)
  );
}

export function hasConcreteCommunitySignal(item: {
  title?: string;
  content?: string;
}): boolean {
  const text = `${normalizeText(item.title)}\n${normalizeText(item.content)}`;
  return matchesAny(text, COMMUNITY_SIGNAL_PATTERNS);
}

export function isLowSignalCommunityItem(item: {
  source?: string;
  url?: string;
  title?: string;
  content?: string;
}): boolean {
  if (!isCommunitySource(item)) return false;

  const title = normalizeText(item.title);
  const text = `${title}\n${normalizeText(item.content)}`;

  if (!title && !text.trim()) return true;
  if (matchesAny(text, COMMUNITY_PROMOTION_PATTERNS)) return true;
  if (matchesAny(title, QUESTION_TITLE_PATTERNS) || /[?？]$/.test(title)) return true;

  return !hasConcreteCommunitySignal(item);
}

export function classifyEditorialCategory(
  category: string,
  item: { source?: string; url?: string }
): NewsCategory {
  if (isCommunitySource(item)) return "social";
  return normalizeNewsCategory(category);
}

export function getCommunityScorePenalty(item: {
  source?: string;
  url?: string;
  title?: string;
  content?: string;
}): number {
  if (!isCommunitySource(item)) return 0;
  return isLowSignalCommunityItem(item) ? 28 : 12;
}

export function getCommunityRepresentativePenalty(item: {
  source?: string;
  url?: string;
  title?: string;
  content?: string;
}): number {
  if (!isCommunitySource(item)) return 0;
  return isLowSignalCommunityItem(item) ? 220 : 90;
}
