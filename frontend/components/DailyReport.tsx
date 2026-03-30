import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import ResilientImage from "@/components/ResilientImage";
import type {
  DailyReportCategorySection,
  DailyReportMarkdownSection,
  ParsedDailyReport,
} from "@/lib/daily-report-parser";

const markdownComponents: Components = {
  h1: ({ children }) => (
    <h1 className="markdown-h1">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="markdown-h2">
      <span>{children}</span>
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="markdown-h3">{children}</h3>
  ),
  h4: ({ children }) => (
    <h4 className="markdown-h4">{children}</h4>
  ),
  p: ({ children }) => (
    <p className="markdown-p">{children}</p>
  ),
  blockquote: ({ children }) => (
    <blockquote className="markdown-quote">{children}</blockquote>
  ),
  ul: ({ children }) => (
    <ul className="markdown-ul">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="markdown-ol">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="markdown-li">{children}</li>
  ),
  hr: () => <hr className="markdown-hr" />,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="markdown-link"
    >
      {children}
    </a>
  ),
  img: ({ src, alt }) => (
    <ResilientImage
      alt={alt ?? ""}
      className="markdown-image"
      fallback="hide"
      src={typeof src === "string" ? src : undefined}
    />
  ),
  table: ({ children }) => (
    <table className="markdown-table">{children}</table>
  ),
  thead: ({ children }) => (
    <thead className="markdown-thead">{children}</thead>
  ),
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => (
    <tr className="markdown-tr">{children}</tr>
  ),
  th: ({ children }) => (
    <th className="markdown-th">{children}</th>
  ),
  td: ({ children }) => (
    <td className="markdown-td">{children}</td>
  ),
  pre: ({ children }) => (
    <pre className="markdown-pre">{children}</pre>
  ),
  code: ({ children, className }) =>
    className ? (
      <code className={className}>{children}</code>
    ) : (
      <code className="markdown-inline-code">{children}</code>
    ),
};

function MarkdownBody({ content }: { content: string }) {
  if (!content.trim()) return null;

  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
      {content}
    </ReactMarkdown>
  );
}

function MarkdownSection({ section }: { section: DailyReportMarkdownSection }) {
  return (
    <section id={section.id} className="daily-section-shell">
      <h2 className="markdown-h2">
        <span>{section.title}</span>
      </h2>
      <div className="daily-section-markdown">
        <MarkdownBody content={section.bodyMarkdown} />
      </div>
    </section>
  );
}

function CategorySection({ section }: { section: DailyReportCategorySection }) {
  return (
    <section id={section.id} className="daily-section-shell">
      <h2 className="markdown-h2">
        <span>{section.title}</span>
      </h2>
      <div className="daily-item-stack">
        {section.items.map((item) => (
          <article key={item.id} id={item.id} className="daily-item-card">
            <h3 className="daily-item-title">{item.title}</h3>

            {item.summary ? <p className="daily-item-summary">{item.summary}</p> : null}

            {item.bodyMarkdown ? (
              <div className="daily-item-body">
                <MarkdownBody content={item.bodyMarkdown} />
              </div>
            ) : null}

            <div className="daily-item-badge-row">
              {typeof item.meta.score === "number" ? (
                <span className="daily-item-badge">评分 {item.meta.score}</span>
              ) : null}
              {item.meta.sourceName && item.meta.sourceUrl ? (
                <a
                  href={item.meta.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="daily-item-badge daily-item-badge-link"
                >
                  来源 {item.meta.sourceName}
                </a>
              ) : item.meta.sourceName ? (
                <span className="daily-item-badge">来源 {item.meta.sourceName}</span>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default function DailyReport({ report }: { report: ParsedDailyReport }) {
  return (
    <article className="editorial-card reading-surface markdown-sheet daily-report-flow px-5 py-8 md:px-8 md:py-10">
      {report.sections.map((section) =>
        section.type === "category" ? (
          <CategorySection key={section.id} section={section} />
        ) : (
          <MarkdownSection key={section.id} section={section} />
        )
      )}
    </article>
  );
}
