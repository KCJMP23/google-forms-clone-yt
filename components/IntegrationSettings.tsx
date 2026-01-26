'use client';

import { useState } from 'react';
import { Check, X, RefreshCw, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  testREDCapConnection,
  createREDCapClient,
  type REDCapConfig,
} from '@/lib/integrations/redcap';
import {
  testFHIRConnection,
  createFHIRClient,
  type FHIRConfig,
} from '@/lib/integrations/fhir';
import { toast } from 'sonner';

interface IntegrationSettingsProps {
  userId: string;
}

/**
 * Integration Settings Component
 * Configure REDCap, FHIR/EHR, and other integrations
 */
export function IntegrationSettings({ userId }: IntegrationSettingsProps) {
  // REDCap state
  const [redcapConfig, setRedcapConfig] = useState<Partial<REDCapConfig>>({
    apiUrl: '',
    apiToken: '',
    projectId: '',
    exportDag: false,
    exportSurveyFields: true,
  });
  const [redcapConnected, setRedcapConnected] = useState(false);
  const [redcapTesting, setRedcapTesting] = useState(false);

  // FHIR state
  const [fhirConfig, setFhirConfig] = useState<Partial<FHIRConfig>>({
    baseUrl: '',
    clientId: '',
    clientSecret: '',
    scope: 'patient/*.read',
  });
  const [fhirConnected, setFhirConnected] = useState(false);
  const [fhirTesting, setFhirTesting] = useState(false);

  // Auto-sync settings
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [syncInterval, setSyncInterval] = useState('3600'); // 1 hour

  /**
   * Test REDCap connection
   */
  const handleTestREDCap = async () => {
    if (!redcapConfig.apiUrl || !redcapConfig.apiToken) {
      toast.error('Please enter API URL and API Token');
      return;
    }

    setRedcapTesting(true);

    try {
      const isConnected = await testREDCapConnection(
        redcapConfig.apiUrl,
        redcapConfig.apiToken
      );

      if (isConnected) {
        setRedcapConnected(true);
        toast.success('REDCap connection successful!');
      } else {
        setRedcapConnected(false);
        toast.error('REDCap connection failed. Please check your credentials.');
      }
    } catch (error) {
      setRedcapConnected(false);
      toast.error('Connection test failed');
    } finally {
      setRedcapTesting(false);
    }
  };

  /**
   * Save REDCap configuration
   */
  const handleSaveREDCap = async () => {
    if (!redcapConnected) {
      toast.error('Please test connection first');
      return;
    }

    try {
      // Save configuration to database (implementation depends on your setup)
      // await saveREDCapConfig(userId, redcapConfig);

      toast.success('REDCap configuration saved successfully');
    } catch (error) {
      toast.error('Failed to save configuration');
    }
  };

  /**
   * Test FHIR connection
   */
  const handleTestFHIR = async () => {
    if (!fhirConfig.baseUrl) {
      toast.error('Please enter FHIR Base URL');
      return;
    }

    setFhirTesting(true);

    try {
      const isConnected = await testFHIRConnection(fhirConfig.baseUrl);

      if (isConnected) {
        setFhirConnected(true);
        toast.success('FHIR connection successful!');
      } else {
        setFhirConnected(false);
        toast.error('FHIR connection failed. Please check your URL.');
      }
    } catch (error) {
      setFhirConnected(false);
      toast.error('Connection test failed');
    } finally {
      setFhirTesting(false);
    }
  };

  /**
   * Save FHIR configuration
   */
  const handleSaveFHIR = async () => {
    if (!fhirConnected) {
      toast.error('Please test connection first');
      return;
    }

    try {
      // Save configuration to database
      // await saveFHIRConfig(userId, fhirConfig);

      toast.success('FHIR configuration saved successfully');
    } catch (error) {
      toast.error('Failed to save configuration');
    }
  };

  /**
   * Trigger manual sync
   */
  const handleManualSync = async (integrationType: 'redcap' | 'fhir') => {
    try {
      // Implementation depends on your sync logic
      toast.success(`${integrationType.toUpperCase()} sync started`);
    } catch (error) {
      toast.error('Sync failed');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Integrations</h2>
        <p className="text-muted-foreground">
          Configure connections to external systems
        </p>
      </div>

      <Tabs defaultValue="redcap" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="redcap">REDCap</TabsTrigger>
          <TabsTrigger value="fhir">FHIR/EHR</TabsTrigger>
          <TabsTrigger value="settings">Sync Settings</TabsTrigger>
        </TabsList>

        {/* REDCap Integration */}
        <TabsContent value="redcap">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>REDCap Integration</CardTitle>
                  <CardDescription>
                    Connect to REDCap for research data management
                  </CardDescription>
                </div>
                {redcapConnected && (
                  <Badge variant="default" className="flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    Connected
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="redcap-url">API URL</Label>
                <Input
                  id="redcap-url"
                  type="url"
                  placeholder="https://redcap.example.org/api/"
                  value={redcapConfig.apiUrl}
                  onChange={(e) => setRedcapConfig({ ...redcapConfig, apiUrl: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="redcap-token">API Token</Label>
                <Input
                  id="redcap-token"
                  type="password"
                  placeholder="Enter your REDCap API token"
                  value={redcapConfig.apiToken}
                  onChange={(e) => setRedcapConfig({ ...redcapConfig, apiToken: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="redcap-project">Project ID</Label>
                <Input
                  id="redcap-project"
                  type="text"
                  placeholder="e.g., 12345"
                  value={redcapConfig.projectId}
                  onChange={(e) => setRedcapConfig({ ...redcapConfig, projectId: e.target.value })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="export-dag">Export Data Access Groups</Label>
                <Switch
                  id="export-dag"
                  checked={redcapConfig.exportDag}
                  onCheckedChange={(checked) => setRedcapConfig({ ...redcapConfig, exportDag: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="export-survey">Export Survey Fields</Label>
                <Switch
                  id="export-survey"
                  checked={redcapConfig.exportSurveyFields}
                  onCheckedChange={(checked) => setRedcapConfig({ ...redcapConfig, exportSurveyFields: checked })}
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                variant="outline"
                onClick={handleTestREDCap}
                disabled={redcapTesting}
              >
                {redcapTesting ? 'Testing...' : 'Test Connection'}
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleManualSync('redcap')}
                  disabled={!redcapConnected}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sync Now
                </Button>
                <Button onClick={handleSaveREDCap} disabled={!redcapConnected}>
                  Save Configuration
                </Button>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* FHIR/EHR Integration */}
        <TabsContent value="fhir">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>FHIR/EHR Integration</CardTitle>
                  <CardDescription>
                    Connect to Epic, Cerner, or other FHIR-compliant EHR systems
                  </CardDescription>
                </div>
                {fhirConnected && (
                  <Badge variant="default" className="flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    Connected
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fhir-url">FHIR Base URL</Label>
                <Input
                  id="fhir-url"
                  type="url"
                  placeholder="https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4"
                  value={fhirConfig.baseUrl}
                  onChange={(e) => setFhirConfig({ ...fhirConfig, baseUrl: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fhir-client-id">Client ID</Label>
                <Input
                  id="fhir-client-id"
                  type="text"
                  placeholder="Your OAuth2 client ID"
                  value={fhirConfig.clientId}
                  onChange={(e) => setFhirConfig({ ...fhirConfig, clientId: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fhir-client-secret">Client Secret (Optional)</Label>
                <Input
                  id="fhir-client-secret"
                  type="password"
                  placeholder="Your OAuth2 client secret"
                  value={fhirConfig.clientSecret}
                  onChange={(e) => setFhirConfig({ ...fhirConfig, clientSecret: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fhir-scope">Scope</Label>
                <Input
                  id="fhir-scope"
                  type="text"
                  placeholder="e.g., patient/*.read"
                  value={fhirConfig.scope}
                  onChange={(e) => setFhirConfig({ ...fhirConfig, scope: e.target.value })}
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                variant="outline"
                onClick={handleTestFHIR}
                disabled={fhirTesting}
              >
                {fhirTesting ? 'Testing...' : 'Test Connection'}
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleManualSync('fhir')}
                  disabled={!fhirConnected}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sync Now
                </Button>
                <Button onClick={handleSaveFHIR} disabled={!fhirConnected}>
                  Save Configuration
                </Button>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Sync Settings */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Sync Settings</CardTitle>
              <CardDescription>
                Configure automatic synchronization settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="auto-sync">Enable Auto-Sync</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically sync data with connected systems
                  </p>
                </div>
                <Switch
                  id="auto-sync"
                  checked={autoSyncEnabled}
                  onCheckedChange={setAutoSyncEnabled}
                />
              </div>

              {autoSyncEnabled && (
                <div className="space-y-2">
                  <Label htmlFor="sync-interval">Sync Interval (seconds)</Label>
                  <Input
                    id="sync-interval"
                    type="number"
                    value={syncInterval}
                    onChange={(e) => setSyncInterval(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Recommended: 3600 seconds (1 hour) or more
                  </p>
                </div>
              )}

              <div className="pt-4 border-t">
                <h4 className="font-medium mb-2">Last Sync Times</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">REDCap:</span>
                    <span>Never synced</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">FHIR/EHR:</span>
                    <span>Never synced</span>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full">
                <Settings className="h-4 w-4 mr-2" />
                Save Sync Settings
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
