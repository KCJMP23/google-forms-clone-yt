"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Download,
  Shield,
  AlertTriangle,
  FileSpreadsheet,
  Database,
  CheckCircle2,
} from "lucide-react";
import { DataClassification } from "@/lib/definitions";
import { useHasPermission } from "@/lib/hooks/use-permissions";
import { Permission } from "@/lib/definitions";

interface ResearchExportDialogProps {
  surveyId: string;
  surveyTitle: string;
  totalResponses: number;
  containsPHI?: boolean;
}

type ExportFormat = "csv" | "json" | "xlsx";
type DeidentificationMethod = "none" | "safe_harbor" | "limited_dataset";

/**
 * Research Export Dialog
 *
 * Allows researchers and authorized users to export survey data with:
 * - Multiple export formats (CSV, JSON, Excel)
 * - De-identification options for HIPAA compliance
 * - Audit logging for all exports
 *
 * Export Options:
 * 1. Raw Data - Export as-is (requires EXPORT_PHI permission if data contains PHI)
 * 2. Safe Harbor - Removes 18 HIPAA identifiers
 * 3. Limited Data Set - Retains dates and ZIP codes (requires Data Use Agreement)
 */
export function ResearchExportDialog({
  surveyId,
  surveyTitle,
  totalResponses,
  containsPHI = false,
}: ResearchExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("csv");
  const [deidentificationMethod, setDeidentificationMethod] =
    useState<DeidentificationMethod>(containsPHI ? "safe_harbor" : "none");
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [includeTimestamps, setIncludeTimestamps] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const canExportPHI = useHasPermission(Permission.EXPORT_PHI);
  const canDeidentify = useHasPermission(Permission.DEIDENTIFY_DATA);

  const handleExport = async () => {
    setIsExporting(true);

    // Simulate export process
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // TODO: Implement actual export logic
    // 1. Fetch survey responses
    // 2. Apply de-identification if selected
    // 3. Format data according to selected format
    // 4. Log export in audit trail
    // 5. Download file

    console.log("Exporting:", {
      surveyId,
      format: exportFormat,
      deidentificationMethod,
      includeMetadata,
      includeTimestamps,
      totalResponses,
    });

    setIsExporting(false);
    setOpen(false);
  };

  const canExport =
    !containsPHI ||
    deidentificationMethod !== "none" ||
    (deidentificationMethod === "none" && canExportPHI);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export Data
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-purple-600" />
            Export Survey Data
          </DialogTitle>
          <DialogDescription>
            Export {totalResponses} responses from &quot;{surveyTitle}&quot;
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* PHI Warning */}
          {containsPHI && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-amber-900">
                    This survey may contain Protected Health Information (PHI)
                  </p>
                  <p className="text-sm text-amber-700">
                    Please select an appropriate de-identification method before
                    exporting. All exports are logged for HIPAA compliance.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Export Format */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Export Format</Label>
            <RadioGroup value={exportFormat} onValueChange={(v) => setExportFormat(v as ExportFormat)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="csv" id="csv" />
                <Label htmlFor="csv" className="flex items-center gap-2 cursor-pointer">
                  <FileSpreadsheet className="h-4 w-4" />
                  <span>CSV (Comma-Separated Values)</span>
                  <Badge variant="outline" className="text-xs">
                    Recommended
                  </Badge>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="xlsx" id="xlsx" />
                <Label htmlFor="xlsx" className="flex items-center gap-2 cursor-pointer">
                  <FileSpreadsheet className="h-4 w-4" />
                  <span>Excel (XLSX)</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="json" id="json" />
                <Label htmlFor="json" className="flex items-center gap-2 cursor-pointer">
                  <Database className="h-4 w-4" />
                  <span>JSON (JavaScript Object Notation)</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <Separator />

          {/* De-identification Options */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-purple-600" />
              <Label className="text-base font-medium">
                De-identification Method
              </Label>
            </div>
            <RadioGroup
              value={deidentificationMethod}
              onValueChange={(v) =>
                setDeidentificationMethod(v as DeidentificationMethod)
              }
            >
              {/* Raw Data Option */}
              <div className="flex items-start space-x-2">
                <RadioGroupItem
                  value="none"
                  id="none"
                  disabled={containsPHI && !canExportPHI}
                />
                <div className="space-y-1">
                  <Label
                    htmlFor="none"
                    className="cursor-pointer font-medium flex items-center gap-2"
                  >
                    Raw Data (No De-identification)
                    {containsPHI && (
                      <Badge className="bg-red-100 text-red-700 hover:bg-red-100 text-xs">
                        Requires Permission
                      </Badge>
                    )}
                  </Label>
                  <p className="text-sm text-gray-500">
                    Export data as-is without any modifications. Requires explicit
                    permission if data contains PHI.
                  </p>
                </div>
              </div>

              {/* Safe Harbor Option */}
              <div className="flex items-start space-x-2">
                <RadioGroupItem value="safe_harbor" id="safe_harbor" />
                <div className="space-y-1">
                  <Label
                    htmlFor="safe_harbor"
                    className="cursor-pointer font-medium flex items-center gap-2"
                  >
                    Safe Harbor Method
                    {containsPHI && (
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-xs">
                        Recommended
                      </Badge>
                    )}
                  </Label>
                  <p className="text-sm text-gray-500">
                    Removes all 18 HIPAA identifiers (names, dates, addresses, etc.).
                    Data is fully de-identified per §164.514(b)(2).
                  </p>
                </div>
              </div>

              {/* Limited Data Set Option */}
              <div className="flex items-start space-x-2">
                <RadioGroupItem value="limited_dataset" id="limited_dataset" />
                <div className="space-y-1">
                  <Label
                    htmlFor="limited_dataset"
                    className="cursor-pointer font-medium flex items-center gap-2"
                  >
                    Limited Data Set
                    <Badge variant="outline" className="text-xs">
                      Requires DUA
                    </Badge>
                  </Label>
                  <p className="text-sm text-gray-500">
                    Retains dates and geographic data (city, state, ZIP). Requires
                    Data Use Agreement (DUA) per §164.514(e).
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>

          <Separator />

          {/* Additional Options */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Additional Options</Label>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="metadata"
                checked={includeMetadata}
                onCheckedChange={(checked: boolean) =>
                  setIncludeMetadata(checked)
                }
              />
              <Label
                htmlFor="metadata"
                className="text-sm font-normal cursor-pointer"
              >
                Include survey metadata (title, description, field labels)
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="timestamps"
                checked={includeTimestamps}
                onCheckedChange={(checked: boolean) =>
                  setIncludeTimestamps(checked)
                }
              />
              <Label
                htmlFor="timestamps"
                className="text-sm font-normal cursor-pointer"
              >
                Include submission timestamps
                {deidentificationMethod === "safe_harbor" && (
                  <span className="text-xs text-amber-600 ml-1">
                    (will be shifted to protect identity)
                  </span>
                )}
              </Label>
            </div>
          </div>

          {/* Export Summary */}
          <div className="rounded-lg bg-gray-50 p-4 space-y-2">
            <p className="text-sm font-medium text-gray-700">Export Summary</p>
            <div className="space-y-1 text-sm text-gray-600">
              <div className="flex justify-between">
                <span>Total Responses:</span>
                <span className="font-medium">{totalResponses}</span>
              </div>
              <div className="flex justify-between">
                <span>Format:</span>
                <span className="font-medium uppercase">{exportFormat}</span>
              </div>
              <div className="flex justify-between">
                <span>De-identification:</span>
                <span className="font-medium">
                  {deidentificationMethod === "none"
                    ? "None"
                    : deidentificationMethod === "safe_harbor"
                    ? "Safe Harbor"
                    : "Limited Data Set"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Data Classification:</span>
                <Badge
                  variant="outline"
                  className={
                    deidentificationMethod === "none" && containsPHI
                      ? "bg-red-50 text-red-700 border-red-200"
                      : "bg-green-50 text-green-700 border-green-200"
                  }
                >
                  {deidentificationMethod === "none" && containsPHI
                    ? "PHI"
                    : "De-identified"}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={!canExport || isExporting}
            className="bg-purple-600 hover:bg-purple-700 gap-2"
          >
            {isExporting ? (
              <>
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Export Data
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
