"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useSessionTimeout } from "@/lib/hooks/use-session-timeout";
import { AlertCircle, Clock } from "lucide-react";

/**
 * Session Timeout Modal Component
 *
 * Shows a warning modal when the user's session is about to expire
 * Displays a countdown timer and allows the user to extend their session
 * Automatically logs out the user when the timer reaches zero
 *
 * Timeout duration is based on the user's role per HIPAA requirements:
 * - System Admin: 10 minutes
 * - Compliance Officer, Physician, Provider: 15 minutes
 * - Research Coordinator, Clinical Staff: 20 minutes
 * - Patient, Guest: 30 minutes
 */
export function SessionTimeoutModal() {
  const router = useRouter();
  const { signOut } = useClerk();

  const { isWarningShown, secondsRemaining, timeoutMinutes, extendSession } =
    useSessionTimeout({
      warningTimeSeconds: 60, // Show warning 1 minute before timeout
      onTimeout: async () => {
        // Logout user
        await signOut();
        router.push("/sign-in?session_expired=true");
      },
    });

  // Format seconds as MM:SS
  const formatTime = (seconds: number | null): string => {
    if (seconds === null) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <Dialog open={isWarningShown}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
              <AlertCircle className="h-5 w-5 text-amber-600" />
            </div>
            <DialogTitle className="text-xl">Session Expiring Soon</DialogTitle>
          </div>
          <DialogDescription className="pt-4">
            Your session is about to expire due to inactivity. For your
            security, you will be automatically logged out in:
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-center py-6">
          <div className="flex items-center gap-3">
            <Clock className="h-8 w-8 text-purple-600" />
            <div className="text-5xl font-bold text-purple-600 tabular-nums">
              {formatTime(secondsRemaining)}
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
          <p>
            <strong>Note:</strong> Your session timeout is set to{" "}
            {timeoutMinutes} minutes based on your role for HIPAA compliance.
          </p>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={async () => {
              await signOut();
              router.push("/sign-in");
            }}
            className="flex-1"
          >
            Logout Now
          </Button>
          <Button
            type="button"
            variant="brand"
            onClick={extendSession}
            className="flex-1 bg-purple-600 hover:bg-purple-700"
          >
            Stay Signed In
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
