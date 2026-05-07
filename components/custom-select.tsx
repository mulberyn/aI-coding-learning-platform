"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

interface SelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function CustomSelect({
  options,
  value,
  onChange,
  placeholder = "选择...",
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        selectRef.current &&
        !selectRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={selectRef} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full rounded-lg border border-ui bg-panel px-4 py-2 text-sm font-medium flex items-center justify-between hover:bg-panel-strong transition-colors"
      >
        <span className="text-foreground">
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-muted transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-lg border border-ui bg-panel shadow-lg overflow-hidden">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                value === option.value
                  ? "bg-panel-strong text-foreground font-medium"
                  : "text-muted hover:bg-panel-strong hover:text-foreground"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
