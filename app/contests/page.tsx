"use client";

import { useState, useMemo } from "react";
import { TopNavBar } from "@/app/components/TopNavBar";
import { ContestsFilter } from "@/components/contests-filter";
import { ContestsList } from "@/components/contests-list";
import { OngoingContests } from "@/components/ongoing-contests";
import { CustomSelect } from "@/components/custom-select";
import { mockContests } from "@/lib/mock-contests";

const navigationRoutes = [
  { href: "/", label: "首页" },
  { href: "/problems", label: "题库" },
  { href: "/submissions", label: "提交记录" },
  { href: "/contests", label: "比赛" },
  { href: "/forum", label: "论坛" },
];

export default function ContestsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedFormat, setSelectedFormat] = useState("");
  const [sortBy, setSortBy] = useState("time");

  const filteredContests = useMemo(() => {
    let filtered = mockContests.filter((contest) => {
      const matchesSearch =
        searchQuery === "" ||
        contest.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = selectedType === "" || contest.type === selectedType;
      const matchesFormat =
        selectedFormat === "" || contest.format === selectedFormat;

      return matchesSearch && matchesType && matchesFormat;
    });

    // 排序
    if (sortBy === "time") {
      filtered.sort(
        (a, b) =>
          new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
      );
    } else if (sortBy === "participants") {
      filtered.sort((a, b) => b.participantCount - a.participantCount);
    }

    return filtered;
  }, [searchQuery, selectedType, selectedFormat, sortBy]);

  return (
    <div className="min-h-screen bg-background">
      <TopNavBar routes={navigationRoutes} signedIn={false} />

      <div className="pt-12">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              比赛中心
            </h1>
            <p className="mt-2 text-sm text-muted">
              参加各类编程竞赛，与全球编程爱好者同场竞技
            </p>
          </div>

          <div className="space-y-6">
            {/* 进行中的比赛 */}
            <OngoingContests contests={mockContests} />

            {/* 筛选区域 */}
            <div className="space-y-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center">
                <div className="flex-1">
                  <ContestsFilter
                    onSearchChange={setSearchQuery}
                    onTypeChange={setSelectedType}
                    onFormatChange={setSelectedFormat}
                  />
                </div>

                {/* 排序选择器 */}
                <div className="w-full md:w-48">
                  <CustomSelect
                    options={[
                      { value: "time", label: "按时间排序" },
                      { value: "participants", label: "按参赛人数排序" },
                    ]}
                    value={sortBy}
                    onChange={setSortBy}
                  />
                </div>
              </div>
            </div>

            {/* 比赛列表 */}
            <ContestsList
              contests={mockContests}
              filteredContests={filteredContests}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
