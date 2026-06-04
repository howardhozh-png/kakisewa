"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { GripVertical } from "lucide-react";

// ─── Excel panel data ──────────────────────────────────────────────────────────

const ROWS = [
  { no: 1,  name: "Aiman Hafiz",   prop: "Taman PJ · B-3-12",    phone: "012-3***456", date: "01/06", reply: "Yes", notes: "Wants to renew" },
  { no: 2,  name: "Nur Farhana",   prop: "Sri Damansara A-5-8",   phone: "017-8***901", date: "01/06", reply: "",    notes: "" },
  { no: 3,  name: "Rajesh Kumar",  prop: "Taman Midah 15-3",      phone: "016-2***345", date: "02/06", reply: "",    notes: "" },
  { no: 4,  name: "Lee Soo Yin",   prop: "Kuchai Lama C-2-11",    phone: "018-6***789", date: "02/06", reply: "Yes", notes: "3BR wanted" },
  { no: 5,  name: "Ahmad Zamri",   prop: "Bukit Jalil C-12-05",   phone: "012-7***890", date: "03/06", reply: "",    notes: "" },
  { no: 6,  name: "Priya Nair",    prop: "Bangsar South 8-2A",    phone: "014-3***456", date: "03/06", reply: "",    notes: "" },
  { no: 7,  name: "Hasrul Nizam",  prop: "Pudu Ulu · 12-B",       phone: "011-5***678", date: "04/06", reply: "Yes", notes: "" },
  { no: 8,  name: "Lily Tang",     prop: "Connaught · 8-5B",      phone: "019-4***567", date: "05/06", reply: "Yes", notes: "Maybe later" },
];

function rowBg(reply: string) {
  if (reply === "Yes") return "#e6f4ea";
  if (reply === "No")  return "#fff3e0";
  return "#fff";
}

