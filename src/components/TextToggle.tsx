"use client";

import { useState, useEffect } from "react";

interface TextToggleProps {
  value: string;
  onChange: (newValue: string) => void;
  disabled?: boolean;
}

const states = [
  { value: "20-24", bgClass: "bg-status-1" },
  { value: "25-28", bgClass: "bg-status-2" },
  { value: "---", bgClass: "bg-status-0" },
];

export function TextToggle({ value, onChange, disabled }: TextToggleProps) {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value || "20-24");
  }, [value]);

  const handleClick = () => {
    if (disabled) return;
    const currentIndex = states.findIndex(s => s.value === localValue);
    const safeIndex = currentIndex >= 0 ? currentIndex : 0;
    const nextIndex = (safeIndex + 1) % states.length;
    const newValue = states[nextIndex].value;
    setLocalValue(newValue);
    onChange(newValue);
  };

  const currentState = states.find(s => s.value === localValue) || states[0];

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={`h-[36px] min-w-[50px] px-2 rounded-full text-xs font-medium text-background transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-foreground disabled:opacity-50 ${currentState.bgClass}`}
      aria-label="Toggle back at time"
    >
      {localValue === "---" ? "---" : localValue}
    </button>
  );
}
