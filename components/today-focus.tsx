"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { saveTodayChecklist } from "@/lib/actions";
import { Plus, X } from "lucide-react";

interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

interface Props {
  initialText?: string | null;
  updatedAt?: string | null;
  initialChecklist?: string | null;
}

function parseChecklist(raw: string | null | undefined): ChecklistItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  return [];
}

function newId() {
  return `ci_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
}

export function TodayFocus({ initialChecklist }: Props) {
  const [items, setItems] = useState<ChecklistItem[]>(() => parseChecklist(initialChecklist));
  const [draft, setDraft] = useState("");
  const [, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function persist(next: ChecklistItem[]) {
    startTransition(async () => { await saveTodayChecklist(next); });
  }

  function addItem() {
    const text = draft.trim();
    if (!text) return;
    const next = [...items, { id: newId(), text, done: false }];
    setItems(next);
    setDraft("");
    persist(next);
  }

  function toggleItem(id: string) {
    const next = items.map((item) => item.id === id ? { ...item, done: !item.done } : item);
    setItems(next);
    persist(next);
  }

  function removeItem(id: string) {
    const next = items.filter((item) => item.id !== id);
    setItems(next);
    persist(next);
  }

  const doneCount = items.filter((i) => i.done).length;

  return (
    <div className="kk-section p-5 lg:p-6 flex flex-col">
      <div className="flex items-center justify-between gap-3 mb-4">
        <p className="kk-overline">Today&apos;s focus</p>
        <div className="flex items-center gap-3">
          {items.length > 0 && (
            <span className="text-[11px] tabular-nums" style={{ color: "var(--kk-ink-faint)" }}>
              {doneCount}/{items.length} done
            </span>
          )}
          {items.length > 0 && (
            <button
              onClick={() => { setItems([]); persist([]); }}
              className="text-[12px] font-medium min-h-[44px] px-2 flex items-center"
              style={{ color: "var(--kk-ink-faint)" }}
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Checklist */}
      <div className="flex flex-col gap-1.5 flex-1">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-2.5 group cursor-pointer min-h-[44px]"
            onClick={() => toggleItem(item.id)}
          >
            <button
              onClick={(e) => { e.stopPropagation(); toggleItem(item.id); }}
              className="w-4 h-4 shrink-0 rounded flex items-center justify-center border transition-all"
              style={{
                borderColor: item.done ? "var(--kk-green)" : "var(--kk-line-strong)",
                background: item.done ? "var(--kk-green)" : "transparent",
              }}
            >
              {item.done && (
                <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                  <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
            <span
              className="flex-1 text-[13px] leading-snug"
              style={{
                color: item.done ? "var(--kk-ink-faint)" : "var(--kk-ink)",
                textDecoration: item.done ? "line-through" : "none",
              }}
            >
              {item.text}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}
              className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 w-11 h-11 flex items-center justify-center"
              style={{ color: "var(--kk-ink-faint)" }}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Add item input */}
      <div className="flex items-center gap-2 mt-4 pt-4" style={{ borderTop: "1px solid var(--kk-line)" }}>
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") addItem(); }}
          placeholder="Add a task..."
          className="flex-1 text-[13px] bg-transparent outline-none placeholder:italic"
          style={{ color: "var(--kk-ink)", caretColor: "var(--kk-accent)" }}
        />
        <button
          onClick={addItem}
          disabled={!draft.trim()}
          className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all"
          style={{
            background: draft.trim() ? "var(--kk-accent)" : "var(--kk-surface-2)",
            color: draft.trim() ? "#fff" : "var(--kk-ink-faint)",
          }}
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
