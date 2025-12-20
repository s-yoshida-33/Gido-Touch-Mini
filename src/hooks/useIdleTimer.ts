import { useEffect, useRef, useCallback } from 'react';

interface UseIdleTimerProps {
  timeout: number;
  onIdle: () => void;
  enabled?: boolean;
}

export const useIdleTimer = ({ timeout, onIdle, enabled = true }: UseIdleTimerProps) => {
  const lastActivityTimeRef = useRef<number>(Date.now());
  const timerRef = useRef<number | null>(null);

  const handleActivity = useCallback(() => {
    lastActivityTimeRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (!enabled) return;

    // Reset activity time when enabled
    lastActivityTimeRef.current = Date.now();

    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
      'keydown',
      'wheel'
    ];

    // Add event listeners
    events.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Check idle status periodically
    timerRef.current = window.setInterval(() => {
      const now = Date.now();
      if (now - lastActivityTimeRef.current >= timeout) {
        onIdle();
        // Reset activity time to prevent continuous triggers?
        // Usually we want to trigger once, or maybe keep triggering?
        // Let's reset it so it triggers again after another timeout period if still idle
        lastActivityTimeRef.current = Date.now();
      }
    }, 1000);

    return () => {
      // Cleanup
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [enabled, timeout, onIdle, handleActivity]);

  return {
    reset: handleActivity
  };
};













