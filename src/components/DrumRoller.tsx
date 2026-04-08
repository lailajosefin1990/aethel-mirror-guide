import { useRef, useEffect, useCallback, useState } from "react";
import { cn } from "@/lib/utils";

interface DrumRollerProps {
  items: { value: string | number; label: string; disabled?: boolean }[];
  value: string | number;
  onChange: (value: string | number) => void;
  height?: number;
  itemHeight?: number;
}

const VISIBLE_ITEMS = 5;

const DrumRoller = ({ items, value, onChange, height = 200, itemHeight = 40 }: DrumRollerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startScroll = useRef(0);
  const velocity = useRef(0);
  const lastY = useRef(0);
  const lastTime = useRef(0);
  const rafId = useRef<number>(0);
  const [isScrolling, setIsScrolling] = useState(false);

  const paddingItems = Math.floor(VISIBLE_ITEMS / 2);
  const paddingHeight = paddingItems * itemHeight;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const idx = items.findIndex((item) => item.value === value);
    if (idx >= 0) {
      el.scrollTop = idx * itemHeight;
    }
  }, [value, items, itemHeight]);

  const snapToNearest = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollTop / itemHeight);
    const clamped = Math.max(0, Math.min(items.length - 1, idx));
    el.scrollTo({ top: clamped * itemHeight, behavior: "smooth" });

    const item = items[clamped];
    if (item && !item.disabled && item.value !== value) {
      onChange(item.value);
    }
  }, [items, itemHeight, onChange, value]);

  const decelerate = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    velocity.current *= 0.92;
    if (Math.abs(velocity.current) < 0.5) {
      velocity.current = 0;
      setIsScrolling(false);
      snapToNearest();
      return;
    }
    el.scrollTop += velocity.current;
    rafId.current = requestAnimationFrame(decelerate);
  }, [snapToNearest]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const preventScroll = (e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };
    el.addEventListener("touchmove", preventScroll, { passive: false });
    return () => el.removeEventListener("touchmove", preventScroll);
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const el = containerRef.current;
    if (!el) return;
    cancelAnimationFrame(rafId.current);
    isDragging.current = true;
    startY.current = e.clientY;
    startScroll.current = el.scrollTop;
    lastY.current = e.clientY;
    lastTime.current = Date.now();
    velocity.current = 0;
    setIsScrolling(true);
    el.setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current || !containerRef.current) return;
    e.preventDefault();
    const dy = startY.current - e.clientY;
    containerRef.current.scrollTop = startScroll.current + dy;

    const now = Date.now();
    const dt = now - lastTime.current;
    if (dt > 0) {
      velocity.current = (lastY.current - e.clientY) / dt * 16;
    }
    lastY.current = e.clientY;
    lastTime.current = now;
  }, []);

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
    if (Math.abs(velocity.current) > 1) {
      rafId.current = requestAnimationFrame(decelerate);
    } else {
      setIsScrolling(false);
      snapToNearest();
    }
  }, [decelerate, snapToNearest]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const el = containerRef.current;
    if (!el) return;
    cancelAnimationFrame(rafId.current);
    el.scrollTop += e.deltaY;
    setIsScrolling(true);
    clearTimeout((el as any)._wheelTimer);
    (el as any)._wheelTimer = setTimeout(() => {
      setIsScrolling(false);
      snapToNearest();
    }, 150);
  }, [snapToNearest]);

  const handleItemClick = (idx: number) => {
    const el = containerRef.current;
    if (!el || isScrolling) return;
    const item = items[idx];
    if (item.disabled) return;
    el.scrollTo({ top: idx * itemHeight, behavior: "smooth" });
    onChange(item.value);
  };

  const selectedIdx = items.findIndex((item) => item.value === value);

  return (
    <div
      className="relative overflow-hidden select-none"
      style={{ height }}
    >
      {/* Selection indicator lines */}
      <div
        className="absolute left-0 right-0 pointer-events-none z-10"
        style={{ top: paddingHeight - 1 }}
      >
        <div className="h-px bg-foreground/20" />
      </div>
      <div
        className="absolute left-0 right-0 pointer-events-none z-10"
        style={{ top: paddingHeight + itemHeight }}
      >
        <div className="h-px bg-foreground/20" />
      </div>

      {/* Fade gradients */}
      <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-background to-transparent z-[5] pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent z-[5] pointer-events-none" />

      <div
        ref={containerRef}
        className="h-full overflow-hidden touch-none cursor-grab active:cursor-grabbing overscroll-contain"
        style={{ paddingTop: paddingHeight, paddingBottom: paddingHeight }}
        role="listbox"
        aria-label="Select a value"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowRight") {
            e.preventDefault();
            const next = Math.min(selectedIdx + 1, items.length - 1);
            const item = items[next];
            if (item && !item.disabled) {
              onChange(item.value);
            }
          } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
            e.preventDefault();
            const prev = Math.max(selectedIdx - 1, 0);
            const item = items[prev];
            if (item && !item.disabled) {
              onChange(item.value);
            }
          } else if (e.key === "Enter") {
            e.preventDefault();
          }
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
      >
        {items.map((item, idx) => {
          const isSelected = idx === selectedIdx;
          return (
            <div
              key={`${item.value}`}
              role="option"
              aria-selected={isSelected}
              className={cn(
                "flex items-center justify-center transition-all duration-150",
                item.disabled
                  ? "opacity-20 cursor-not-allowed"
                  : isSelected
                    ? "opacity-100"
                    : "opacity-30 hover:opacity-50"
              )}
              style={{ height: itemHeight }}
              onClick={() => handleItemClick(idx)}
            >
              <span
                className={cn(
                  "transition-all duration-150",
                  isSelected
                    ? "font-display text-[20px] text-foreground"
                    : "font-body text-[14px] text-foreground/50"
                )}
              >
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DrumRoller;
