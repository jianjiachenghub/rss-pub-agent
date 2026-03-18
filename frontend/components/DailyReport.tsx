"use client";

import ReactMarkdown from "react-markdown";

export default function DailyReport({ content }: { content: string }) {
  const body = content.replace(/^---[\s\S]*?---\n/, "");

  return (
    <article className="prose prose-gray dark:prose-invert max-w-none">
      <ReactMarkdown
        components={{
          h1: ({ children }) => (
            <h1 className="text-3xl font-bold mb-6 pb-4 border-b">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-2xl font-semibold mt-10 mb-4 text-indigo-600">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-semibold mt-6 mb-2">{children}</h3>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-500 hover:underline"
            >
              {children}
            </a>
          ),
          hr: () => <hr className="my-6 border-gray-200 dark:border-gray-700" />,
        }}
      >
        {body}
      </ReactMarkdown>
    </article>
  );
}
