"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { CustomSelect } from "./custom-select";

interface ContestsFilterProps {
  onSearchChange: (search: string) => void;
  onTypeChange: (type: string) => void;
  onFormatChange: (format: string) => void;
}

export function ContestsFilter({
  onSearchChange,
  onTypeChange,
  onFormatChange,
}: ContestsFilterProps) {
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedFormat, setSelectedFormat] = useState("");

  const handleSearchChange = (value: string) => {
    setSearch(value);
    onSearchChange(value);
  };

  const handleTypeChange = (value: string) => {
    setSelectedType(value);
    onTypeChange(value);
  };

  const handleFormatChange = (value: string) => {
    setSelectedFormat(value);
    onFormatChange(value);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        {/* 搜索框 */}
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="搜索比赛..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full rounded-lg border border-ui bg-panel px-4 py-2 pl-10 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* 类型筛选器 */}
        <div className="w-full md:w-48">
          <CustomSelect
            options={[
              { value: "", label: "全部分类" },
              { value: "OFFICIAL", label: "官方比赛" },
              { value: "TEAM_PUBLIC", label: "团队公开赛" },
              { value: "INDIVIDUAL_PUBLIC", label: "个人公开赛" },
              { value: "REPLAY", label: "重现赛" },
            ]}
            value={selectedType}
            onChange={handleTypeChange}
          />
        </div>

        {/* 赛制筛选器 */}
        <div className="w-full md:w-48">
          <CustomSelect
            options={[
              { value: "", label: "全部赛制" },
              { value: "OI", label: "OI" },
              { value: "ICPC", label: "ICPC" },
              { value: "IOI", label: "IOI" },
            ]}
            value={selectedFormat}
            onChange={handleFormatChange}
          />
        </div>
      </div>
    </div>
  );
}
