"use client";

import { useAuth } from "@clerk/nextjs";
import { SessionTimeoutModal } from "./SessionTimeoutModal";

/**
 * Provider component that conditionally renders SessionTimeoutModal
 * Only shows the modal when user is authenticated
 */
export function SessionTimeoutProvider() {
  const { isSignedIn } = useAuth();

  // Only track session timeout for signed-in users
  if (!isSignedIn) {
    return null;
  }

  return <SessionTimeoutModal />;
}
