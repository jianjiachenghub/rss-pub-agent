import LatestIssueRedirect from "@/components/LatestIssueRedirect";
import { getAllDates } from "@/lib/content-loader";
import { withLocalePath } from "@/lib/locale";

export const metadata = {
  title: "Latest Daily",
  robots: {
    index: false,
    follow: true,
  },
};

export default function EnglishLatestDailyPage() {
  const latestDate = getAllDates()[0];
  const targetPath = latestDate ? withLocalePath("en", `/${latestDate}`) : "/en";

  return (
    <LatestIssueRedirect
      targetPath={targetPath}
      linkLabel="Open latest daily"
      message="Opening the latest daily issue."
    />
  );
}
