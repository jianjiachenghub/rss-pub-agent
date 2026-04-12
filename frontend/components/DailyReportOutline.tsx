import type { DailyReportOutlineSection } from "@/lib/daily-report-parser";
import type { SiteLocale } from "@/lib/locale";

export default function DailyReportOutline({
  locale,
  sections,
}: {
  locale: SiteLocale;
  sections: DailyReportOutlineSection[];
}) {
  if (sections.length === 0) return null;

  return (
    <aside className="daily-outline-rail">
      <div className="editorial-card daily-outline-card px-4 py-5">
        <div className="section-label">{locale === "en" ? "Outline" : "目录"}</div>
        <nav
          className="daily-outline-nav"
          aria-label={locale === "en" ? "Daily report outline" : "日报目录"}
        >
          {sections.map((section) => (
            <div key={section.id} className="daily-outline-group">
              <a href={`#${section.id}`} className="daily-outline-section-link">
                {section.title}
              </a>
              {section.items.length > 0 ? (
                <div className="daily-outline-item-list">
                  {section.items.map((item, index) => (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      className="daily-outline-item-link"
                      title={item.title}
                    >
                      <span className="daily-outline-item-index">{index + 1}</span>
                      <span className="daily-outline-item-text">{item.title}</span>
                    </a>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </nav>
      </div>
    </aside>
  );
}
