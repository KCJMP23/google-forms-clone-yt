'use client';

import { useState, useEffect } from 'react';
import { Plus, Link2, Trash2, BarChart3, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { QRCodeGenerator } from './QRCodeGenerator';
import {
  generateDistributionLink,
  getFormDistributionLinks,
  getDistributionStats,
  deactivateDistributionLink,
  deleteDistributionLink,
  type DistributionLink,
  type DistributionStats,
} from '@/lib/distribution';
import { toast } from 'sonner';

interface DistributionManagerProps {
  formId: string;
  userId: string;
}

/**
 * Distribution Manager Component
 * Manages all distribution links, QR codes, and tracking for a form
 */
export function DistributionManager({ formId, userId }: DistributionManagerProps) {
  const [links, setLinks] = useState<DistributionLink[]>([]);
  const [stats, setStats] = useState<DistributionStats | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showStatsDialog, setShowStatsDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // New link options
  const [newLinkType, setNewLinkType] = useState<'public' | 'unique' | 'temporary'>('public');
  const [newLinkExpires, setNewLinkExpires] = useState<string>('');
  const [newLinkMaxResponses, setNewLinkMaxResponses] = useState<string>('');
  const [newLinkTracking, setNewLinkTracking] = useState(true);

  useEffect(() => {
    loadLinks();
    loadStats();
  }, [formId]);

  const loadLinks = async () => {
    setIsLoading(true);
    try {
      const formLinks = await getFormDistributionLinks(formId);
      setLinks(formLinks);
    } catch (error) {
      console.error('Load links error:', error);
      toast.error('Failed to load distribution links');
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const formStats = await getDistributionStats(formId);
      setStats(formStats);
    } catch (error) {
      console.error('Load stats error:', error);
    }
  };

  const handleCreateLink = async () => {
    try {
      const newLink = await generateDistributionLink(formId, userId, {
        type: newLinkType,
        expiresAt: newLinkExpires ? new Date(newLinkExpires) : undefined,
        maxResponses: newLinkMaxResponses ? parseInt(newLinkMaxResponses) : undefined,
        trackingEnabled: newLinkTracking,
      });

      setLinks([...links, newLink]);
      setShowCreateDialog(false);
      toast.success('Distribution link created successfully');

      // Reset form
      setNewLinkType('public');
      setNewLinkExpires('');
      setNewLinkMaxResponses('');
      setNewLinkTracking(true);
    } catch (error) {
      console.error('Create link error:', error);
      toast.error('Failed to create distribution link');
    }
  };

  const handleDeactivateLink = async (linkId: string) => {
    try {
      await deactivateDistributionLink(linkId, userId);
      loadLinks();
      toast.success('Link deactivated');
    } catch (error) {
      console.error('Deactivate link error:', error);
      toast.error('Failed to deactivate link');
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    if (!confirm('Are you sure you want to delete this link?')) {
      return;
    }

    try {
      await deleteDistributionLink(linkId, userId);
      setLinks(links.filter(l => l.id !== linkId));
      toast.success('Link deleted');
    } catch (error) {
      console.error('Delete link error:', error);
      toast.error('Failed to delete link');
    }
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Survey Distribution</h2>
          <p className="text-muted-foreground">
            Manage distribution links and track survey responses
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowStatsDialog(true)}>
            <BarChart3 className="h-4 w-4 mr-2" />
            View Stats
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Link
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Links
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalLinks}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Links
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeLinks}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Clicks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalClicks}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Response Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.responseRate.toFixed(1)}%</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Distribution Links List */}
      <Card>
        <CardHeader>
          <CardTitle>Distribution Links</CardTitle>
          <CardDescription>
            Manage all distribution links for this survey
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading links...</div>
          ) : links.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No distribution links yet. Create one to get started.
            </div>
          ) : (
            <div className="space-y-4">
              {links.map((link) => (
                <div
                  key={link.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={link.isActive ? 'default' : 'secondary'}>
                        {link.type}
                      </Badge>
                      {!link.isActive && (
                        <Badge variant="destructive">Inactive</Badge>
                      )}
                      {link.expiresAt && (
                        <Badge variant="outline">
                          Expires: {new Date(link.expiresAt).toLocaleDateString()}
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground font-mono truncate max-w-md">
                      {link.url}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Responses: {link.currentResponses}
                      {link.maxResponses && ` / ${link.maxResponses}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <QRCodeGenerator
                      distributionLinkId={link.id}
                      linkUrl={link.url}
                      userId={userId}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyLink(link.url)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    {link.isActive && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeactivateLink(link.id)}
                      >
                        Deactivate
                      </Button>
                    )}
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteLink(link.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Link Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Distribution Link</DialogTitle>
            <DialogDescription>
              Generate a new link to distribute your survey
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="linkType">Link Type</Label>
              <Select
                value={newLinkType}
                onValueChange={(value: any) => setNewLinkType(value)}
              >
                <SelectTrigger id="linkType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public (Anyone can use)</SelectItem>
                  <SelectItem value="unique">Unique (One-time use per person)</SelectItem>
                  <SelectItem value="temporary">Temporary (Expires)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expiresAt">Expiration Date (Optional)</Label>
              <Input
                id="expiresAt"
                type="datetime-local"
                value={newLinkExpires}
                onChange={(e) => setNewLinkExpires(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxResponses">Max Responses (Optional)</Label>
              <Input
                id="maxResponses"
                type="number"
                placeholder="e.g., 100"
                value={newLinkMaxResponses}
                onChange={(e) => setNewLinkMaxResponses(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="tracking">Enable Tracking</Label>
              <Switch
                id="tracking"
                checked={newLinkTracking}
                onCheckedChange={setNewLinkTracking}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateLink}>Create Link</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stats Dialog */}
      <Dialog open={showStatsDialog} onOpenChange={setShowStatsDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Distribution Statistics</DialogTitle>
            <DialogDescription>
              Detailed analytics for survey distribution
            </DialogDescription>
          </DialogHeader>

          {stats && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Total Links</div>
                  <div className="text-2xl font-bold">{stats.totalLinks}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Active Links</div>
                  <div className="text-2xl font-bold">{stats.activeLinks}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Total Clicks</div>
                  <div className="text-2xl font-bold">{stats.totalClicks}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Total Responses</div>
                  <div className="text-2xl font-bold">{stats.totalResponses}</div>
                </div>
              </div>

              <div>
                <div className="text-sm font-medium mb-2">Response Rate</div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${stats.responseRate}%` }}
                  />
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {stats.responseRate.toFixed(1)}% of clicks result in submissions
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setShowStatsDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
