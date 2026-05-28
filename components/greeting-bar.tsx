"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Medal, Circle, CheckCircle2 } from "lucide-react";
import { bumpStreak } from "@/lib/actions";

function formatTime(d: Date): string {
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function formatDate(d: Date): string {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
}

function todayKey(): string {
  const d = new Date(Date.now() + 8 * 60 * 60 * 1000); // shift to GMT+8
  return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
}

const MESSAGES = [
  "every deal you close today is a brick in the house you are building for yourself.",
  "the calls you make today are the commissions you celebrate tomorrow.",
  "showing up consistently is the most underrated superpower in this business.",
  "one good conversation today can change everything.",
  "trust the process and keep following up, the right doors will open.",
  "every small action you take today compounds into something you will be proud of.",
  "remember to drink water and take a short walk today, your body fuels your hustle.",
  "a 20 minute walk clears the mind better than an hour of overthinking.",
  "eat a proper meal today, you cannot close deals running on empty.",
  "step away from the screen for a bit, fresh eyes close more deals.",
  "your health is your most important asset, protect it like you protect your pipeline.",
  "call someone you love today, the deal can wait a few minutes.",
  "the people cheering for you at home are the real reason you show up every day.",
  "do not let the busy days steal the moments that matter most with your family.",
  "your family is proud of you even on the quiet days, let them know you are proud of them too.",
  "plan something fun with the people you love soon, you have earned it.",
  "rest is not laziness, it is how you stay sharp for the long game.",
  "you are further along than you think, keep going.",
  "progress is not always visible but it is always happening.",
  "the market has its cycles and so will your wins, stay the course.",
  "small wins still count, take a moment to celebrate them.",
  "you are building more than a career, you are building a life.",
  "gratitude is a good place to start the day from, think of one thing you are thankful for.",
  "your consistency today is someone else watching and being inspired by.",
  "success in this business is not a sprint, pace yourself and keep your people close.",
];

const MAX = 2;
const STORAGE_KEY = "kk_fortune";
const CHECKIN_KEY_PREFIX = "kk_checkin_";

function hasCheckedInToday(): boolean {
  try {
    return !!localStorage.getItem(`${CHECKIN_KEY_PREFIX}${todayKey()}`);
  } catch { return false; }
}

function markCheckedInToday() {
  try {
    localStorage.setItem(`${CHECKIN_KEY_PREFIX}${todayKey()}`, "1");
  } catch { /* ignore */ }
}

const STREAK_PHRASES = [
  "Another day, another brick laid. Keep building your empire.",
  "Consistency is the most powerful force in this business. You have it.",
  "Every day you show up is a day your competition doesn't. Keep going.",
  "You are proving to yourself that you can be counted on. That matters.",
  "Your future self is cheering for the choices you are making today.",
  "Momentum is earned one day at a time. This is how it is built.",
  "Discipline is freedom. Today proves you have both.",
  "The best agents are not the smartest. They are the most consistent.",
  "You are becoming the kind of person clients remember and refer.",
  "This streak is proof that what you do daily shapes who you are.",
  "Small daily wins add up to the career you have always wanted.",
  "Every check-in is a vote for the professional you are becoming.",
  "Your dedication today is planting seeds you will harvest later.",
  "Champions show up even when the mood does not. You just did.",
  "Your work ethic is building a reputation that outlasts any deal.",
  "The compound effect is real. You are living proof of it.",
  "It is not about perfection. It is about showing up. You showed up.",
  "Other agents skip days. You do not. That is the difference.",
  "Every great streak started with someone deciding not to stop.",
  "Today you earned tomorrow's momentum. Don't waste it.",
];

interface FortuneState {
  date: string;
  seen: number[];
  current: number | null;
}

function pickRandom(seen: number[], total: number): number {
  const pool = Array.from({ length: total }, (_, i) => i).filter((i) => !seen.includes(i));
  return pool[Math.floor(Math.random() * pool.length)];
}

function loadState(): FortuneState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) throw new Error();
    const s = JSON.parse(raw) as FortuneState;
    if (s.date !== todayKey()) throw new Error();
    return s;
  } catch {
    return { date: todayKey(), seen: [], current: null };
  }
}

