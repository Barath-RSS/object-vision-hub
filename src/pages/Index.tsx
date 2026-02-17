import { useState, useRef, useCallback } from 'react';
import { Scan, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UploadZone } from '@/components/UploadZone';
import { DetectionResults } from '@/components/DetectionResults';
import { useObjectDetection } from '@/hooks/useObjectDetection';

const Index = () => {
  const { loading, detecting, detections, error, processedImageUrl, detect } = useObjectDetection();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const handleFileSelect = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  }, []);

  const handleDetect = useCallback(() => {
    if (imgRef.current) {
      detect(imgRef.current);
    }
  }, [detect]);

  const handleReset = useCallback(() => {
    setPreviewUrl(null);
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            AI Object Detection
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Upload an image and detect objects using AI
          </p>
        </div>

        {/* Main Card */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6">
          {loading && (
            <div className="flex flex-col items-center justify-center gap-3 py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading AI model…</p>
            </div>
          )}

          {!loading && (
            <div className="space-y-4">
              {/* Upload */}
              {!processedImageUrl && (
                <>
                  <UploadZone onFileSelect={handleFileSelect} disabled={detecting} />

                  {/* Preview */}
                  {previewUrl && (
                    <>
                      <div className="overflow-hidden rounded-xl border border-border">
                        <img
                          ref={imgRef}
                          src={previewUrl}
                          alt="Upload preview"
                          className="w-full"
                          crossOrigin="anonymous"
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={handleDetect}
                          disabled={detecting}
                          className="flex-1 gap-2"
                          size="lg"
                        >
                          {detecting ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Detecting…
                            </>
                          ) : (
                            <>
                              <Scan className="h-4 w-4" />
                              Detect Objects
                            </>
                          )}
                        </Button>
                        <Button
                          onClick={handleReset}
                          variant="outline"
                          size="lg"
                          disabled={detecting}
                        >
                          Clear
                        </Button>
                      </div>
                    </>
                  )}
                </>
              )}

              {/* Results */}
              {processedImageUrl && (
                <>
                  <DetectionResults
                    processedImageUrl={processedImageUrl}
                    detections={detections}
                  />
                  <Button
                    onClick={handleReset}
                    variant="outline"
                    className="w-full"
                    size="lg"
                  >
                    Detect Another Image
                  </Button>
                </>
              )}

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Powered by TensorFlow.js · COCO-SSD model · Runs entirely in your browser
        </p>
      </div>
    </div>
  );
};

export default Index;
