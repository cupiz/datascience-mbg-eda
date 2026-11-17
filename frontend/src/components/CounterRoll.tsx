"use client";

import { useEffect, useRef, useState } from "react";

interface CounterRollProps {
  target: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  durationMs?: number;
}

export default function CounterRoll({
  target,
  decimals = 0,
  prefix = "",
  suffix = "",
  durationMs = 850,
}: CounterRollProps) {
  const [display, setDisplay] = useState<number>(target);
  const hasPlayed = useRef(false);
  const elRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const node = elRef.current;
    if (!node || hasPlayed.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting || hasPlayed.current) return;
        hasPlayed.current = true;
        const startVal = target * 0.68;
        const startTime = performance.now();

        const tick = (now: number) => {
          const t = Math.min(1, (now - startTime) / durationMs);
          const eased = 1 - Math.pow(1 - t, 3);
          setDisplay(startVal + (target - startVal) * eased);
          if (t < 1) {
            requestAnimationFrame(tick);
          } else {
            setDisplay(target);
          }
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.35 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [target, durationMs]);

  const formatted = new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(display);

  return (
    <span ref={elRef} className="t-num">
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
