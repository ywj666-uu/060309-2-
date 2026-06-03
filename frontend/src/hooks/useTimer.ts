import { useState, useEffect, useRef } from 'react';

export function useTimer(initialSeconds: number, isRunning: boolean) {
  const [remaining, setRemaining] = useState(initialSeconds);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    setRemaining(initialSeconds);
  }, [initialSeconds]);

  useEffect(() => {
    if (isRunning && remaining > 0) {
      intervalRef.current = setInterval(() => {
        setRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isRunning, remaining]);

  const syncTime = (serverRemaining: number) => {
    setRemaining(serverRemaining);
  };

  const formatTime = () => {
    const min = Math.floor(remaining / 60);
    const sec = remaining % 60;
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  return { remaining, formatTime, syncTime };
}
