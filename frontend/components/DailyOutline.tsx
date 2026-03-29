import type { ParsedDailyReport } from "@/lib/daily-report";

const OUTLINE_LABEL = "\u9875\u5185\u76ee\u5f55";
const OUTLINE_NOTE =
  "\u6309\u5206\u7c7b\u6d4f\u89c8\uff0c\u957f\u6807\u9898\u4f1a\u81ea\u52a8\u622a\u65ad\u3002";

export default function DailyOutline({
  outline,
}: {
  outline: ParsedDailyReport["outline"];
}) {
  if (outline.length === 0) {
    return null;
  }

  return (
    <nav className="editorial-card daily-outline-card" aria-label={OUTLINE_LABEL}>
      <div className="daily-outline-head">
        <div className="section-label">{OUTLINE_LABEL}</div>
        <p className="daily-outline-note">{OUTLINE_NOTE}</p>
      </div>

      <div className="daily-outline-sections">
        {outline.map((section) => (
          <section key={section.id} className="daily-outline-section">
            <a
              className="daily-outline-category"
              href={`#${section.id}`}
              title={section.title}
            >
              {section.title}
            </a>

            <ol className="daily-outline-list">
              {section.items.map((item) => (
                <li key={item.id}>
                  <a
                    className="daily-outline-link"
                    href={`#${item.id}`}
                    title={item.title}
                  >
                    <span>{item.shortTitle}</span>
                  </a>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </nav>
  );
}
