"use client";

import { useState, useMemo } from "react";
import { ContestsFilter } from "@/components/contests-filter";
import { ContestsList } from "@/components/contests-list";
import { CustomSelect } from "@/components/custom-select";

interface ContestsPageClientProps {
  contests: any[];
}

export default function ContestsPageClient({
  contests,
}: ContestsPageClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedFormat, setSelectedFormat] = useState("");
  const [sortBy, setSortBy] = useState("time");

  const filteredContests = useMemo(() => {
    let filtered = contests.filter((contest) => {
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
    <>
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
      <ContestsList contests={contests} filteredContests={filteredContests} />
    </>
  );
}
