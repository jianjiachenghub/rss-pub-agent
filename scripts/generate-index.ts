/**
 * 生成日报索引 JSON
 * 在 GitHub Actions 中运行，生成 reports/index.json
 */

import * as fs from "fs/promises";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ReportIndex {
  date: string;
  title: string;
  summary: string;
  itemCount: number;
}

async function generateIndex() {
  const reportsDir = path.join(__dirname, "..", "reports");
  const outputFile = path.join(reportsDir, "index.json");

  try {
    // 读取 reports 目录
    const files = await fs.readdir(reportsDir);
    const mdFiles = files
      .filter((f) => f.endsWith(".md"))
      .sort()
      .reverse(); // 最新的在前

    const index: ReportIndex[] = [];

    for (const file of mdFiles) {
      const filePath = path.join(reportsDir, file);
      const content = await fs.readFile(filePath, "utf-8");

      // 解析文件名获取日期
      const date = file.replace(".md", "");

      // 解析标题和摘要
      const lines = content.split("\n");
      let title = "";
      let summary = "";
      let itemCount = 0;

      for (const line of lines) {
        // 提取标题
        if (line.startsWith("# ") && !title) {
          title = line.replace("# ", "").trim();
        }

        // 提取摘要
        if (line.startsWith("> ") && !summary) {
          summary = line.replace("> ", "").trim();
        }

        // 统计条目数
        if (line.startsWith("- ") || line.startsWith("**")) {
          itemCount++;
        }
      }

      index.push({
        date,
        title: title || `AI 日报 - ${date}`,
        summary: summary || "",
        itemCount,
      });
    }

    // 写入 index.json
    await fs.writeFile(outputFile, JSON.stringify(index, null, 2));

    console.log(`✅ 生成索引成功: ${index.length} 篇日报`);
    console.log(`📄 输出文件: ${outputFile}`);
  } catch (error) {
    console.error("❌ 生成索引失败:", error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  generateIndex();
}

export { generateIndex };
