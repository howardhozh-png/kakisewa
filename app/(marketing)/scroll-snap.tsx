"use client";

import { useEffect } from "react";

export function ScrollSnap() {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let isSnapping = false;

    function snapToNearest() {
      if (isSnapping) return;
      const sections = Array.from(document.querySelectorAll("[data-snap]")) as HTMLElement[];
      if (sections.length === 0) return;

      const scrollY = window.scrollY;
      let nearest = sections[0];
      let minDist = Infinity;

      for (const sec of sections) {
        const dist = Math.abs(sec.offsetTop - scrollY);
        if (dist < minDist) { minDist = dist; nearest = sec; }
      }

      if (minDist > 8) {
        isSnapping = true;
        window.scrollTo({ top: nearest.offsetTop, behavior: "smooth" });
        setTimeout(() => { isSnapping = false; }, 600);
      }
    }

    function onScroll() {
      clearTimeout(timer);
      timer = setTimeout(snapToNearest, 180);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      clearTimeout(timer);
    };
  }, []);

  return null;
}