function ExcelPanel() {
  return (
    <div style={{
      background: "#fff", userSelect: "none",
      fontFamily: "system-ui, sans-serif",
      height: 480, display: "flex", flexDirection: "column",
    }}>
      {/* Google Sheets-style green header */}
      <div style={{
        background: "#0f9d58", padding: "7px 12px", flexShrink: 0,
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
        background: "#f8f9fa", borderBottom: "1px solid #dadce0", flexShrink: 0,
        padding: "3px 10px", display: "flex", alignItems: "center", gap: 10,
        fontSize: 11, color: "#444",
      }}>
        {["File", "Edit", "View", "Insert", "Format"].map(m => (
          <span key={m} style={{ cursor: "default", opacity: 0.7 }}>{m}</span>
        ))}
      </div>

      {/* Formula bar */}
      <div style={{
        background: "#fff", borderBottom: "1px solid #e0e0e0", flexShrink: 0,
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
      <div style={{ flex: 1, overflowX: "auto", overflowY: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead>
            <tr style={{ background: "#f2f2f2" }}>
              <th style={{ width: 26, border: "1px solid #e0e0e0", padding: "3px 0", background: "#f2f2f2" }} />
              {["A","B","C","D","E","F","G"].map(c => (
                <th key={c} style={{ border: "1px solid #e0e0e0", padding: "3px 8px", color: "#666", fontSize: 10, fontWeight: 500, textAlign: "center", background: "#f2f2f2", whiteSpace: "nowrap" }}>{c}</th>
              ))}
            </tr>
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
                <td style={{ border: "1px solid #e0e0e0", padding: "3px 8px", color: "#666", whiteSpace: "nowrap" }}>
                  {row.notes || <span style={{ color: "#ccc" }}>—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Sheet tabs */}
      <div style={{
        background: "#f1f3f4", borderTop: "1px solid #dadce0", flexShrink: 0,
        display: "flex", alignItems: "center", overflow: "hidden",
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

const CHART_DATA = [750, 1250, 1750, 900, 1250, 2400, 1750, 900, 1250, 900, 1250, 900];
const CHART_MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const CHART_MAX = 2400;

const KANBAN = [
  {
    id: "expiring",
    title: "EXPIRING",
    icon: "⚠",
    accent: "#F4511E",
    cards: [
      { name: "Aiman Hafiz",  prop: "The Park · A5905 · exp 15 Jul 2026", badge: "⚠ 41d",  badgeColor: "#F4511E" },
      { name: "Nur Farhana",  prop: "Sri Damansara",                       badge: "⚠ 22d",  badgeColor: "#F4511E" },
    ],
  },
  {
    id: "renewing",
    title: "RENEWING",
    icon: "✓",
    accent: "#34C759",
    cards: [
      { name: "Rajesh Kumar", prop: "Bangsar South",      badge: "✓ Commission due", badgeColor: "#34C759" },
      { name: "Lee Wei",      prop: "Mutiara Damansara",  badge: "✓ Commission due", badgeColor: "#34C759" },
    ],
  },
  {
    id: "active",
    title: "ACTIVE",
    icon: "○",
    accent: "#AEAEB2",
    cards: [
      { name: "Ahmad S.",  prop: "Puchong Perdana", badge: "✓ 198d remain", badgeColor: "#34C759" },
      { name: "Priya N.",  prop: "Subang Mewah",    badge: "✓ 156d remain", badgeColor: "#34C759" },
      { name: "Hasrul",    prop: "Kepong C-12",      badge: "✓ 89d remain",  badgeColor: "#34C759" },
    ],
  },
];

function KakiSewaPanel() {
  return (
    <div style={{
      background: "#F2F2F7", userSelect: "none",
      fontFamily: "system-ui, sans-serif",
      height: 480, display: "flex", flexDirection: "column",
    }}>
      {/* Nav bar */}
      <div style={{
        background: "#1C1C1E", padding: "0 14px", flexShrink: 0,
        display: "flex", alignItems: "center", gap: 10, height: 38,
      }}>
        <div style={{
          width: 22, height: 22, borderRadius: 5, background: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, fontWeight: 800, color: "#1C1C1E", flexShrink: 0,
        }}>K</div>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#fff", letterSpacing: "-0.01em" }}>kakisewa</span>
        <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.15)", flexShrink: 0 }} />
        {[
          { label: "Home", active: false },
          { label: "Existing Contracts", active: true },
          { label: "New Owners", active: false },
        ].map(l => (
          <span key={l.label} style={{
            fontSize: 11,
            color: l.active ? "#fff" : "rgba(255,255,255,0.45)",
            fontWeight: l.active ? 700 : 400,
            borderBottom: l.active ? "1.5px solid #fff" : "none",
            paddingBottom: l.active ? 1 : 0,
          }}>{l.label}</span>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{
          width: 26, height: 26, borderRadius: "50%",
          background: "#48484A", display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 10, fontWeight: 700, color: "#fff",
        }}>A</div>
      </div>

      <div style={{ flex: 1, padding: 14, overflowY: "hidden", display: "flex", flexDirection: "column", gap: 10 }}>
        {/* Page title */}
        <div>
          <p style={{ fontSize: 18, fontWeight: 700, color: "#1C1C1E", letterSpacing: "-0.02em", fontFamily: "Georgia, serif" }}>
            Existing Contracts
          </p>
          <p style={{ fontSize: 11, color: "#AEAEB2", marginTop: 2 }}>Your renewal commission is passive income.</p>
          <div style={{ marginTop: 8, borderBottom: "1px solid rgba(0,0,0,0.08)", paddingBottom: 6 }}>
            <span style={{
              fontSize: 12, fontWeight: 600, color: "#1C1C1E",
              borderBottom: "2px solid #1C1C1E", paddingBottom: 6,
            }}>
              Existing contracts&nbsp;&nbsp;35
            </span>
          </div>
        </div>

        {/* Chart box */}
        <div style={{
          background: "#fff", borderRadius: 10, border: "1px solid rgba(0,0,0,0.07)",
          padding: "10px 12px",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <div>
              <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#AEAEB2" }}>
                RENEWAL INCOME · NEXT 12 MONTHS
              </p>
              <p style={{ fontSize: 22, fontWeight: 700, color: "#1C1C1E", letterSpacing: "-0.03em", marginTop: 2 }}>RM 14,800</p>
              <p style={{ fontSize: 10, color: "#6C6C70", marginTop: 1 }}>35 contracts · 50% commission per renewal</p>
            </div>
            <span style={{ fontSize: 10, color: "#AEAEB2" }}>Next 12 months</span>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 60, marginTop: 6 }}>
            {CHART_DATA.map((v, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                <div style={{
                  width: "100%", borderRadius: "2px 2px 0 0",
                  background: v === CHART_MAX ? "#0f9d58" : "#34C759",
                  height: `${Math.round((v / CHART_MAX) * 52)}px`,
                  minHeight: 4,
                }} />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 3, marginTop: 3 }}>
            {CHART_MONTHS.map(m => (
              <div key={m} style={{ flex: 1, textAlign: "center", fontSize: 7, color: "#AEAEB2", fontWeight: 500 }}>{m}</div>
            ))}
          </div>
        </div>

        {/* Kanban */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, flex: 1 }}>
          {KANBAN.map(col => (
            <div key={col.id} style={{
              background: "#fff", borderRadius: 10,
              borderTop: `2px solid ${col.accent}`,
              border: `1px solid rgba(0,0,0,0.07)`,
              borderTopColor: col.accent,
              overflow: "hidden",
            }}>
              <div style={{ padding: "7px 10px 5px", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                <span style={{
                  fontSize: 9, fontWeight: 700, textTransform: "uppercase",
                  letterSpacing: "0.06em", color: col.accent,
                }}>
                  {col.icon} {col.title}&nbsp;&nbsp;{col.cards.length}
                </span>
              </div>
              <div style={{ padding: "6px 8px", display: "flex", flexDirection: "column", gap: 5 }}>
                {col.cards.map(card => (
                  <div key={card.name} style={{
                    background: "#fff", borderRadius: 8,
                    border: "1px solid rgba(0,0,0,0.07)",
                    padding: "8px 10px",
                  }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "#1C1C1E", lineHeight: 1.2 }}>{card.name}</p>
                    <p style={{ fontSize: 10, color: "#6C6C70", marginTop: 1, lineHeight: 1.2 }}>{card.prop}</p>
                    <div style={{
                      marginTop: 5, display: "inline-flex", padding: "2px 7px",
                      borderRadius: 20, fontSize: 9, fontWeight: 600,
                      background: `${card.badgeColor}1a`, color: card.badgeColor,
                    }}>
                      {card.badge}
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

// ─── ClipPath drag slider ──────────────────────────────────────────────────────

export function ComparisonSlider() {
  const [position, setPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startPos = useRef(50);

  const getPos = useCallback((clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return 50;
    return Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
  }, []);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    dragging.current = true;
    startX.current = e.clientX;
    startPos.current = position;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging.current) return;
    setPosition(getPos(e.clientX));
  }

  function onPointerUp() {
    dragging.current = false;
  }

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
        <p style={{ fontSize: 12, color: "var(--kk-ink-faint)", marginTop: 8 }}>Drag the handle to compare</p>
      </div>

      {/* Slider container */}
      <div
        ref={containerRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{
          position: "relative",
          overflow: "hidden",
          height: 480,
          borderRadius: "1rem",
          border: "1px solid var(--kk-line)",
          cursor: "ew-resize",
          userSelect: "none",
        }}
      >
        {/* Bottom layer — Excel (Today) */}
        <div style={{ position: "absolute", inset: 0 }}>
          <ExcelPanel />
        </div>

        {/* Top layer — KakiSewa, clipped to show right portion */}
        <div style={{
          position: "absolute",
          inset: 0,
          clipPath: `inset(0 ${100 - position}% 0 0)`,
        }}>
          <KakiSewaPanel />
        </div>

        {/* Divider line */}
        <div style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: `${position}%`,
          width: 2,
          background: "rgba(255,255,255,0.85)",
          boxShadow: "0 0 0 1px rgba(0,0,0,0.1)",
          zIndex: 20,
          pointerEvents: "none",
          transform: "translateX(-1px)",
        }} />

        {/* Drag handle */}
        <button
          style={{
            position: "absolute",
            left: `${position}%`,
            top: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 21,
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: "#fff",
            border: "1.5px solid rgba(0,0,0,0.12)",
            cursor: "ew-resize",
            boxShadow: "0 2px 10px rgba(0,0,0,0.18)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <GripVertical style={{ width: 15, height: 15, color: "#888" }} />
        </button>

        {/* "✗ Today" label */}
        <div style={{ position: "absolute", bottom: 12, left: 14, zIndex: 15, pointerEvents: "none" }}>
          <span style={{
            background: "rgba(0,0,0,0.55)",
            color: "#ef4444",
            fontSize: 10,
            fontWeight: 700,
            padding: "3px 8px",
            borderRadius: 20,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}>✗ Today</span>
        </div>

        {/* "✓ With kakisewa" label */}
        <div style={{ position: "absolute", bottom: 12, right: 14, zIndex: 15, pointerEvents: "none" }}>
          <span style={{
            background: "rgba(0,0,0,0.55)",
            color: "#34C759",
            fontSize: 10,
            fontWeight: 700,
            padding: "3px 8px",
            borderRadius: 20,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}>✓ With kakisewa</span>
        </div>
      </div>
    </div>
  );
}
