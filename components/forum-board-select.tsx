"use client";

import { useEffect, useState } from "react";
import { CustomSelect } from "./custom-select";
import { FORUM_BOARD_OPTIONS } from "@/lib/forum";

type Props = {
  name?: string;
  defaultValue?: string;
  placeholder?: string;
};

export function ForumBoardSelect({
  name = "board",
  defaultValue = "",
  placeholder = "全部板块",
}: Props) {
  const [value, setValue] = useState<string>(defaultValue ?? "");

  useEffect(() => {
    const el = document.querySelector(
      `input[name="${name}"]`,
    ) as HTMLInputElement | null;
    if (el) {
      el.value = value;
    }
  }, [value, name]);

  return (
    <div>
      <input type="hidden" name={name} value={value} />
      <CustomSelect
        options={[{ value: "", label: "全部板块" }, ...FORUM_BOARD_OPTIONS]}
        value={value}
        onChange={setValue}
        placeholder={placeholder}
      />
    </div>
  );
}
