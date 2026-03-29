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
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 overflow-y-auto border-r border-gray-200 p-4 dark:border-gray-800 md:block">
      <div className="mb-6">
        <Link href="/" className="text-xl font-bold text-indigo-600">
          RSS Agent
        </Link>
        <p className="mt-1 text-xs text-gray-500">基于 LLM 的 News Flow</p>
      </div>

      <nav className="space-y-1">
        {years.map((yearGroup) => (
          <div key={yearGroup.year}>
            <button
              onClick={() => toggleYear(yearGroup.year)}
              className="flex w-full items-center rounded-lg px-3 py-2 text-sm font-semibold transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <span className="mr-2 text-xs text-gray-400">
                {expandedYears.has(yearGroup.year) ? "▾" : "▸"}
              </span>
              {yearGroup.year}
              <span className="ml-auto text-xs text-gray-400">
                {yearGroup.months.reduce((sum, month) => sum + month.dates.length, 0)}
              </span>
            </button>

            {expandedYears.has(yearGroup.year) ? (
              <div className="ml-3">
                {yearGroup.months.map((monthGroup) => {
                  const monthKey = `${monthGroup.year}-${monthGroup.month}`;

                  return (
                    <div key={monthKey}>
                      <button
                        onClick={() => toggleMonth(monthKey)}
                        className="flex w-full items-center rounded-lg px-3 py-1.5 text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        <span className="mr-2 text-xs text-gray-400">
                          {expandedMonths.has(monthKey) ? "▾" : "▸"}
                        </span>
                        {monthGroup.label}
                        <span className="ml-auto text-xs text-gray-400">
                          {monthGroup.dates.length}
                        </span>
                      </button>

                      {expandedMonths.has(monthKey) ? (
                        <div className="ml-5 space-y-0.5">
                          {monthGroup.dates.map((entry) => (
                            <Link
                              key={entry.date}
                              href={`/${entry.date}`}
                              className={`flex items-center rounded-lg px-3 py-1.5 text-sm transition-colors ${
                                entry.date === currentDate
                                  ? "bg-indigo-600 text-white"
                                  : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                              }`}
                            >
                              <span
                                className={`mr-2 h-1.5 w-1.5 rounded-full ${
                                  entry.date === currentDate ? "bg-white" : "bg-indigo-400"
                                }`}
                              />
                              {parseInt(entry.day, 10)}日
                            </Link>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        ))}
      </nav>

      <div className="mt-6 space-y-1 border-t border-gray-200 pt-4 dark:border-gray-800">
        <Link
          href="/podcast"
          className="block rounded-lg px-3 py-2 text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          播客
        </Link>
      </div>
    </aside>
  );
}
