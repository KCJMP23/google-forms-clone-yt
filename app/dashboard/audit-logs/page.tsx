import { Metadata } from "next";
import { AuditLogViewerClient } from "@/components/AuditLogViewerClient";

export const metadata: Metadata = {
  title: "Audit Logs | HIPAA Survey System",
  description: "View system audit logs and PHI access records",
};

/**
 * Audit Log Viewer Page
 *
 * Displays comprehensive audit logs for HIPAA compliance:
 * - PHI access logs (view, create, edit, delete)
 * - User authentication events
 * - Consent changes (granted, withdrawn)
 * - Data exports and de-identification operations
 * - System administrative actions
 *
 * Access restricted to:
 * - System Administrators
 * - Compliance Officers
 * - Auditors
 *
 * Logs are retained for 6 years per HIPAA §164.312(b) requirements.
 */
export default function AuditLogsPage() {
  return (
    <>
      <div className="px-6 py-4 border-b bg-white">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Audit Logs</h1>
          <p className="mt-1 text-sm text-gray-500">
            View system activity and PHI access logs for compliance monitoring
          </p>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <AuditLogViewerClient />
      </main>
    </>
  );
}
