"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useUserRole } from "./use-user-role";
import { ROLE_TIMEOUT_MINUTES } from "@/lib/rbac-config";

interface SessionTimeoutOptions {
  warningTimeSeconds?: number; // Show warning this many seconds before timeout
  onTimeout?: () => void;
  onWarning?: () => void;
}

/**
 * Hook to track user session timeout based on role
 * Shows warning before timeout and triggers callback on timeout
 */
export function useSessionTimeout({
  warningTimeSeconds = 60, // Show warning 1 minute before timeout
  onTimeout,
  onWarning,
}: SessionTimeoutOptions = {}) {
  const { role, isLoading } = useUserRole();
  const [isWarningShown, setIsWarningShown] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);

  const timeoutRef = useRef<NodeJS.Timeout>();
  const warningTimeoutRef = useRef<NodeJS.Timeout>();
  const countdownIntervalRef = useRef<NodeJS.Timeout>();
  const lastActivityRef = useRef<number>(Date.now());

  // Get timeout duration based on role
  const timeoutMinutes = !isLoading ? ROLE_TIMEOUT_MINUTES[role] : 15;
  const timeoutMs = timeoutMinutes * 60 * 1000;
  const warningTimeMs = warningTimeSeconds * 1000;

  const clearAllTimers = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
  }, []);

  const startCountdown = useCallback(() => {
    setSecondsRemaining(warningTimeSeconds);

    countdownIntervalRef.current = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev === null || prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [warningTimeSeconds]);

  const resetTimer = useCallback(() => {
    clearAllTimers();
    setIsWarningShown(false);
    setSecondsRemaining(null);
    lastActivityRef.current = Date.now();

    // Set warning timer
    warningTimeoutRef.current = setTimeout(() => {
      setIsWarningShown(true);
      startCountdown();
      onWarning?.();
    }, timeoutMs - warningTimeMs);

    // Set timeout timer
    timeoutRef.current = setTimeout(() => {
      clearAllTimers();
      onTimeout?.();
    }, timeoutMs);
  }, [timeoutMs, warningTimeMs, clearAllTimers, startCountdown, onTimeout, onWarning]);

  const extendSession = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  // Track user activity
  useEffect(() => {
    if (isLoading) return;

    const handleActivity = () => {
      // Only reset if not showing warning and some time has passed
      const timeSinceLastActivity = Date.now() - lastActivityRef.current;

      // Reset timer if more than 10 seconds since last activity
      if (!isWarningShown && timeSinceLastActivity > 10000) {
        resetTimer();
      }
    };

    // Activity events to track
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
    ];

    // Add event listeners
    events.forEach((event) => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Start initial timer
    resetTimer();

    // Cleanup
    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity);
      });
      clearAllTimers();
    };
  }, [isLoading, isWarningShown, resetTimer, clearAllTimers]);

  return {
    isWarningShown,
    secondsRemaining,
    timeoutMinutes,
    extendSession,
    resetTimer,
  };
}
