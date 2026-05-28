"use client";

import { useState } from "react";

interface MoneyInputProps {
  value: string;
  onChange: (raw: string) => void;
  /** Adds a hidden <input name={name} value={value} /> for FormData forms */
  name?: string;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  required?: boolean;
  id?: string;
}

export function MoneyInput({ value, onChange, name, placeholder, className, style, required, id }: MoneyInputProps) {
  const [focused, setFocused] = useState(false);

  const displayValue = focused
    ? value
    : value ? Number(value).toLocaleString() : "";

  return (
    <>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ""))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        className={className}
        style={style}
        required={required && !value}
      />
      {name && <input type="hidden" name={name} value={value} />}
    </>
  );
}
