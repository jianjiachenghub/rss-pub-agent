"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { stripGenericIssueHeading } from "@/lib/display-text";
import ResilientImage from "@/components/ResilientImage";

export default function DailyReport({ content }: { content: string }) {
  const body = stripGenericIssueHeading(
    content.replace(/^---[\s\S]*?---\n?/, "").trim()
  );

  return (
    <article className="editorial-card reading-surface markdown-sheet px-5 py-8 md:px-8 md:py-10">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h1 className="markdown-h1">{children}</h1>,
          h2: ({ children }) => (
            <h2 className="markdown-h2">
              <span>{children}</span>
            </h2>
          ),
          h3: ({ children }) => <h3 className="markdown-h3">{children}</h3>,
          h4: ({ children }) => <h4 className="markdown-h4">{children}</h4>,
          p: ({ children }) => <p className="markdown-p">{children}</p>,
          blockquote: ({ children }) => (
            <blockquote className="markdown-quote">{children}</blockquote>
          ),
          ul: ({ children }) => <ul className="markdown-ul">{children}</ul>,
          ol: ({ children }) => <ol className="markdown-ol">{children}</ol>,
          li: ({ children }) => <li className="markdown-li">{children}</li>,
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
          table: ({ children }) => <table className="markdown-table">{children}</table>,
          thead: ({ children }) => <thead className="markdown-thead">{children}</thead>,
          tbody: ({ children }) => <tbody>{children}</tbody>,
          tr: ({ children }) => <tr className="markdown-tr">{children}</tr>,
          th: ({ children }) => <th className="markdown-th">{children}</th>,
          td: ({ children }) => <td className="markdown-td">{children}</td>,
          pre: ({ children }) => <pre className="markdown-pre">{children}</pre>,
          code: ({ children, className }) =>
            className ? (
              <code className={className}>{children}</code>
            ) : (
              <code className="markdown-inline-code">{children}</code>
            ),
        }}
      >
        {body}
      </ReactMarkdown>
    </article>
  );
}
