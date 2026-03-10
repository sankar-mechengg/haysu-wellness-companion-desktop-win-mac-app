import { useState, useEffect, useCallback, useRef } from "react";

interface UseTimerOptions {
  initialSeconds: number;
  autoStart?: boolean;
  onComplete?: () => void;
}

interface UseTimerReturn {
  seconds: number;
  isRunning: boolean;
  start: () => void;
  pause: () => void;
  reset: (newSeconds?: number) => void;
  setSeconds: (secs: number) => void;
  progress: number; // 0-100
  formattedTime: string; // "MM:SS"
}

export function useTimer({
  initialSeconds,
  autoStart = false,
  onComplete,
}: UseTimerOptions): UseTimerReturn {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(autoStart);
  const totalRef = useRef(initialSeconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isRunning && seconds > 0) {
      intervalRef.current = setInterval(() => {
        setSeconds((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            onComplete?.();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, seconds > 0]);

  const start = useCallback(() => setIsRunning(true), []);
  const pause = useCallback(() => setIsRunning(false), []);

  const reset = useCallback(
    (newSeconds?: number) => {
      const s = newSeconds ?? initialSeconds;
      totalRef.current = s;
      setSeconds(s);
      setIsRunning(false);
    },
    [initialSeconds]
  );

  const progress =
    totalRef.current > 0
      ? Math.round(((totalRef.current - seconds) / totalRef.current) * 100)
      : 0;

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const formattedTime = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;

  return {
    seconds,
    isRunning,
    start,
    pause,
    reset,
    setSeconds,
    progress,
    formattedTime,
  };
}
