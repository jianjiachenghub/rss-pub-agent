import { redirect } from "next/navigation";
import { getAllDates, getGroupedByYear } from "@/lib/content-loader";
import Sidebar from "@/components/Sidebar";

export default function Home() {
  const dates = getAllDates();
  if (dates.length > 0) {
    redirect(`/${dates[0]}`);
  }

  const years = getGroupedByYear();

  return (
    <>
      <Sidebar currentDate="" years={years} />
      <main className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">AI News Flow</h1>
          <p className="text-gray-500">暂无内容，请先运行 Pipeline 生成日报</p>
          <p className="text-sm text-gray-400 mt-2">
            cd scripts && npx tsx graph.ts
          </p>
        </div>
      </main>
    </>
  );
}
