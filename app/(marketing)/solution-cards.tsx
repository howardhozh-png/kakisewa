"use client";

import { Bell, Users, Send, Clock } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useRef, useState } from "react";

interface FloatingHeart { id: number; x: number; y: number }

function SolutionCard({ icon: Icon, title, desc }: { icon: LucideIcon; title: string; desc: string }) {
  const [hearts, setHearts] = useState<FloatingHeart[]>([]);
  const [hovered, setHovered] = useState(false);
  const nextId = useRef(0);

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const id = nextId.current++;
    setHearts(prev => [...prev, { id, x: e.clientX - rect.left, y: e.clientY - rect.top }]);
    setTimeout(() => setHearts(prev => prev.filter(h => h.id !== id)), 900);
  }

  return (
    <div
      className="relative rounded-2xl p-7 flex flex-col cursor-pointer overflow-hidden"
      style={{
        background: "#fff",
        border: "1px solid var(--kk-line)",
        transition: "transform 0.22s ease, box-shadow 0.22s ease",
        transform: hovered ? "scale(1.035)" : "scale(1)",
        boxShadow: hovered ? "0 16px 48px rgba(0,0,0,0.10)" : "0 2px 8px rgba(0,0,0,0.04)",
        zIndex: hovered ? 1 : 0,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={handleClick}
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center mb-5"
        style={{ background: "var(--kk-green-soft)" }}
      >
        <Icon className="w-5 h-5" style={{ color: "var(--kk-green)" }} />
      </div>
      <p
        className="serif mb-3"
        style={{ fontSize: "clamp(1.1rem, 1.4vw, 1.3rem)", lineHeight: 1.25, letterSpacing: "-0.015em", color: "var(--kk-ink)" }}
      >
        {title}
      </p>
      <p style={{ fontSize: "var(--kk-sm)", color: "var(--kk-ink-mute)", lineHeight: 1.65 }}>
        {desc}
      </p>

      {hearts.map(h => (
        <svg
          key={h.id}
          className="absolute pointer-events-none"
          style={{ left: h.x - 12, top: h.y - 12, width: 24, height: 24, animation: "kk-heart-float 0.9s ease-out forwards" }}
          viewBox="0 0 24 24"
          fill="#FF2D55"
        >
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
        </svg>
      ))}
    </div>
  );
}

const ITEMS: Array<{ icon: LucideIcon; title: string; desc: string }> = [
  {
    icon: Bell,
    title: "Your RM 2,000 renewal, locked in",
    desc: "60 days before every contract ends, you get a reminder. You follow up first. You keep the listing before another agent does.",
  },
  {
    icon: Users,
    title: "Know exactly who to call today",
    desc: "Pipeline stages replace gut feel. See who is hot, who is cold, and who is ready to sign. Stop guessing.",
  },
  {
    icon: Send,
    title: "Win the owner before you even meet",
    desc: "One branded link. The owner reviews tenants and picks. You close without the back-and-forth.",
  },
  {
    icon: Clock,
    title: "From 3 hours to 30 minutes",
    desc: "Automatic reminders replace manual follow-up. Work your leads, not your WhatsApp inbox.",
  },
];

export function SolutionCards() {
  return (
    <>
      <style>{`
        @keyframes kk-heart-float {
          0%   { transform: scale(0.5) translateY(0);     opacity: 1; }
          50%  { transform: scale(1.2) translateY(-22px); opacity: 1; }
          100% { transform: scale(0.8) translateY(-52px); opacity: 0; }
        }
      `}</style>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {ITEMS.map(item => (
          <SolutionCard key={item.title} icon={item.icon} title={item.title} desc={item.desc} />
        ))}
      </div>
    </>
  );
}
