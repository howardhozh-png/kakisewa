"use client";

import { useState, useRef, useEffect } from "react";
import { ZoomIn } from "lucide-react";

interface Props {
  src: string;
  aspectRatio: number;       // e.g. 3/2 for landscape, 1 for avatar
  shape?: "rect" | "circle"; // circle clips output to a circle
  onDone: (blob: Blob) => void;
  onCancel: () => void;
}

const AREA_W = 400;

export function PhotoCropDialog({ src, aspectRatio, shape = "rect", onDone, onCancel }: Props) {
  const areaH = Math.round(AREA_W / aspectRatio);

  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [natW, setNatW] = useState(0);
  const [natH, setNatH] = useState(0);

  const imageRef = useRef<HTMLImageElement>(null);
  const cropRef  = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const lastTouch = useRef<{ x: number; y: number; dist: number } | null>(null);

  // scale so image exactly covers crop area at zoom=1
  const fitScale = natW > 0 ? Math.max(AREA_W / natW, areaH / natH) : 1;
  const rW = natW * fitScale; // rendered CSS width at zoom=1
  const rH = natH * fitScale;

  function clampOff(ox: number, oy: number, z: number) {
    const maxX = Math.max(0, (rW * z - AREA_W) / 2);
    const maxY = Math.max(0, (rH * z - areaH)  / 2);
    return {
      x: Math.max(-maxX, Math.min(maxX, ox)),
      y: Math.max(-maxY, Math.min(maxY, oy)),
    };
  }

  // Re-clamp after image loads
  useEffect(() => {
    if (natW > 0) setOffset(o => clampOff(o.x, o.y, zoom));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [natW, natH]);

  // Non-passive wheel listener for zoom
  useEffect(() => {
    const el = cropRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      setZoom(prev => {
        const next = Math.max(1, Math.min(4, prev - e.deltaY * 0.002));
        setOffset(o => clampOff(o.x, o.y, next));
        return next;
      });
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rW, rH, areaH]);

  function onImageLoad() {
    const img = imageRef.current!;
    setNatW(img.naturalWidth);
    setNatH(img.naturalHeight);
  }

  // ── Mouse ────────────────────────────────────────────────────────────────────
  function onMouseDown(e: React.MouseEvent) {
    dragging.current = true;
    lastMouse.current = { x: e.clientX, y: e.clientY };
  }
  function onMouseMove(e: React.MouseEvent) {
    if (!dragging.current) return;
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    setOffset(o => clampOff(o.x + dx, o.y + dy, zoom));
  }
  function onMouseUp() { dragging.current = false; }

  // ── Touch ────────────────────────────────────────────────────────────────────
  function onTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 1) {
      lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, dist: 0 };
    } else if (e.touches.length === 2) {
      const dx = e.touches[1].clientX - e.touches[0].clientX;
      const dy = e.touches[1].clientY - e.touches[0].clientY;
      lastTouch.current = { x: 0, y: 0, dist: Math.hypot(dx, dy) };
    }
  }
  function onTouchMove(e: React.TouchEvent) {
    if (!lastTouch.current) return;
    if (e.touches.length === 1) {
      const dx = e.touches[0].clientX - lastTouch.current.x;
      const dy = e.touches[0].clientY - lastTouch.current.y;
      lastTouch.current = { ...lastTouch.current, x: e.touches[0].clientX, y: e.touches[0].clientY };
      setOffset(o => clampOff(o.x + dx, o.y + dy, zoom));
    } else if (e.touches.length === 2) {
      const dx = e.touches[1].clientX - e.touches[0].clientX;
      const dy = e.touches[1].clientY - e.touches[0].clientY;
      const dist = Math.hypot(dx, dy);
      if (lastTouch.current.dist > 0) {
        const factor = dist / lastTouch.current.dist;
        setZoom(prev => {
          const next = Math.max(1, Math.min(4, prev * factor));
          setOffset(o => clampOff(o.x, o.y, next));
          return next;
        });
      }
      lastTouch.current = { ...lastTouch.current, dist };
    }
  }
  function onTouchEnd() { lastTouch.current = null; }

  // ── Zoom slider ──────────────────────────────────────────────────────────────
  function onSlider(e: React.ChangeEvent<HTMLInputElement>) {
    const next = parseFloat(e.target.value);
    setZoom(next);
    setOffset(o => clampOff(o.x, o.y, next));
  }

  // ── Canvas output ────────────────────────────────────────────────────────────
  function handleDone() {
    const img = imageRef.current!;
    const outW = 1200;
    const outH = Math.round(outW / aspectRatio);
    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d")!;

    const totalScale = zoom * fitScale;
    // Visible crop in natural image coordinates
    const sx = natW / 2 - (AREA_W / 2 + offset.x) / totalScale;
    const sy = natH / 2 - (areaH  / 2 + offset.y) / totalScale;
    const sw = AREA_W / totalScale;
    const sh = areaH  / totalScale;

    if (shape === "circle") {
      ctx.beginPath();
      ctx.arc(outW / 2, outH / 2, outW / 2, 0, Math.PI * 2);
      ctx.clip();
    }

    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);
    canvas.toBlob(blob => { if (blob) onDone(blob); }, "image/jpeg", 0.92);
  }

  const borderR = shape === "circle" ? "50%" : 4;

  return (
    <div
      className="fixed inset-0 z-[900] flex flex-col items-center justify-center"
      style={{ background: "rgba(0,0,0,0.92)" }}
    >
      <p className="text-[12px] font-medium mb-5 tracking-wide uppercase" style={{ color: "rgba(255,255,255,0.45)" }}>
        Drag to reposition · scroll or pinch to zoom
      </p>

      {/* Crop area */}
      <div
        ref={cropRef}
        style={{
          width: AREA_W,
          height: areaH,
          position: "relative",
          overflow: "hidden",
          borderRadius: borderR,
          // Dark vignette outside the crop frame
          boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
          cursor: dragging.current ? "grabbing" : "grab",
          userSelect: "none",
          touchAction: "none",
        }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <img
          ref={imageRef}
          src={src}
          onLoad={onImageLoad}
          draggable={false}
          alt=""
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: rW || "auto",
            height: rH || "auto",
            maxWidth: "none",
            transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) scale(${zoom})`,
            transformOrigin: "center",
            userSelect: "none",
            pointerEvents: "none",
          }}
        />
        {/* Crop border */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: borderR,
            border: "1.5px solid rgba(255,255,255,0.4)",
            pointerEvents: "none",
          }}
        />
      </div>

      {/* Zoom slider */}
      <div className="flex items-center gap-3 mt-8" style={{ width: AREA_W }}>
        <ZoomIn className="w-4 h-4 shrink-0" style={{ color: "rgba(255,255,255,0.5)" }} />
        <input
          type="range"
          min="1"
          max="4"
          step="0.01"
          value={zoom}
          onChange={onSlider}
          className="flex-1"
          style={{ accentColor: "#fff" }}
        />
        <span className="text-[12px] tabular-nums w-8" style={{ color: "rgba(255,255,255,0.5)" }}>
          {zoom.toFixed(1)}×
        </span>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-4 mt-6">
        <button
          onClick={onCancel}
          className="px-6 py-2.5 rounded-full text-[14px] font-medium transition-opacity hover:opacity-70"
          style={{ color: "rgba(255,255,255,0.65)" }}
        >
          Cancel
        </button>
        <button
          onClick={handleDone}
          className="px-8 py-2.5 rounded-full text-[14px] font-semibold transition-opacity hover:opacity-90"
          style={{ background: "#fff", color: "#000" }}
        >
          Done
        </button>
      </div>
    </div>
  );
}
