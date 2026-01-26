import { Lock, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PHIIndicatorProps {
  /**
   * Whether to show the indicator inline with the label or as a badge
   */
  variant?: "inline" | "badge";

  /**
   * Optional custom className for styling
   */
  className?: string;

  /**
   * Optional PHI type description
   */
  phiType?: string;
}

/**
 * PHI (Protected Health Information) Indicator Component
 *
 * Shows a visual indicator (lock icon) for form fields that contain PHI
 * Provides tooltip with information about HIPAA protection
 *
 * This component helps users identify sensitive fields that are:
 * - Encrypted at rest with AES-256-GCM
 * - Access logged for HIPAA compliance
 * - Protected per §164.502(b) minimum necessary standard
 */
export function PHIIndicator({
  variant = "inline",
  className,
  phiType,
}: PHIIndicatorProps) {
  if (variant === "badge") {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700",
                className
              )}
            >
              <ShieldAlert className="h-3 w-3" />
              <span>PHI</span>
            </div>
          </TooltipTrigger>
          <TooltipContent
            side="right"
            className="max-w-xs bg-gray-900 text-white"
          >
            <div className="space-y-1">
              <p className="font-semibold">Protected Health Information</p>
              {phiType && (
                <p className="text-xs text-gray-300">Type: {phiType}</p>
              )}
              <p className="text-xs text-gray-300">
                This field contains sensitive information that is encrypted and
                access-logged per HIPAA requirements.
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Lock
            className={cn(
              "inline h-3.5 w-3.5 text-purple-600",
              className
            )}
            aria-label="Protected Health Information"
          />
        </TooltipTrigger>
        <TooltipContent
          side="right"
          className="max-w-xs bg-gray-900 text-white"
        >
          <div className="space-y-1">
            <p className="font-semibold">Protected Health Information</p>
            {phiType && <p className="text-xs text-gray-300">Type: {phiType}</p>}
            <p className="text-xs text-gray-300">
              This field contains sensitive information that is encrypted and
              access-logged per HIPAA requirements.
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
