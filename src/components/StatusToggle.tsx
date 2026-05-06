"use client";

import { useState, useEffect } from "react";

interface StatusToggleProps {
  value: number;
  onChange: (newValue: number) => void;
  disabled?: boolean;
  states?: number[];
}

export function StatusToggle({ value, onChange, disabled, states = [0, 1, 2] }: StatusToggleProps) {
  const [localValue, setLocalValue] = useState(value);

  // Sync with external value if it changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleClick = () => {
    if (disabled) return;
    const currentIndex = states.indexOf(localValue) >= 0 ? states.indexOf(localValue) : 0;
    const nextIndex = (currentIndex + 1) % states.length;
    const newValue = states[nextIndex];
    setLocalValue(newValue);
    onChange(newValue);
  };

  const getBgColor = (val: number) => {
    if (val === 1) return "bg-status-1";
    if (val === 2) return "bg-status-2";
    return "bg-status-0";
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={`w-[36px] h-[36px] rounded-full transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-foreground disabled:opacity-50 ${getBgColor(localValue)}`}
      aria-label="Toggle status"
    />
  );
}
