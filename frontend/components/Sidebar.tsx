import Link from "next/link";
import { getAllDates } from "@/lib/content-loader";

export default function Sidebar({ currentDate }: { currentDate: string }) {
  const dates = getAllDates();

  return (
    <aside className="w-64 border-r border-gray-200 dark:border-gray-800 p-4 hidden md:block shrink-0 h-screen overflow-y-auto sticky top-0">
      <div className="mb-6">
        <Link href="/" className="text-xl font-bold text-indigo-600">
          AI 日报
        </Link>
        <p className="text-xs text-gray-500 mt-1">更准 · 更快 · 更有用</p>
      </div>
      <nav>
        <ul className="space-y-1">
          {dates.map((date) => (
            <li key={date}>
              <Link
                href={`/${date}`}
                className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                  date === currentDate
                    ? "bg-indigo-600 text-white"
                    : "hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                {date}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="mt-8 pt-4 border-t border-gray-200 dark:border-gray-800">
        <Link
          href="/podcast"
          className="block px-3 py-2 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          Podcast
        </Link>
      </div>
    </aside>
  );
}
