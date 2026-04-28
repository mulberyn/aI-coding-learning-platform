"use client";

import { useState } from "react";

export interface SettingSelectOption {
  value: string;
  label: string;
}

interface SettingSelectProps {
  name: string;
  defaultValue: string;
  options: SettingSelectOption[];
}

export function SettingSelect({
  name,
  defaultValue,
  options,
}: SettingSelectProps) {
  const [selected, setSelected] = useState(defaultValue);

  return (
    <>
      <div className="flex gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setSelected(option.value)}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
              selected === option.value
                ? "border-blue-500 bg-blue-50 text-blue-600 dark:border-blue-400 dark:bg-blue-900/30 dark:text-blue-300"
                : "border-ui bg-panel text-muted hover:border-ui hover:text-foreground"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
      <input type="hidden" name={name} value={selected} />
    </>
  );
}
