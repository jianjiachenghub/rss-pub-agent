import { isValidElement, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import ResilientImage from "@/components/ResilientImage";
import type { ParsedDailyReport } from "@/lib/daily-report";

const META_PREFIX = "\u6765\u6e90\uff1a";
const EVENT_PREFIX = "\u4e8b\u4ef6\uff1a";
const INTERPRETATION_PREFIX = "\u89e3\u8bfb\uff1a";

function flattenNodeText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map((child) => flattenNodeText(child)).join("");
  }

  if (isValidElement(node)) {
    return flattenNodeText((node.props as { children?: ReactNode }).children);
  }

  return "";
}

const markdownComponents = {
  h4: ({ children }: { children?: ReactNode }) => (
    <h4 className="markdown-h4">{children}</h4>
  ),
  p: ({ children }: { children?: ReactNode }) => {
    const text = flattenNodeText(children).replace(/\s+/g, " ").trim();
    const classNames = ["markdown-p"];

    if (text.startsWith(META_PREFIX)) {
      classNames.push("markdown-meta");
    }

    if (text.startsWith(EVENT_PREFIX)) {
      classNames.push("markdown-lead-row");
    }

    if (text.startsWith(INTERPRETATION_PREFIX)) {
      classNames.push("markdown-lead-row", "is-interpretation");
    }

    return <p className={classNames.join(" ")}>{children}</p>;
  },
  strong: ({ children }: { children?: ReactNode }) => (
    <strong className="markdown-strong">{children}</strong>
  ),
  ul: ({ children }: { children?: ReactNode }) => (
    <ul className="markdown-ul">{children}</ul>
  ),
  ol: ({ children }: { children?: ReactNode }) => (
    <ol className="markdown-ol">{children}</ol>
  ),
  li: ({ children }: { children?: ReactNode }) => (
    <li className="markdown-li">{children}</li>
  ),
  hr: () => <hr className="markdown-hr" />,
  a: ({ href, children }: { href?: string; children?: ReactNode }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="markdown-link"
    >
      {children}
    </a>
  ),
  img: ({ src, alt }: { src?: string | Blob; alt?: string }) => (
    <ResilientImage
      alt={alt ?? ""}
      className="markdown-image"
      fallback="hide"
      src={typeof src === "string" ? src : undefined}
    />
  ),
  table: ({ children }: { children?: ReactNode }) => (
    <table className="markdown-table">{children}</table>
  ),
  thead: ({ children }: { children?: ReactNode }) => (
    <thead className="markdown-thead">{children}</thead>
  ),
  tbody: ({ children }: { children?: ReactNode }) => <tbody>{children}</tbody>,
  tr: ({ children }: { children?: ReactNode }) => (
    <tr className="markdown-tr">{children}</tr>
  ),
  th: ({ children }: { children?: ReactNode }) => (
    <th className="markdown-th">{children}</th>
  ),
  td: ({ children }: { children?: ReactNode }) => (
    <td className="markdown-td">{children}</td>
  ),
  pre: ({ children }: { children?: ReactNode }) => (
    <pre className="markdown-pre">{children}</pre>
  ),
  code: ({
    children,
    className,
  }: {
    children?: ReactNode;
    className?: string;
  }) =>
    className ? (
      <code className={className}>{children}</code>
    ) : (
      <code className="markdown-inline-code">{children}</code>
    ),
};

function MarkdownBlock({ content }: { content: string }) {
  if (!content.trim()) {
    return null;
  }

  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
      {content}
    </ReactMarkdown>
  );
}

export default function DailyReport({
  sections,
}: {
  sections: ParsedDailyReport["sections"];
}) {
  return (
    <article className="editorial-card reading-surface daily-report-sheet px-5 py-8 md:px-8 md:py-10">
      {sections.map((section) => (
        <section
          key={section.id}
          id={section.id}
          className={`daily-section ${section.items.length > 0 ? "has-items" : "is-editorial"}`}
        >
          <div className="daily-section-head">
            <h2 className="daily-section-title">
              <span>{section.title}</span>
            </h2>
          </div>

          {section.content ? (
            <div className="daily-section-copy markdown-sheet">
              <MarkdownBlock content={section.content} />
            </div>
          ) : null}

          {section.items.length > 0 ? (
            <div className="daily-item-stack">
              {section.items.map((item) => (
                <article key={item.id} id={item.id} className="daily-item-card">
                  <h3 className="daily-item-title">{item.title}</h3>
                  <div className="daily-item-body markdown-sheet">
                    <MarkdownBlock content={item.content} />
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </section>
      ))}
    </article>
  );
}
