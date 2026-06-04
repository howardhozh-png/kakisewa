"use client";

import { useState, useRef, useCallback, useEffect } from "react";

// ─── Excel panel data ──────────────────────────────────────────────────────────

const ROWS = [
  { no: 1,  name: "Aiman Hafiz",    prop: "Taman PJ · B-3-12",     phone: "012-3***456", date: "01/06", reply: "Yes", notes: "Wants to renew" },
  { no: 2,  name: "Nur Farhana",    prop: "Sri Damansara A-5-8",    phone: "017-8***901", date: "01/06", reply: "",    notes: "" },
  { no: 3,  name: "Rajesh Kumar",   prop: "Taman Midah 15-3",       phone: "016-2***345", date: "02/06", reply: "",    notes: "" },
  { no: 4,  name: "Lee Soo Yin",    prop: "Kuchai Lama C-2-11",     phone: "018-6***789", date: "02/06", reply: "Yes", notes: "3BR wanted" },
  { no: 5,  name: "Ahmad Zamri",    prop: "Bukit Jalil C-12-05",    phone: "012-7***890", date: "03/06", reply: "",    notes: "" },
  { no: 6,  name: "Priya Nair",     prop: "Bangsar South 8-2A",     phone: "014-3***456", date: "03/06", reply: "",    notes: "" },
  { no: 7,  name: "Hasrul Nizam",   prop: "Pudu Ulu · Block 12-B",  phone: "011-5***678", date: "04/06", reply: "Yes", notes: "" },
  { no: 8,  name: "Mei Ling Tan",   prop: "Kepong Baru 5C",         phone: "013-9***012", date: "04/06", reply: "No",  notes: "" },
  { no: 9,  name: "Suffian Mansor", prop: "OUG Parklane A-3-11",    phone: "016-1***234", date: "05/06", reply: "",    notes: "" },
  { no: 10, name: "Lily Tang",      prop: "Connaught · 8-5B",       phone: "019-4***567", date: "05/06", reply: "Yes", notes: "Maybe later" },
];

function rowBg(reply: string) {
  if (reply === "Yes") return "#e6f4ea";
  if (reply === "No")  return "#fff3e0";
  return "#fff";
}

