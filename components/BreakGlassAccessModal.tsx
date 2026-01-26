"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ShieldAlert, Clock, FileText } from "lucide-react";
import { useHasPermission } from "@/lib/hooks/use-permissions";
import { Permission } from "@/lib/definitions";

interface BreakGlassAccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resourceType: string;
  resourceId: string;
  resourceDescription?: string;
  onAccessGranted?: () => void;
}

/**
 * Break-Glass Access Modal
 *
 * Provides emergency override access to PHI for authorized users
 * in critical situations (e.g., patient emergency, life-threatening scenarios).
 *
 * Requirements:
 * - User must have BREAK_GLASS permission (Physicians, System Admins)
 * - Detailed justification required (minimum 20 characters)
 * - Immediate audit log entry created
 * - Compliance officer notified
 * - Access is time-limited
 *
 * This is a rare feature for emergency scenarios only, not typical
 * research workflows.
 */
export function BreakGlassAccessModal({
  open,
  onOpenChange,
  resourceType,
  resourceId,
  resourceDescription,
  onAccessGranted,
}: BreakGlassAccessModalProps) {
  const [justification, setJustification] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");

  const canBreakGlass = useHasPermission(Permission.BREAK_GLASS);

  const handleEmergencyAccess = async () => {
    // Validate justification
    if (justification.trim().length < 20) {
      setError("Justification must be at least 20 characters long.");
      return;
    }

    setIsProcessing(true);
    setError("");

    try {
      // TODO: Implement break-glass access logic
      // 1. Log emergency access attempt
      // 2. Verify user has BREAK_GLASS permission
      // 3. Create detailed audit log with justification
      // 4. Send immediate alert to compliance officer
      // 5. Grant temporary access (time-limited)
      // 6. Record in special break-glass audit table

      await new Promise((resolve) => setTimeout(resolve, 1500));

      console.log("🚨 BREAK-GLASS ACCESS GRANTED:", {
        resourceType,
        resourceId,
        justification,
        timestamp: new Date().toISOString(),
      });

      // Close modal and notify parent
      onOpenChange(false);
      onAccessGranted?.();

      // Reset form
      setJustification("");
    } catch (err) {
      setError("Failed to grant emergency access. Please try again.");
      console.error("Break-glass access error:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!canBreakGlass) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <ShieldAlert className="h-5 w-5" />
              Access Denied
            </DialogTitle>
            <DialogDescription>
              You do not have permission to use emergency break-glass access.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600">
              Break-glass access is restricted to Physicians and System
              Administrators for emergency situations only.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-6 w-6" />
            Emergency Break-Glass Access
          </DialogTitle>
          <DialogDescription>
            Request emergency override access to protected health information
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Warning Banner */}
          <div className="rounded-lg bg-red-50 border-2 border-red-200 p-4">
            <div className="flex gap-3">
              <ShieldAlert className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="text-sm font-bold text-red-900">
                  ⚠️ EMERGENCY ACCESS ONLY
                </p>
                <p className="text-sm text-red-800">
                  This action will be immediately logged and reported to the
                  Compliance Officer. Use only in genuine emergency situations
                  where patient care requires urgent access to PHI.
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Badge className="bg-red-600 hover:bg-red-600">
                    Audited Access
                  </Badge>
                  <Badge className="bg-red-600 hover:bg-red-600">
                    Compliance Alert
                  </Badge>
                  <Badge className="bg-red-600 hover:bg-red-600">
                    Time-Limited
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Resource Information */}
          <div className="space-y-3">
            <Label className="text-base font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Resource Information
            </Label>
            <div className="rounded-lg bg-gray-50 p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Resource Type:</span>
                <span className="font-medium text-gray-900">{resourceType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Resource ID:</span>
                <span className="font-mono text-xs text-gray-900">
                  {resourceId}
                </span>
              </div>
              {resourceDescription && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Description:</span>
                  <span className="font-medium text-gray-900">
                    {resourceDescription}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Justification */}
          <div className="space-y-3">
            <Label htmlFor="justification" className="text-base font-medium">
              Emergency Justification{" "}
              <span className="text-red-600">* Required</span>
            </Label>
            <p className="text-sm text-gray-600">
              Provide a detailed explanation for why emergency access is needed.
              This will be permanently recorded in the audit log.
            </p>
            <Textarea
              id="justification"
              placeholder="Example: Patient John Doe presented to ER with acute chest pain. Need immediate access to medical history for life-saving treatment. Unable to reach primary care provider."
              value={justification}
              onChange={(e) => {
                setJustification(e.target.value);
                setError("");
              }}
              className="min-h-[120px] resize-none"
              disabled={isProcessing}
            />
            <div className="flex items-center justify-between text-xs">
              <span
                className={
                  justification.length < 20 ? "text-red-600" : "text-green-600"
                }
              >
                {justification.length < 20
                  ? `${20 - justification.length} more characters required`
                  : "✓ Sufficient detail provided"}
              </span>
              <span className="text-gray-500">
                {justification.length} characters
              </span>
            </div>
            {error && (
              <p className="text-sm text-red-600 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                {error}
              </p>
            )}
          </div>

          {/* Access Duration */}
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
            <div className="flex gap-3">
              <Clock className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-amber-900">
                  Time-Limited Access
                </p>
                <p className="text-sm text-amber-700">
                  Emergency access will expire after <strong>1 hour</strong> or
                  when you log out, whichever comes first.
                </p>
              </div>
            </div>
          </div>

          {/* Acknowledgment */}
          <div className="rounded-lg bg-gray-100 p-4 text-sm text-gray-700">
            <p className="font-medium mb-2">By proceeding, you acknowledge:</p>
            <ul className="space-y-1 ml-4 list-disc">
              <li>This access is for genuine emergency use only</li>
              <li>All actions will be permanently logged and audited</li>
              <li>The Compliance Officer will be immediately notified</li>
              <li>Misuse may result in disciplinary action</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setJustification("");
              setError("");
            }}
            disabled={isProcessing}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleEmergencyAccess}
            disabled={justification.trim().length < 20 || isProcessing}
            className="flex-1 bg-red-600 hover:bg-red-700"
          >
            {isProcessing ? (
              <>
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Processing...
              </>
            ) : (
              <>
                <ShieldAlert className="h-4 w-4 mr-2" />
                Grant Emergency Access
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
