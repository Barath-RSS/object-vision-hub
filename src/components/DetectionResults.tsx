import { Download, Box } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Detection } from '@/hooks/useObjectDetection';

interface DetectionResultsProps {
  processedImageUrl: string;
  detections: Detection[];
}

export function DetectionResults({ processedImageUrl, detections }: DetectionResultsProps) {
  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = processedImageUrl;
    a.download = 'detected-objects.png';
    a.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Box className="h-4 w-4 text-success" />
          <span className="text-sm font-medium text-foreground">
            {detections.length} object{detections.length !== 1 ? 's' : ''} detected
          </span>
        </div>
        <Button onClick={handleDownload} size="sm" variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Download
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border">
        <img
          src={processedImageUrl}
          alt="Detection result"
          className="w-full"
        />
      </div>

      {detections.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {detections.map((det, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg bg-accent px-3 py-2"
            >
              <span className="text-xs font-medium capitalize text-accent-foreground">
                {det.class}
              </span>
              <span className="text-xs font-semibold text-primary">
                {Math.round(det.score * 100)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
