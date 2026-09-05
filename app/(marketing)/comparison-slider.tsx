"use client";

import { useState, useRef } from "react";
import { GripVertical, MessageCircle, ArrowRight, Check, Calendar, User } from "lucide-react";

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
      height: 510, display: "flex", flexDirection: "column",
    }}>
      {/* Excel-style title bar — plain filename, no logo, no share/download */}
      <div style={{
        background: "#217346", padding: "7px 12px", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#fff" }}>Owner Outreach Tracker.xlsx</span>
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
      <div style={{ flex: 1, overflow: "hidden" }}>
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

// Contracts expiring per month (Sep–Aug), Sep+Oct highlighted as expiring soon
const EXPIRY_DATA = [2, 4, 3, 5, 2, 3, 6, 4, 3, 5, 4, 3];
const EXPIRY_MONTHS = ["Sep","Oct","Nov","Dec","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug"];
const EXPIRY_MAX = 6;
// Sep (index 0) and Oct (index 1) are expiring within 60 days — highlighted amber
const EXPIRY_HIGHLIGHT = new Set([0, 1]);

const LIFECYCLE_COLS = [
  {
    id: "expired",
    title: "EXPIRED",
    dotColor: "#C62828",
    subtitle: "Contract ended. Act now.",
    colBg: "#FEF2F2",
    count: 2,
    cards: [
      {
        prop: "Setapak D-5", owner: "Ahmad Zamri", rent: "RM 1,600/mo", endDate: "15 Aug '26",
        days: -14, photo: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=120&h=120&fit=crop&crop=center&auto=format&q=80",
      },
    ],
  },
  {
    id: "expiring",
    title: "EXPIRING",
    dotColor: "#3D3D44",
    subtitle: "Expiring within 60 days. Reach out now.",
    colBg: "rgba(61,61,68,0.06)",
    count: 4,
    cards: [
      {
        prop: "Kepong A-12", owner: "Hafiz bin Nordin", rent: "RM 1,800/mo", endDate: "5 Nov '26",
        days: 62, photo: "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=120&h=120&fit=crop&crop=center&auto=format&q=80",
      },
      {
        prop: "Sri Rampai B-3", owner: "Priya Nair", rent: "RM 2,100/mo", endDate: "8 Nov '26",
        days: 65, photo: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=120&h=120&fit=crop&crop=center&auto=format&q=80",
      },
    ],
  },
  {
    id: "renewing",
    title: "RENEWING",
    dotColor: "#34C759",
    subtitle: "Confirmed renewal. Contract being prepared.",
    colBg: "rgba(52,199,89,0.08)",
    count: 3,
    cards: [
      {
        prop: "Mont Kiara P-8", owner: "Chen Wei Lim", rent: "RM 3,200/mo", endDate: "31 Jan '27",
        days: 149, photo: "https://images.unsplash.com/photo-1585128792020-803d29415281?w=120&h=120&fit=crop&crop=center&auto=format&q=80",
      },
    ],
  },
  {
    id: "active",
    title: "ACTIVE",
    dotColor: "#AEAEB2",
    subtitle: "Running. No action needed yet.",
    colBg: "#F5F5F7",
    count: 12,
    cards: [
      {
        prop: "Ara Damansara", owner: "Lee Soo Yin", rent: "RM 2,800/mo", endDate: "15 Mar '27",
        days: 212, photo: "https://images.unsplash.com/photo-1665249934445-1de680641f50?w=120&h=120&fit=crop&crop=center&auto=format&q=80",
      },
      {
        prop: "Bukit Jalil E-2", owner: "Razif Hanafi", rent: "RM 1,900/mo", endDate: "28 Apr '27",
        days: 256, photo: "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=120&h=120&fit=crop&crop=center&auto=format&q=80",
      },
    ],
  },
];

function daysPill(days: number) {
  if (days < 0)    return { bg: "rgba(0,0,0,0.05)",      color: "#86868B",  label: `${Math.abs(days)}d over` };
  if (days <= 30)  return { bg: "rgba(255,59,48,0.10)",  color: "#C62828",  label: `${days}d` };
  if (days <= 90)  return { bg: "rgba(255,149,0,0.12)",  color: "#B45309",  label: `${days}d` };
  return             { bg: "rgba(52,199,89,0.10)",   color: "#1F8B4C",  label: `${days}d` };
}

function KakiSewaPanel() {
  return (
    <div style={{
      background: "#FBFBFD", userSelect: "none",
      fontFamily: "system-ui, -apple-system, sans-serif",
      height: 510, display: "flex", flexDirection: "column",
    }}>
      {/* Top nav */}
      <div style={{
        background: "#fff", borderBottom: "1px solid rgba(0,0,0,0.08)",
        padding: "0 14px", flexShrink: 0,
        display: "flex", alignItems: "center", gap: 8, height: 44,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <span style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 20, color: "#1D1D1F", lineHeight: 1, letterSpacing: "-0.02em" }}>k</span>
          <span style={{ fontFamily: "var(--font-journal)", fontSize: 14, fontWeight: 400, color: "#1D1D1F", lineHeight: 1 }}>kakisewa</span>
        </div>
        <div style={{ width: 1, height: 14, background: "rgba(0,0,0,0.1)", flexShrink: 0 }} />
        {[
          { label: "Home", active: false },
          { label: "New Owners", active: false },
          { label: "Existing Contracts", active: true },
        ].map(l => (
          <span key={l.label} style={{
            fontSize: 10.5, color: l.active ? "#1D1D1F" : "#86868B",
            fontWeight: l.active ? 600 : 400,
            background: l.active ? "rgba(0,0,0,0.06)" : "transparent",
            borderRadius: 6, padding: "3px 6px", whiteSpace: "nowrap",
          }}>{l.label}</span>
        ))}
        <div style={{ flex: 1 }} />
        <span style={{
          fontSize: 8, fontWeight: 800, padding: "2px 7px", borderRadius: 20,
          background: "linear-gradient(135deg, #b8962e, #e8c84a, #9a7a22)",
          color: "#fff", letterSpacing: "0.06em", textTransform: "uppercase", flexShrink: 0,
        }}>ELITE TIER</span>
        <span style={{
          fontSize: 7.5, fontWeight: 700, padding: "2px 6px", borderRadius: 4,
          background: "rgba(0,0,0,0.08)", color: "#86868B",
          letterSpacing: "0.06em", textTransform: "uppercase", flexShrink: 0,
        }}>SAMPLE</span>
        <div style={{
          width: 24, height: 24, borderRadius: "50%", background: "#e8e8e8",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 9, fontWeight: 700, color: "#1D1D1F", flexShrink: 0,
        }}>HH</div>
      </div>

      <div style={{ flex: 1, padding: "12px 14px 10px", overflowY: "hidden", display: "flex", flexDirection: "column", gap: 9 }}>
        {/* Page title */}
        <div>
          <p style={{
            fontSize: 22, fontWeight: 700, color: "#1D1D1F",
            letterSpacing: "-0.03em", lineHeight: 1,
            fontFamily: "Georgia, 'Times New Roman', serif",
          }}>Existing Listing</p>
          <p style={{ fontSize: 10, color: "#86868B", marginTop: 3 }}>
            Track every tenancy. Get alerted 60 days before any contract expires.
          </p>
          <div style={{ marginTop: 8, borderBottom: "1px solid rgba(0,0,0,0.08)", display: "flex", alignItems: "flex-end" }}>
            <span style={{
              fontSize: 11, fontWeight: 600, color: "#1D1D1F",
              borderBottom: "2px solid #1D1D1F", paddingBottom: 6, display: "inline-block",
            }}>
              All contracts &nbsp;
              <span style={{ background: "#1D1D1F", color: "#fff", borderRadius: "50%", fontSize: 9, padding: "1px 5px", fontWeight: 700 }}>47</span>
            </span>
          </div>
        </div>

        {/* Chart box */}
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid rgba(0,0,0,0.08)", padding: "10px 12px", flexShrink: 0 }}>
          <p style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#86868B" }}>
            CONTRACT RENEWALS · NEXT 12 MONTHS
          </p>
          <p style={{ fontSize: 20, fontWeight: 700, color: "#1D1D1F", letterSpacing: "-0.03em", marginTop: 2, lineHeight: 1 }}>47 contracts</p>
          <p style={{ fontSize: 9, color: "#6E6E73", marginTop: 2 }}>4 expiring in 60 days · RM 7,800/mo at risk</p>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 36, marginTop: 8 }}>
            {EXPIRY_DATA.map((v, i) => (
              <div key={i} style={{ flex: 1 }}>
                <div style={{
                  width: "100%", borderRadius: "2px 2px 0 0",
                  background: EXPIRY_HIGHLIGHT.has(i) ? "#B45309" : "#AEAEB2",
                  height: `${Math.round((v / EXPIRY_MAX) * 32)}px`,
                  minHeight: 3,
                }} />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 2, marginTop: 3 }}>
            {EXPIRY_MONTHS.map((m, i) => (
              <div key={m} style={{ flex: 1, textAlign: "center", fontSize: 6.5, color: EXPIRY_HIGHLIGHT.has(i) ? "#B45309" : "#AEAEB2", fontWeight: EXPIRY_HIGHLIGHT.has(i) ? 700 : 400 }}>{m}</div>
            ))}
          </div>
        </div>

        {/* Lifecycle board */}
        <div style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column" }}>
          {/* "Don't forget your money!" tooltip above EXPIRING column */}
          <div style={{ position: "absolute", top: -28, left: "26%", pointerEvents: "none" }}>
            <div style={{
              background: "#3D3D44", color: "#fff", borderRadius: 22,
              padding: "6px 14px", fontSize: 8.5, fontWeight: 700,
              display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
              boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
            }}>
              <MessageCircle style={{ width: 13, height: 13, color: "#fff" }} />
              Don&#39;t forget your money!
            </div>
            <div style={{
              width: 0, height: 0,
              borderLeft: "7px solid transparent",
              borderRight: "7px solid transparent",
              borderTop: "7px solid #3D3D44",
              marginLeft: 20,
            }} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.1fr 1fr 1fr", gap: 7, flex: 1, overflow: "hidden" }}>
            {LIFECYCLE_COLS.map(col => (
              <div key={col.id} style={{
                background: col.colBg, borderRadius: 10,
                border: "1px solid rgba(0,0,0,0.08)",
                overflow: "hidden", display: "flex", flexDirection: "column",
              }}>
                {/* Column header */}
                <div style={{ padding: "7px 9px 4px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 8.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#1D1D1F", display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: col.dotColor, display: "inline-block", flexShrink: 0 }} />
                      {col.title}
                    </span>
                    <span style={{ fontSize: 8.5, color: "#86868B", fontWeight: 600 }}>{col.count}</span>
                  </div>
                  <p style={{
                    fontSize: 7.5, color: "#86868B", marginTop: 2, lineHeight: 1.4,
                    display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
                  }}>{col.subtitle}</p>
                </div>

                {/* Cards */}
                <div style={{ padding: "4px 7px 7px", display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
                  {col.cards.map(card => {
                    const pill = daysPill(card.days);
                    return (
                      <div key={card.prop} style={{
                        background: "#fff", borderRadius: 7,
                        border: "1px solid rgba(0,0,0,0.07)",
                        padding: "6px 7px", overflow: "hidden",
                      }}>
                        {/* Photo + info row */}
                        <div style={{ display: "flex", gap: 6 }}>
                          <div style={{
                            width: 38, height: 38, borderRadius: 6, flexShrink: 0,
                            overflow: "hidden", background: "#F2F2F7",
                            border: "1px solid rgba(0,0,0,0.06)",
                          }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={card.photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center", gap: 2, overflow: "hidden" }}>
                            {/* Property name + days pill */}
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 3 }}>
                              <p style={{ fontSize: 9, fontWeight: 600, color: "#1D1D1F", lineHeight: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>{card.prop}</p>
                              <span style={{ fontSize: 7, fontWeight: 700, color: pill.color, background: pill.bg, borderRadius: 20, padding: "1px 4px", flexShrink: 0, whiteSpace: "nowrap" }}>{pill.label}</span>
                            </div>
                            {/* Rent */}
                            <p style={{ fontSize: 8, color: "#1D1D1F", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{card.rent}</p>
                            {/* Owner */}
                            <p style={{ fontSize: 7.5, color: "#6E6E73", display: "flex", alignItems: "center", gap: 2, overflow: "hidden", whiteSpace: "nowrap" }}>
                              <User style={{ width: 7, height: 7, flexShrink: 0 }} />
                              <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{card.owner}</span>
                            </p>
                            {/* Contract end date */}
                            <p style={{ fontSize: 7.5, color: "#86868B", display: "flex", alignItems: "center", gap: 2, overflow: "hidden", whiteSpace: "nowrap" }}>
                              <Calendar style={{ width: 7, height: 7, flexShrink: 0 }} />
                              <span>{card.endDate}</span>
                            </p>
                          </div>
                        </div>
                        {/* Action CTA */}
                        {col.id === "expired" && (
                          <div style={{
                            marginTop: 5, display: "flex", alignItems: "center", justifyContent: "space-between",
                            background: "rgba(198,40,40,0.08)", borderRadius: 6, padding: "4px 7px",
                            fontSize: 8, fontWeight: 600, color: "#C62828", whiteSpace: "nowrap",
                          }}>
                            <span>Follow up now</span>
                            <ArrowRight style={{ width: 9, height: 9, flexShrink: 0 }} />
                          </div>
                        )}
                        {col.id === "expiring" && (
                          <div style={{
                            marginTop: 5, display: "flex", alignItems: "center", justifyContent: "space-between",
                            background: "rgba(52,199,89,0.10)", borderRadius: 6, padding: "4px 7px",
                            fontSize: 8, fontWeight: 600, color: "#1F8B4C", whiteSpace: "nowrap",
                          }}>
                            <span>Message owner</span>
                            <ArrowRight style={{ width: 9, height: 9, flexShrink: 0 }} />
                          </div>
                        )}
                        {col.id === "renewing" && (
                          <div style={{
                            marginTop: 5, display: "flex", alignItems: "center", gap: 3,
                            fontSize: 8, color: "#1F8B4C", whiteSpace: "nowrap",
                          }}>
                            <Check style={{ width: 9, height: 9, color: "#34C759", flexShrink: 0 }} />
                            <span>Renewing</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ClipPath drag slider ──────────────────────────────────────────────────────

export function ComparisonSlider() {
  const [position, setPosition] = useState(30);
  const [interacted, setInteracted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startPos = useRef(50);

  // Window-level listeners instead of relying only on setPointerCapture —
  // reported as "doesn't drag, hard to use" on a MacBook trackpad on first
  // try. Element-level pointer capture can be inconsistent with trackpad
  // input in some browsers; binding move/up to window is the more robust,
  // standard pattern for custom drag UIs and doesn't depend on capture
  // behaving correctly.
  function movePosition(clientX: number) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const deltaPct = ((clientX - startX.current) / rect.width) * 100;
    setPosition(Math.max(0, Math.min(100, startPos.current + deltaPct)));
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    dragging.current = true;
    setInteracted(true);
    startX.current = e.clientX;
    startPos.current = position;

    const onMove = (ev: PointerEvent) => {
      if (!dragging.current) return;
      movePosition(ev.clientX);
    };
    const onUp = () => {
      dragging.current = false;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }

  return (
    <div className="max-w-[960px] mx-auto">
      {/* Section header */}
      <div className="text-center mb-10">
        <p className="uppercase font-semibold mb-5" style={{ fontSize: "var(--kk-xs)", color: "var(--kk-ink-faint)", letterSpacing: "0.14em" }}>
          Never lose track
        </p>
        <h2 className="serif mx-auto" style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)", lineHeight: 1.1, letterSpacing: "-0.022em", maxWidth: "28ch", color: "#1D1D1F" }}>
          <span style={{ color: "#34C759" }}>02 </span>kakisewa tracks everything, forever
        </h2>
      </div>

      {/* Labels above the slider */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, padding: "0 2px" }}>
        <span style={{
          background: "rgba(0,0,0,0.08)", color: "#1D1D1F",
          fontSize: 10, fontWeight: 700, padding: "4px 12px",
          borderRadius: 20, textTransform: "uppercase", letterSpacing: "0.08em",
        }}>✗ Today</span>
        <span style={{
          background: "rgba(52,199,89,0.12)", color: "#34C759",
          fontSize: 10, fontWeight: 700, padding: "4px 12px",
          borderRadius: 20, textTransform: "uppercase", letterSpacing: "0.08em",
        }}>✓ With kakisewa</span>
      </div>

      {/* Slider container */}
      <div
        ref={containerRef}
        onPointerDown={onPointerDown}
        style={{
          position: "relative",
          overflow: "hidden",
          height: 510,
          borderRadius: "1rem",
          border: "1px solid var(--kk-line)",
          cursor: "ew-resize",
          userSelect: "none",
          touchAction: "none",
        }}
      >
        {/* Bottom layer — KakiSewa */}
        <div style={{ position: "absolute", inset: 0, zIndex: 1 }}>
          <KakiSewaPanel />
        </div>

        {/* Top layer — Excel (Today), clipped to show left portion */}
        <div style={{
          position: "absolute", inset: 0, zIndex: 3,
          clipPath: `inset(0 ${100 - position}% 0 0)`,
        }}>
          <ExcelPanel />
        </div>

        {/* Divider line */}
        <div style={{
          position: "absolute", top: 0, bottom: 0,
          left: `${position}%`, width: 2,
          background: "rgba(255,255,255,0.85)",
          boxShadow: "0 0 0 1px rgba(0,0,0,0.1)",
          zIndex: 20, pointerEvents: "none", transform: "translateX(-1px)",
        }} />

        {/* Drag handle — wiggles left-right until the visitor tries it once */}
        <button
          className={interacted ? "" : "kk-slide-handle-hint"}
          style={{
            position: "absolute", left: `${position}%`, top: "50%",
            marginTop: -18, transform: "translateX(-50%)", zIndex: 21,
            width: 36, height: 36, borderRadius: "50%",
            background: "#fff", border: "1.5px solid rgba(0,0,0,0.12)",
            cursor: "ew-resize", boxShadow: "0 2px 10px rgba(0,0,0,0.18)",
            display: "flex", alignItems: "center", justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <GripVertical style={{ width: 15, height: 15, color: "#888" }} />
        </button>
      </div>

      <style>{`
        @keyframes kk-slide-handle-hint {
          0%, 100% { transform: translateX(-50%); }
          25%      { transform: translateX(calc(-50% - 10px)); }
          75%      { transform: translateX(calc(-50% + 10px)); }
        }
        .kk-slide-handle-hint { animation: kk-slide-handle-hint 1.8s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
