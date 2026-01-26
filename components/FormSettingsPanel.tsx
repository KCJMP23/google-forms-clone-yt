'use client';

import { FormSettings } from '@/lib/form-builder-types';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card } from './ui/card';
import { Separator } from './ui/separator';

interface FormSettingsPanelProps {
  settings: FormSettings;
  onChange: (settings: FormSettings) => void;
}

export function FormSettingsPanel({ settings, onChange }: FormSettingsPanelProps) {
  const updateSetting = <K extends keyof FormSettings>(
    key: K,
    value: FormSettings[K]
  ) => {
    onChange({ ...settings, [key]: value });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold mb-4">Form Settings</h3>

        <div className="space-y-4">
          {/* General Settings */}
          <Card className="p-4 space-y-3">
            <h4 className="font-medium text-sm">General</h4>

            <div className="flex items-center justify-between">
              <Label htmlFor="allowAnonymous">Allow Anonymous</Label>
              <Switch
                id="allowAnonymous"
                checked={settings.allowAnonymous}
                onCheckedChange={(checked) => updateSetting('allowAnonymous', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="requireConsent">Require Consent</Label>
              <Switch
                id="requireConsent"
                checked={settings.requireConsent}
                onCheckedChange={(checked) => updateSetting('requireConsent', checked)}
              />
            </div>

            {settings.requireConsent && (
              <div>
                <Label htmlFor="consentText">Consent Text</Label>
                <Textarea
                  id="consentText"
                  value={settings.consentText || ''}
                  onChange={(e) => updateSetting('consentText', e.target.value)}
                  placeholder="Enter consent text..."
                  rows={4}
                />
              </div>
            )}
          </Card>

          {/* Distribution */}
          <Card className="p-4 space-y-3">
            <h4 className="font-medium text-sm">Distribution</h4>

            <div className="flex items-center justify-between">
              <Label htmlFor="isPublic">Public Form</Label>
              <Switch
                id="isPublic"
                checked={settings.isPublic}
                onCheckedChange={(checked) => updateSetting('isPublic', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="allowMultiple">Allow Multiple Submissions</Label>
              <Switch
                id="allowMultiple"
                checked={settings.allowMultipleSubmissions}
                onCheckedChange={(checked) =>
                  updateSetting('allowMultipleSubmissions', checked)
                }
              />
            </div>

            <div>
              <Label htmlFor="maxResponses">Max Responses (optional)</Label>
              <Input
                id="maxResponses"
                type="number"
                value={settings.maxResponses || ''}
                onChange={(e) =>
                  updateSetting('maxResponses', e.target.value ? Number(e.target.value) : undefined)
                }
                placeholder="Unlimited"
              />
            </div>
          </Card>

          {/* HIPAA Settings */}
          <Card className="p-4 space-y-3 border-purple-200 bg-purple-50">
            <h4 className="font-medium text-sm text-purple-900">HIPAA Compliance</h4>

            <div className="flex items-center justify-between">
              <Label htmlFor="containsPHI">Contains PHI</Label>
              <Switch
                id="containsPHI"
                checked={settings.containsPHI}
                onCheckedChange={(checked) => updateSetting('containsPHI', checked)}
              />
            </div>

            <div>
              <Label htmlFor="dataClassification">Data Classification</Label>
              <Select
                value={settings.dataClassification}
                onValueChange={(value: any) => updateSetting('dataClassification', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PHI">PHI - Protected Health Information</SelectItem>
                  <SelectItem value="De-identified">De-identified</SelectItem>
                  <SelectItem value="Anonymous">Anonymous</SelectItem>
                  <SelectItem value="Limited Data Set">Limited Data Set</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="retention">Retention Period (days)</Label>
              <Input
                id="retention"
                type="number"
                value={settings.retentionPeriodDays}
                onChange={(e) =>
                  updateSetting('retentionPeriodDays', Number(e.target.value))
                }
              />
              <p className="text-xs text-gray-500 mt-1">
                Minimum 2,190 days (6 years) for HIPAA compliance
              </p>
            </div>
          </Card>

          {/* Notifications */}
          <Card className="p-4 space-y-3">
            <h4 className="font-medium text-sm">Notifications</h4>

            <div className="flex items-center justify-between">
              <Label htmlFor="notifyOnSubmission">Notify on Submission</Label>
              <Switch
                id="notifyOnSubmission"
                checked={settings.notifyOnSubmission}
                onCheckedChange={(checked) => updateSetting('notifyOnSubmission', checked)}
              />
            </div>

            {settings.notifyOnSubmission && (
              <div>
                <Label htmlFor="notificationEmails">Notification Emails</Label>
                <Textarea
                  id="notificationEmails"
                  value={settings.notificationEmails.join(', ')}
                  onChange={(e) =>
                    updateSetting(
                      'notificationEmails',
                      e.target.value.split(',').map((email) => email.trim())
                    )
                  }
                  placeholder="email1@example.com, email2@example.com"
                  rows={2}
                />
              </div>
            )}
          </Card>

          {/* Advanced */}
          <Card className="p-4 space-y-3">
            <h4 className="font-medium text-sm">Advanced</h4>

            <div className="flex items-center justify-between">
              <Label htmlFor="enableAutoSave">Enable Auto-save</Label>
              <Switch
                id="enableAutoSave"
                checked={settings.enableAutoSave}
                onCheckedChange={(checked) => updateSetting('enableAutoSave', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="showProgressBar">Show Progress Bar</Label>
              <Switch
                id="showProgressBar"
                checked={settings.showProgressBar}
                onCheckedChange={(checked) => updateSetting('showProgressBar', checked)}
              />
            </div>

            <div>
              <Label htmlFor="redirectUrl">Redirect URL (after submission)</Label>
              <Input
                id="redirectUrl"
                value={settings.redirectUrl || ''}
                onChange={(e) => updateSetting('redirectUrl', e.target.value)}
                placeholder="https://example.com/thank-you"
              />
            </div>

            <div>
              <Label htmlFor="successMessage">Custom Success Message</Label>
              <Textarea
                id="successMessage"
                value={settings.customSuccessMessage || ''}
                onChange={(e) => updateSetting('customSuccessMessage', e.target.value)}
                placeholder="Thank you for your submission!"
                rows={3}
              />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
