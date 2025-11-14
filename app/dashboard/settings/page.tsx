import { Metadata } from "next";
import { UserProfileSettingsClient } from "@/components/UserProfileSettingsClient";

export const metadata: Metadata = {
  title: "Profile Settings | HIPAA Survey System",
  description: "Manage your account settings and security preferences",
};

/**
 * User Profile Settings Page
 *
 * Allows authenticated users (researchers, providers, admins) to manage:
 * - MFA configuration (required for high-privilege roles)
 * - Session timeout preferences
 * - Notification settings
 * - Account information
 *
 * Note: This is for platform administrators/researchers only.
 * Anonymous survey respondents do not need accounts.
 */
export default function UserProfileSettingsPage() {
  return (
    <>
      <div className="px-6 py-4 border-b bg-white">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-semibold text-gray-900">
            Profile Settings
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your account security and preferences
          </p>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <UserProfileSettingsClient />
      </main>
    </>
  );
}
