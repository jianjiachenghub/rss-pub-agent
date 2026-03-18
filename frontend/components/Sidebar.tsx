"use client";

import Link from "next/link";
import { useState } from "react";

interface DateEntry {
  date: string;
  year: string;
  month: string;
  day: string;
}

interface MonthGroup {
  year: string;
  month: string;
  label: string;
  dates: DateEntry[];
}

interface YearGroup {
  year: string;
  months: MonthGroup[];
}

interface SidebarProps {
  currentDate: string;
  years: YearGroup[];
}

export default function Sidebar({ currentDate, years }: SidebarProps) {
  const currentYear = currentDate ? currentDate.split("-")[0] : years[0]?.year;
  const currentMonth = currentDate ? currentDate.split("-")[1] : years[0]?.months[0]?.month;

  const [expandedYears, setExpandedYears] = useState<Set<string>>(
    new Set(currentYear ? [currentYear] : [])
  );
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(
    new Set(currentYear && currentMonth ? [`${currentYear}-${currentMonth}`] : [])
  );

  const toggleYear = (year: string) => {
    setExpandedYears((prev) => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
  };

  const toggleMonth = (key: string) => {
    setExpandedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <aside className="w-64 border-r border-gray-200 dark:border-gray-800 p-4 hidden md:block shrink-0 h-screen overflow-y-auto sticky top-0">
      <div className="mb-6">
        <Link href="/" className="text-xl font-bold text-indigo-600">
          AI News Flow
        </Link>
        <p className="text-xs text-gray-500 mt-1">更准 · 更快 · 更有用</p>
      </div>

      <nav className="space-y-1">
        {years.map((yearGroup) => (
          <div key={yearGroup.year}>
            <button
              onClick={() => toggleYear(yearGroup.year)}
              className="flex items-center w-full px-3 py-2 text-sm font-semibold rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <span className="mr-2 text-gray-400 text-xs">
                {expandedYears.has(yearGroup.year) ? "▼" : "▶"}
              </span>
              {yearGroup.year}
              <span className="ml-auto text-xs text-gray-400">
                {yearGroup.months.reduce((sum, m) => sum + m.dates.length, 0)}
              </span>
            </button>

            {expandedYears.has(yearGroup.year) && (
              <div className="ml-3">
                {yearGroup.months.map((monthGroup) => {
                  const monthKey = `${monthGroup.year}-${monthGroup.month}`;
                  return (
                    <div key={monthKey}>
                      <button
                        onClick={() => toggleMonth(monthKey)}
                        className="flex items-center w-full px-3 py-1.5 text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      >
                        <span className="mr-2 text-gray-400 text-xs">
                          {expandedMonths.has(monthKey) ? "▼" : "▶"}
                        </span>
                        {monthGroup.label}
                        <span className="ml-auto text-xs text-gray-400">
                          {monthGroup.dates.length}
                        </span>
                      </button>

                      {expandedMonths.has(monthKey) && (
                        <div className="ml-5 space-y-0.5">
                          {monthGroup.dates.map((entry) => (
                            <Link
                              key={entry.date}
                              href={`/${entry.date}`}
                              className={`flex items-center px-3 py-1.5 text-sm rounded-lg transition-colors ${
                                entry.date === currentDate
                                  ? "bg-indigo-600 text-white"
                                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full mr-2 ${
                                entry.date === currentDate ? "bg-white" : "bg-indigo-400"
                              }`} />
                              {parseInt(entry.day, 10)}日
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </nav>

      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-800 space-y-1">
        <Link
          href="/podcast"
          className="block px-3 py-2 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          🎙 播客
        </Link>
      </div>
    </aside>
  );
}
