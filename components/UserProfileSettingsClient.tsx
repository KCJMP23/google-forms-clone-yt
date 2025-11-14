"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Switch } from "./ui/switch";
import { Separator } from "./ui/separator";
import {
  Shield,
  Clock,
  Bell,
  User,
  Mail,
  CheckCircle2,
  AlertCircle,
  KeyRound,
} from "lucide-react";
import { useUserRole, useRoleDisplayName } from "@/lib/hooks/use-user-role";
import { ROLE_TIMEOUT_MINUTES, requiresMFA } from "@/lib/rbac-config";

export function UserProfileSettingsClient() {
  const { user } = useUser();
  const { role } = useUserRole();
  const roleDisplayName = useRoleDisplayName();

  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState(
    ROLE_TIMEOUT_MINUTES[role].toString()
  );

  const mfaRequired = requiresMFA(role);

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading...</CardTitle>
          <CardDescription>Please wait while we load your settings.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Account Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Account Information
          </CardTitle>
          <CardDescription>
            Your account details and role in the system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm text-gray-600">Full Name</Label>
              <div className="text-base font-medium">
                {user.fullName || "Not set"}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-gray-600">Email Address</Label>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-400" />
                <div className="text-base">
                  {user.primaryEmailAddress?.emailAddress}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-gray-600">User ID</Label>
              <div className="text-sm font-mono text-gray-600">{user.id}</div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-gray-600">Role</Label>
              <div>
                <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">
                  {roleDisplayName}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Settings
          </CardTitle>
          <CardDescription>
            Multi-factor authentication and password requirements
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* MFA Status */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Label className="text-base font-medium">
                  Two-Factor Authentication (2FA)
                </Label>
                {mfaRequired && (
                  <Badge
                    variant="outline"
                    className="bg-amber-50 text-amber-700 border-amber-300"
                  >
                    Required
                  </Badge>
                )}
              </div>
              <p className="text-sm text-gray-500">
                {mfaRequired
                  ? "Your role requires 2FA for enhanced security per HIPAA requirements."
                  : "Add an extra layer of security to your account."}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {mfaEnabled ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="text-sm font-medium">Enabled</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-gray-400">
                  <AlertCircle className="h-5 w-5" />
                  <span className="text-sm font-medium">Disabled</span>
                </div>
              )}
              <Button
                variant={mfaEnabled ? "outline" : "default"}
                size="sm"
                onClick={() => setMfaEnabled(!mfaEnabled)}
                className={!mfaEnabled ? "bg-purple-600 hover:bg-purple-700" : ""}
              >
                {mfaEnabled ? "Disable 2FA" : "Enable 2FA"}
              </Button>
            </div>
          </div>

          <Separator />

          {/* Password Requirements */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-gray-600" />
              <Label className="text-base font-medium">Password Requirements</Label>
            </div>
            <div className="rounded-lg bg-gray-50 p-4 space-y-2 text-sm">
              <p className="text-gray-700">
                Your role requires passwords that meet these criteria:
              </p>
              <ul className="space-y-1 text-gray-600 ml-4">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                  Minimum {requiresMFA(role) ? "12" : "8"} characters
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                  At least one uppercase and lowercase letter
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                  At least one number
                </li>
                {requiresMFA(role) && (
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                    At least one special character
                  </li>
                )}
              </ul>
              <p className="text-xs text-gray-500 pt-2">
                Password expires every {requiresMFA(role) ? "60" : "90"} days
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Session Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Session Settings
          </CardTitle>
          <CardDescription>
            Configure automatic logout and session timeout preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Label htmlFor="session-timeout" className="text-base font-medium">
              Session Timeout Duration
            </Label>
            <p className="text-sm text-gray-500">
              You will be automatically logged out after this period of inactivity.
              Your role's default timeout is {ROLE_TIMEOUT_MINUTES[role]} minutes.
            </p>
            <Select value={sessionTimeout} onValueChange={setSessionTimeout}>
              <SelectTrigger id="session-timeout" className="w-full sm:w-[280px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 minutes</SelectItem>
                <SelectItem value="10">10 minutes</SelectItem>
                <SelectItem value="15">15 minutes (Recommended)</SelectItem>
                <SelectItem value="20">20 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium">
                Show session timeout warning
              </Label>
              <p className="text-sm text-gray-500">
                Display a countdown warning 60 seconds before automatic logout
              </p>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
          <CardDescription>
            Choose how you want to be notified about system events
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium">Email Notifications</Label>
              <p className="text-sm text-gray-500">
                Receive email alerts for new survey responses and system updates
              </p>
            </div>
            <Switch
              checked={emailNotifications}
              onCheckedChange={setEmailNotifications}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium">Security Alerts</Label>
              <p className="text-sm text-gray-500">
                Immediate notifications for login attempts and security events
              </p>
            </div>
            <Switch defaultChecked disabled />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium">Audit Log Alerts</Label>
              <p className="text-sm text-gray-500">
                Notifications for unusual PHI access patterns (Compliance Officers only)
              </p>
            </div>
            <Switch />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex items-center justify-end gap-3">
        <Button variant="outline">Cancel</Button>
        <Button className="bg-purple-600 hover:bg-purple-700">
          Save Changes
        </Button>
      </div>
    </div>
  );
}
