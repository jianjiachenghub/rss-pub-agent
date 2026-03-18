import { redirect } from "next/navigation";
import { getAllDates } from "@/lib/content-loader";

export default function Home() {
  const dates = getAllDates();
  if (dates.length > 0) {
    redirect(`/${dates[0]}`);
  }

  return (
    <main className="flex flex-1 items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">AI 日报</h1>
        <p className="text-gray-500">暂无内容，请先运行 Pipeline 生成日报</p>
      </div>
    </main>
  );
}
