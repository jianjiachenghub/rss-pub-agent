import LatestIssueRedirect from "@/components/LatestIssueRedirect";
import { getAllDates } from "@/lib/content-loader";
import { withLocalePath } from "@/lib/locale";

export const metadata = {
  title: "最新日报",
  robots: {
    index: false,
    follow: true,
  },
};

export default function LatestDailyPage() {
  const latestDate = getAllDates()[0];
  const targetPath = latestDate ? withLocalePath("zh", `/${latestDate}`) : "/";

  return (
    <LatestIssueRedirect
      targetPath={targetPath}
      linkLabel="打开最新日报"
      message="正在跳转到最新一期日报。"
    />
  );
}