function saveState(s: FortuneState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

function StreakBadge({ streak, checkedIn, onBump }: { streak: number; checkedIn: boolean; onBump: () => void }) {
  return (
    <div className="flex items-center gap-2 shrink-0">
      <Medal className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--kk-bar-ink)", opacity: 0.75 }} />
      <span className="text-[12px] font-medium tabular-nums" style={{ color: "var(--kk-bar-ink)", opacity: 0.75 }}>
        <span className="hidden sm:inline">{streak} days show up</span>
        <span className="sm:hidden">{streak}d</span>
      </span>
      {checkedIn ? (
        <CheckCircle2
          className="w-4 h-4 shrink-0"
          style={{ color: "var(--kk-green)" }}
          title="Checked in today"
        />
      ) : (
        <button
          onClick={onBump}
          className="flex items-center transition-opacity hover:opacity-60 active:scale-95"
          title="Check in for today"
          style={{ animation: "kk-pulse-subtle 2s ease-in-out infinite" }}
        >
          <Circle className="w-4 h-4 shrink-0" style={{ color: "#C03810" }} />
        </button>
      )}
    </div>
  );
}

function StreakCelebration({ streak, phrase, onClose }: { streak: number; phrase: string; onClose: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const t = setTimeout(onClose, 4000);
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", fn);
    return () => { clearTimeout(t); document.removeEventListener("keydown", fn); };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.78)", opacity: visible ? 1 : 0, transition: "opacity 0.25s ease" }}
      onClick={onClose}
    >
      <div
        className="text-center px-10 py-10 rounded-3xl"
        style={{
          transform: visible ? "scale(1)" : "scale(0.6)",
          transition: "transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-6xl mb-4" style={{ animation: "none" }}>🔥</div>
        <div
          className="font-bold tabular-nums leading-none mb-3"
          style={{ fontSize: 100, color: "#fff", textShadow: "0 0 60px rgba(244,81,30,0.9), 0 0 20px rgba(244,81,30,0.6)" }}
        >
          {streak}
        </div>
        <div className="text-[28px] font-bold text-white mb-2">Day Streak!</div>
        <div className="text-[15px] mb-8 px-4 leading-relaxed" style={{ color: "rgba(255,255,255,0.60)" }}>
          {phrase}
        </div>
        <button
          onClick={onClose}
          className="px-6 py-2.5 rounded-full text-[14px] font-semibold"
          style={{ background: "rgba(255,255,255,0.15)", color: "#fff", border: "1px solid rgba(255,255,255,0.25)" }}
        >
          Let&apos;s go
        </button>
      </div>
    </div>
  );
}

export function GreetingBar({ name, streak }: { name?: string | null; streak?: number }) {
  const [now, setNow] = useState<Date | null>(null);
  const [fortune, setFortune] = useState<FortuneState>({ date: todayKey(), seen: [], current: null });
  const [quoteVisible, setQuoteVisible] = useState(true);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const cookieBtnRef = useRef<HTMLButtonElement>(null);
  const [localStreak, setLocalStreak] = useState(streak ?? 0);
  const [celebrating, setCelebrating] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);
  const [streakPhrase, setStreakPhrase] = useState("");

  useEffect(() => {
    setCheckedIn(hasCheckedInToday());
  }, []);

  const handleBump = useCallback(() => {
    if (hasCheckedInToday()) return;
    markCheckedInToday();
    setCheckedIn(true);
    const next = localStreak + 1;
    setLocalStreak(next);
    setStreakPhrase(STREAK_PHRASES[Math.floor(Math.random() * STREAK_PHRASES.length)]);
    setCelebrating(true);
    bumpStreak();
  }, [localStreak]);

  useEffect(() => {
    const tick = () => {
      const n = new Date();
      setNow(n);
      // Reset fortune at midnight — if the stored date no longer matches today
      setFortune((prev) => {
        const key = todayKey();
        if (prev.date !== key) {
          // Clear localStorage too so a hard-refresh also starts fresh
          localStorage.removeItem(STORAGE_KEY);
          setCheckedIn(false);
          return { date: key, seen: [], current: null };
        }
        return prev;
      });
    };
    tick();
    setFortune(loadState());

    // Align the first tick to the next full minute, then run every 60s
    const msToNextMinute = 60_000 - (Date.now() % 60_000);
    let id: ReturnType<typeof setInterval>;
    const timeout = setTimeout(() => {
      tick();
      id = setInterval(tick, 60_000);
    }, msToNextMinute);

    return () => { clearTimeout(timeout); clearInterval(id); };
  }, []);

  function openFortune() {
    if (fortune.seen.length >= MAX) return;
    const idx = pickRandom(fortune.seen, MESSAGES.length);
    const next: FortuneState = { date: todayKey(), seen: [...fortune.seen, idx], current: idx };
    setQuoteVisible(false);
    setTooltipVisible(false);
    setTimeout(() => {
      setFortune(next);
      saveState(next);
      setQuoteVisible(true);
    }, 150);
  }

  const firstName = name?.trim().split(/\s+/)[0] ?? null;
  const hasQuote = fortune.current !== null;
  const exhausted = fortune.seen.length >= MAX;
  const quote = hasQuote ? MESSAGES[fortune.current!] : null;
  const isFirstOpen = fortune.seen.length === 1; // first cookie opened, one more available

  return (
    <>
    {celebrating && (
      <StreakCelebration streak={localStreak} phrase={streakPhrase} onClose={() => setCelebrating(false)} />
    )}
    <div className="border-b" style={{ borderColor: "rgba(0,0,0,0.08)", background: "var(--kk-bar-bg)" }}>
      <div className="mx-auto max-w-[1440px] px-3 lg:px-5 flex items-center gap-4 min-h-[44px] py-1 lg:py-0 lg:h-[44px]">

        {now && localStreak > 0 && (
          <StreakBadge streak={localStreak} checkedIn={checkedIn} onBump={handleBump} />
        )}

        {now && localStreak > 0 && <span style={{ width: 1, height: 12, background: "var(--kk-bar-mute)", opacity: 0.4, flexShrink: 0, display: "block" }} />}

        {/* Fortune zone — always same height, content swaps inside */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {!hasQuote ? (
            /* Closed cookie — no quote yet */
            <button
              onClick={openFortune}
              className="text-[18px] transition-opacity hover:opacity-70 shrink-0 px-1"
              title="Open your fortune cookie"
            >
              🥠
            </button>
          ) : (
            <>
              {/* Quote */}
              <p
                className="text-[13px] italic min-w-0 lg:truncate transition-opacity duration-150"
                style={{ color: "var(--kk-bar-mute)", opacity: quoteVisible ? 1 : 0 }}
              >
                {quote ? quote.charAt(0).toUpperCase() + quote.slice(1) : ""}
              </p>

              {/* Second cookie — only shown after first, hidden when exhausted; hidden on mobile */}
              {!exhausted && (
                <div className="relative shrink-0 hidden lg:block">
                  <button
                    ref={cookieBtnRef}
                    onClick={openFortune}
                    onMouseEnter={() => isFirstOpen && setTooltipVisible(true)}
                    onMouseLeave={() => setTooltipVisible(false)}
                    className="text-[18px] transition-opacity hover:opacity-70 px-1"
                    style={{ opacity: 0.5 }}
                  >
                    🥠
                  </button>

                  {/* Hover tooltip */}
                  {tooltipVisible && (
                    <div
                      className="absolute z-50 text-[12px] rounded-xl px-3 py-2 whitespace-nowrap pointer-events-none"
                      style={{
                        bottom: "calc(100% + 8px)",
                        left: "50%",
                        transform: "translateX(-50%)",
                        background: "var(--kk-ink)",
                        color: "#fff",
                        boxShadow: "0 4px 14px rgba(0,0,0,0.18)",
                      }}
                    >
                      Need additional motivation? You can get one additional fortune cookie :)
                      {/* Arrow */}
                      <span
                        style={{
                          position: "absolute",
                          top: "100%",
                          left: "50%",
                          transform: "translateX(-50%)",
                          width: 0,
                          height: 0,
                          borderLeft: "6px solid transparent",
                          borderRight: "6px solid transparent",
                          borderTop: `6px solid var(--kk-ink)`,
                        }}
                      />
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

      </div>
    </div>
    </>
  );
}
