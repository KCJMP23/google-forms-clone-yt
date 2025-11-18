'use client';

import { useState } from 'react';
import { Download, Copy, QrCode, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { generateQRCode, type QRCodeOptions } from '@/lib/distribution';
import { toast } from 'sonner';

interface QRCodeGeneratorProps {
  distributionLinkId: string;
  linkUrl: string;
  userId: string;
}

/**
 * QR Code Generator Component
 * Generates and downloads QR codes for survey distribution
 */
export function QRCodeGenerator({ distributionLinkId, linkUrl, userId }: QRCodeGeneratorProps) {
  const [qrCode, setQrCode] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [options, setOptions] = useState<QRCodeOptions>({
    width: 300,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
    margin: 4,
  });

  const handleGenerateQR = async () => {
    setIsGenerating(true);

    try {
      const qrDataURL = await generateQRCode(distributionLinkId, userId, options);
      setQrCode(qrDataURL);
      toast.success('QR code generated successfully');
    } catch (error) {
      console.error('QR generation error:', error);
      toast.error('Failed to generate QR code');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadQR = () => {
    if (!qrCode) return;

    const link = document.createElement('a');
    link.download = `survey-qr-code-${distributionLinkId}.png`;
    link.href = qrCode;
    link.click();

    toast.success('QR code downloaded');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(linkUrl);
    toast.success('Link copied to clipboard');
  };

  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogTrigger asChild>
        <Button variant="outline" onClick={() => {
          setShowDialog(true);
          if (!qrCode) handleGenerateQR();
        }}>
          <QrCode className="h-4 w-4 mr-2" />
          Generate QR Code
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Survey QR Code</DialogTitle>
          <DialogDescription>
            Generate and download a QR code for easy survey distribution
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* QR Code Display */}
          {qrCode ? (
            <div className="flex justify-center">
              <div className="border-2 border-gray-200 rounded-lg p-4">
                <img src={qrCode} alt="QR Code" className="w-64 h-64" />
              </div>
            </div>
          ) : (
            <div className="flex justify-center items-center h-64 border-2 border-dashed border-gray-300 rounded-lg">
              <div className="text-center text-muted-foreground">
                {isGenerating ? 'Generating QR code...' : 'Click Generate to create QR code'}
              </div>
            </div>
          )}

          {/* QR Code Options */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="size">Size</Label>
              <Select
                value={options.width?.toString()}
                onValueChange={(value) => setOptions({ ...options, width: parseInt(value) })}
              >
                <SelectTrigger id="size">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="200">Small (200px)</SelectItem>
                  <SelectItem value="300">Medium (300px)</SelectItem>
                  <SelectItem value="500">Large (500px)</SelectItem>
                  <SelectItem value="1000">Extra Large (1000px)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="errorCorrection">Error Correction</Label>
              <Select
                value={options.errorCorrectionLevel}
                onValueChange={(value: any) => setOptions({ ...options, errorCorrectionLevel: value })}
              >
                <SelectTrigger id="errorCorrection">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="L">Low (7%)</SelectItem>
                  <SelectItem value="M">Medium (15%)</SelectItem>
                  <SelectItem value="Q">Quartile (25%)</SelectItem>
                  <SelectItem value="H">High (30%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Link Display */}
          <div className="space-y-2">
            <Label>Survey Link</Label>
            <div className="flex gap-2">
              <input
                type="text"
                value={linkUrl}
                readOnly
                className="flex-1 px-3 py-2 text-sm border rounded-md bg-muted"
              />
              <Button variant="outline" size="sm" onClick={handleCopyLink}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setShowDialog(false)}>
            Close
          </Button>
          {!qrCode && (
            <Button onClick={handleGenerateQR} disabled={isGenerating}>
              {isGenerating ? 'Generating...' : 'Generate QR Code'}
            </Button>
          )}
          {qrCode && (
            <>
              <Button variant="outline" onClick={handleGenerateQR} disabled={isGenerating}>
                Regenerate
              </Button>
              <Button onClick={handleDownloadQR}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
