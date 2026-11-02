import { useState, useEffect } from "react";
import { useReducedMotion } from "./useReducedMotion";

export function useCountUp(
  target: number,
  duration = 900,
  formatter?: (val: number) => string
): string {
  const reducedMotion = useReducedMotion();
  const [current, setCurrent] = useState(reducedMotion ? target : 0);

  useEffect(() => {
    if (reducedMotion) {
      setCurrent(target);
      return;
    }

    let startTimestamp: number | null = null;
    let animationFrameId: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // Ease-out cubic formula
      const easeOutProgress = 1 - Math.pow(1 - progress, 3);
      const nextValue = Math.round(target * easeOutProgress);
      setCurrent(nextValue);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      } else {
        setCurrent(target);
      }
    };

    animationFrameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationFrameId);
  }, [target, duration, reducedMotion]);

  return formatter ? formatter(current) : current.toLocaleString();
}
