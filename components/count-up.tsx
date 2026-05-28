"use client";

import { useEffect, useState, useRef } from "react";

interface Props {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  formatter?: (n: number) => string;
}

// Animated number counter — eases to the new value over `duration` ms.
// Used across Performance to make goals/forecasts feel live (à la coagent.my).
export function CountUp({ value, duration = 600, prefix = "", suffix = "", formatter }: Props) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const startRef = useRef<number | null>(null);
  const targetRef = useRef(value);

  useEffect(() => {
    fromRef.current = display;
    targetRef.current = value;
    startRef.current = null;

    let raf = 0;
    const tick = (t: number) => {
      if (startRef.current == null) startRef.current = t;
      const elapsed = t - startRef.current;
      const progress = Math.min(1, elapsed / duration);
      // ease-out-cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = fromRef.current + (targetRef.current - fromRef.current) * eased;
      setDisplay(current);
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  const text = formatter ? formatter(display) : Math.round(display).toLocaleString();
  return <>{prefix}{text}{suffix}</>;
}
