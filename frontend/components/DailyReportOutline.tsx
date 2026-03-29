import type { DailyReportOutlineSection } from "@/lib/daily-report-parser";

export default function DailyReportOutline({
  sections,
}: {
  sections: DailyReportOutlineSection[];
}) {
  if (sections.length === 0) return null;

  return (
    <aside className="daily-outline-rail">
      <div className="editorial-card daily-outline-card px-4 py-5">
        <div className="section-label">目录</div>
        <nav className="daily-outline-nav" aria-label="日报目录">
          {sections.map((section) => (
            <div key={section.id} className="daily-outline-group">
              <a href={`#${section.id}`} className="daily-outline-section-link">
                {section.title}
              </a>
              <div className="daily-outline-item-list">
                {section.items.map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className="daily-outline-item-link"
                  >
                    {item.title}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </div>
    </aside>
  );
}
