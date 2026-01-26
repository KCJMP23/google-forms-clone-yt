import { Metadata } from "next";
import { ConsentManagementClient } from "@/components/ConsentManagementClient";

export const metadata: Metadata = {
  title: "Consent Management | HIPAA Survey System",
  description: "Manage patient consents and permissions",
};

/**
 * Consent Management Page
 *
 * Allows authorized users to view and manage patient consents.
 * Tracks consent for:
 * - Treatment and care coordination
 * - Research participation
 * - Data sharing with third parties
 * - Marketing communications
 *
 * All consent changes are audited per HIPAA requirements.
 */
export default function ConsentManagementPage() {
  return (
    <>
      <div className="px-6 py-4 border-b bg-white">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-semibold text-gray-900">
            Consent Management
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            View and manage patient consents for treatment, research, and data
            sharing
          </p>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <ConsentManagementClient />
      </main>
    </>
  );
}
