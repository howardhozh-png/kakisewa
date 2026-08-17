"use client";

interface WhatsAppUsernameInputProps {
  value: string;
  onChange: (raw: string) => void;
  /** Adds a hidden <input name={name} value={value} /> for FormData forms */
  name?: string;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
}

/** Text input with a fixed, non-removable "@" prefix. Stored value never includes the "@". */
export function WhatsAppUsernameInput({ value, onChange, name, placeholder = "username", className, style }: WhatsAppUsernameInputProps) {
  return (
    <div className={className} style={{ display: "flex", alignItems: "center", ...style }}>
      <span className="shrink-0 select-none" style={{ marginRight: 2 }}>@</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/@/g, ""))}
        placeholder={placeholder}
        className="flex-1 min-w-0 bg-transparent outline-none border-none p-0 m-0"
        style={{ color: "inherit", fontSize: "inherit" }}
      />
      {name && <input type="hidden" name={name} value={value} />}
    </div>
  );
}