function ExcelPanel() {
  return (
    <div style={{ background: "#fff", userSelect: "none", fontFamily: "system-ui, sans-serif" }}>
      {/* Google Sheets-style green header */}
      <div style={{
        background: "#0f9d58", padding: "7px 12px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ fontSize: 16 }}>📊</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#fff" }}>Owner Outreach Tracker.xlsx</span>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {["Share", "↓"].map(b => (
            <div key={b} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 3, background: "rgba(255,255,255,0.18)", color: "#fff" }}>{b}</div>
          ))}
        </div>
      </div>

      {/* Toolbar */}
      <div style={{
        background: "#f8f9fa", borderBottom: "1px solid #dadce0",
        padding: "3px 10px", display: "flex", alignItems: "center", gap: 10,
        fontSize: 11, color: "#444",
      }}>
        {["File", "Edit", "View", "Insert", "Format"].map(m => (
          <span key={m} style={{ cursor: "default", opacity: 0.7 }}>{m}</span>
        ))}
      </div>

      {/* Formula bar */}
      <div style={{
        background: "#fff", borderBottom: "1px solid #e0e0e0",
        padding: "3px 8px", display: "flex", gap: 6, alignItems: "center",
      }}>
        <span style={{
          fontSize: 10, padding: "2px 5px",
          border: "1px solid #ccc", borderRadius: 2,
          background: "#fff", fontFamily: "monospace", color: "#333", minWidth: 30, textAlign: "center",
        }}>A1</span>
        <span style={{ fontSize: 10, color: "#888", fontStyle: "italic" }}>fx</span>
        <div style={{ flex: 1, background: "#f8f9fa", border: "1px solid #e0e0e0", borderRadius: 2, padding: "2px 6px", fontSize: 11, color: "#333" }}>
          No.
        </div>
      </div>

      {/* Spreadsheet grid */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          {/* Column letter headers */}
          <thead>
            <tr style={{ background: "#f2f2f2" }}>
              <th style={{ width: 26, border: "1px solid #e0e0e0", padding: "3px 0", background: "#f2f2f2" }} />
              {["A","B","C","D","E","F","G"].map(c => (
                <th key={c} style={{ border: "1px solid #e0e0e0", padding: "3px 8px", color: "#666", fontSize: 10, fontWeight: 500, textAlign: "center", background: "#f2f2f2", whiteSpace: "nowrap" }}>{c}</th>
              ))}
            </tr>
            {/* Data headers row */}
            <tr style={{ background: "#e8f0fe" }}>
              <td style={{ textAlign: "center", fontSize: 10, color: "#888", border: "1px solid #e0e0e0", background: "#f2f2f2", padding: "4px 0" }}>1</td>
              {["No.", "Owner Name", "Property", "Phone", "Date", "Reply", "Notes"].map(h => (
                <td key={h} style={{ border: "1px solid #e0e0e0", padding: "4px 8px", fontWeight: 700, fontSize: 11, color: "#1a73e8", whiteSpace: "nowrap" }}>{h}</td>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row, i) => (
              <tr key={i} style={{ background: rowBg(row.reply) }}>
                <td style={{ textAlign: "center", fontSize: 10, color: "#888", border: "1px solid #e0e0e0", background: "#f2f2f2", padding: "3px 0" }}>{i + 2}</td>
                <td style={{ border: "1px solid #e0e0e0", padding: "3px 8px", color: "#333", textAlign: "center" }}>{row.no}</td>
                <td style={{ border: "1px solid #e0e0e0", padding: "3px 8px", color: "#222", whiteSpace: "nowrap" }}>{row.name}</td>
                <td style={{ border: "1px solid #e0e0e0", padding: "3px 8px", color: "#555", whiteSpace: "nowrap" }}>{row.prop}</td>
                <td style={{ border: "1px solid #e0e0e0", padding: "3px 8px", color: "#555", fontFamily: "monospace", whiteSpace: "nowrap" }}>{row.phone}</td>
                <td style={{ border: "1px solid #e0e0e0", padding: "3px 8px", color: "#555", textAlign: "center" }}>{row.date}</td>
                <td style={{ border: "1px solid #e0e0e0", padding: "3px 8px", textAlign: "center", whiteSpace: "nowrap" }}>
                  {row.reply === "Yes" && <span style={{ color: "#1e8e3e", fontWeight: 700 }}>✓ Yes</span>}
                  {row.reply === "No"  && <span style={{ color: "#e57700" }}>No</span>}
                  {!row.reply          && <span style={{ color: "#ccc" }}>—</span>}
                </td>
                <td style={{ border: "1px solid #e0e0e0", padding: "3px 8px", color: "#666", fontStyle: row.notes ? "normal" : "italic", whiteSpace: "nowrap" }}>
                  {row.notes || <span style={{ color: "#ccc" }}>—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Sheet tabs */}
      <div style={{
        background: "#f1f3f4", borderTop: "1px solid #dadce0",
        display: "flex", alignItems: "center", gap: 0, overflow: "hidden",
      }}>
        <div style={{ padding: "6px 10px", fontSize: 10, color: "#666", opacity: 0.7 }}>+</div>
        {["Owner Leads", "Messages", "Renewals 2025", "Expiring Soon"].map((tab, i) => (
          <div key={tab} style={{
            padding: "6px 14px", fontSize: 10.5, borderRight: "1px solid #dadce0",
            background: i === 0 ? "#fff" : "transparent",
            color: i === 0 ? "#1a73e8" : "#666",
            fontWeight: i === 0 ? 600 : 400,
            borderTop: i === 0 ? "2px solid #1a73e8" : "2px solid transparent",
            whiteSpace: "nowrap",
          }}>
            {tab}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── KakiSewa panel data ───────────────────────────────────────────────────────

const CHART = [
  { m: "Jan", n: 2 }, { m: "Feb", n: 3 }, { m: "Mar", n: 4 },
  { m: "Apr", n: 2 }, { m: "May", n: 3 }, { m: "Jun", n: 5 },
  { m: "Jul", n: 4 }, { m: "Aug", n: 2 }, { m: "Sep", n: 3 },
  { m: "Oct", n: 2 }, { m: "Nov", n: 3 }, { m: "Dec", n: 2 },
];
const CHART_MAX = 5;

const KANBAN = [
  {
    title: "Follow Up",
    accent: "#F4511E",
    cards: [
      { name: "Aiman Hafiz",  prop: "The Park · A5905",    tag: "60d", tagColor: "#F4511E" },
      { name: "Nur Farhana",  prop: "Sri Damansara",       tag: "45d", tagColor: "#F4511E" },
    ],
  },
  {
    title: "Active Contract",
    accent: "#1a73e8",
    cards: [
      { name: "Rajesh Kumar", prop: "Bangsar South",       tag: "RM 2,800/mo", tagColor: "#1a73e8" },
      { name: "Lee Wei",      prop: "Mutiara Damansara",   tag: "RM 3,200/mo", tagColor: "#1a73e8" },
      { name: "Ahmad S.",     prop: "Puchong Perdana",     tag: "RM 2,100/mo", tagColor: "#1a73e8" },
    ],
  },
  {
    title: "Renew",
    accent: "#1e8e3e",
    cards: [
      { name: "Priya N.",     prop: "Subang Mewah",        tag: "+RM 2,800",   tagColor: "#1e8e3e" },
      { name: "Hasrul",       prop: "Kepong · C-12",       tag: "+RM 2,400",   tagColor: "#1e8e3e" },
    ],
  },
];

function KakiSewaPanel() {
  return (
    <div style={{ background: "#f8f9fa", userSelect: "none", fontFamily: "system-ui, sans-serif" }}>
      {/* Nav bar */}
      <div style={{
        background: "#1C1C1E", padding: "0 14px",
        display: "flex", alignItems: "center", gap: 10, height: 38,
      }}>
        <div style={{
          width: 22, height: 22, borderRadius: 5, background: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, fontWeight: 800, color: "#1C1C1E", flexShrink: 0,
        }}>K</div>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#fff", letterSpacing: "-0.01em" }}>kakisewa</span>
        <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.15)", flexShrink: 0 }} />
        {["Home", "Contracts", "New Owners"].map((l, i) => (
          <span key={l} style={{
            fontSize: 11, color: i === 1 ? "#fff" : "rgba(255,255,255,0.45)",
            fontWeight: i === 1 ? 600 : 400,
          }}>{l}</span>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{
          width: 26, height: 26, borderRadius: "50%",
          background: "#48484A", display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 10, fontWeight: 700, color: "#fff",
        }}>A</div>
      </div>

      <div style={{ padding: "16px 16px 12px" }}>
        {/* Chart header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#1C1C1E", letterSpacing: "-0.01em" }}>
              Contracts Expiring — Next 12 Months
            </p>
            <p style={{ fontSize: 10, color: "#6C6C70", marginTop: 1 }}>35 contracts tracked</p>
          </div>
          <div style={{
            padding: "3px 9px", borderRadius: 20, fontSize: 10, fontWeight: 600,
            background: "rgba(30,142,62,0.1)", color: "#1e8e3e",
          }}>
            2026
          </div>
        </div>

        {/* Bar chart */}
        <div style={{
          background: "#fff", borderRadius: 10, padding: "12px 10px 6px",
          border: "1px solid rgba(0,0,0,0.07)",
          marginBottom: 14,
        }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 72, paddingBottom: 0 }}>
            {CHART.map(d => (
              <div key={d.m} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                <div style={{
                  width: "100%", borderRadius: "3px 3px 0 0",
                  background: d.n === CHART_MAX ? "#0f9d58" : d.n >= 4 ? "#34C759" : "#a8d5b7",
                  height: `${(d.n / CHART_MAX) * 58}px`,
                  minHeight: 6,
                  transition: "height 0.3s",
                }} />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
            {CHART.map(d => (
              <div key={d.m} style={{ flex: 1, textAlign: "center", fontSize: 8, color: "#AEAEB2", fontWeight: 500 }}>
                {d.m}
              </div>
            ))}
          </div>
        </div>

        {/* Kanban board */}
        <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#AEAEB2", marginBottom: 8 }}>
          Pipeline
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {KANBAN.map(col => (
            <div key={col.title} style={{
              background: "#fff", borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.07)",
              overflow: "hidden",
            }}>
              {/* Column header */}
              <div style={{
                padding: "7px 10px", borderBottom: `2px solid ${col.accent}`,
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: col.accent }}>
                  {col.title}
                </span>
                <div style={{
                  width: 16, height: 16, borderRadius: "50%",
                  background: col.accent, color: "#fff",
                  fontSize: 9, fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>{col.cards.length}</div>
              </div>
              {/* Cards */}
              <div style={{ padding: "6px 8px", display: "flex", flexDirection: "column", gap: 5 }}>
                {col.cards.map(card => (
                  <div key={card.name} style={{
                    borderRadius: 7, padding: "6px 8px",
                    background: "#f8f9fa", border: "1px solid rgba(0,0,0,0.06)",
                  }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: "#1C1C1E", lineHeight: 1.2 }}>{card.name}</p>
                    <p style={{ fontSize: 9, color: "#6C6C70", marginTop: 1, lineHeight: 1.2 }}>{card.prop}</p>
                    <div style={{
                      marginTop: 4, display: "inline-flex", padding: "2px 6px",
                      borderRadius: 10, fontSize: 9, fontWeight: 600,
                      background: `${col.accent}18`, color: col.accent,
                    }}>
                      {card.tag}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Slider shell ──────────────────────────────────────────────────────────────

export function ComparisonSlider() {
  const [activePanel, setActivePanel] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [offset, setOffset] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const startOffset = useRef(0);
  const dragging = useRef(false);

  function getWidth() {
    return containerRef.current?.offsetWidth ?? 0;
  }

  const goToPanel = useCallback((panel: number) => {
    const w = getWidth();
    setActivePanel(panel);
    setOffset(panel * w);
  }, []);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    dragging.current = true;
    setIsDragging(true);
    startX.current = e.clientX;
    startOffset.current = offset;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging.current) return;
    const delta = startX.current - e.clientX;
    const w = getWidth();
    setOffset(Math.max(0, Math.min(w, startOffset.current + delta)));
  }

  function onPointerUp() {
    if (!dragging.current) return;
    dragging.current = false;
    setIsDragging(false);
    const w = getWidth();
    const pct = offset / w;
    const target = pct > 0.5 ? 1 : 0;
    setActivePanel(target);
    setOffset(target * w);
  }

  // Sync offset when panel changes via button
  useEffect(() => {
    setOffset(activePanel * getWidth());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-[960px] mx-auto">
      {/* Section header */}
      <div className="text-center mb-10">
        <p className="uppercase font-semibold mb-5" style={{ fontSize: "var(--kk-xs)", color: "var(--kk-ink-faint)", letterSpacing: "0.14em" }}>
          The income gap
        </p>
        <h2 className="serif mx-auto" style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)", lineHeight: 1.1, letterSpacing: "-0.022em", maxWidth: "28ch" }}>
          How agents work{" "}
          <span style={{ color: "#DC2626" }}>today</span>{" "}
          vs{" "}
          <span style={{ color: "var(--kk-green)" }}>with kakisewa</span>
        </h2>
      </div>

      {/* Tab nav */}
      <div className="flex justify-center mb-5">
        <div className="inline-flex rounded-full overflow-hidden" style={{ border: "1px solid var(--kk-line)", background: "#fff" }}>
          <button
            onClick={() => goToPanel(0)}
            className="px-6 py-2 text-[12px] font-semibold transition-all"
            style={{
              background: activePanel === 0 ? "#141414" : "transparent",
              color: activePanel === 0 ? "#fff" : "#888",
              borderRight: "1px solid var(--kk-line)",
            }}
          >
            ✗ Today
          </button>
          <button
            onClick={() => goToPanel(1)}
            className="px-6 py-2 text-[12px] font-semibold transition-all"
            style={{
              background: activePanel === 1 ? "var(--kk-green)" : "transparent",
              color: activePanel === 1 ? "#fff" : "#888",
            }}
          >
            ✓ With kakisewa
          </button>
        </div>
      </div>

      {/* Slider container */}
      <div
        ref={containerRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{
          overflow: "hidden",
          borderRadius: "1rem",
          border: "1px solid var(--kk-line)",
          cursor: isDragging ? "grabbing" : "grab",
          touchAction: "pan-y",
        }}
      >
        <div
          style={{
            display: "flex",
            width: "200%",
            transform: `translateX(-${offset}px)`,
            transition: isDragging ? "none" : "transform 0.42s cubic-bezier(0.22,1,0.36,1)",
            willChange: "transform",
          }}
        >
          <div style={{ width: "50%", flexShrink: 0, pointerEvents: "none" }}>
            <ExcelPanel />
          </div>
          <div style={{ width: "50%", flexShrink: 0, pointerEvents: "none" }}>
            <KakiSewaPanel />
          </div>
        </div>
      </div>

      {/* Drag hint */}
      <p className="text-center mt-3 text-[12px]" style={{ color: "var(--kk-ink-faint)" }}>
        Drag left or right to compare
      </p>
    </div>
  );
}
