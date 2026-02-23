import { useRef, useState, useCallback, useEffect } from 'react';
import {
  Video, VideoOff, Loader2, AlertCircle, Sparkles, Zap, Camera, Eye, Box, Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useObjectDetection } from '@/hooks/useObjectDetection';

const Index = () => {
  const {
    modelLoading, detecting, detections, fps, error,
    startDetection, stopDetection, model,
  } = useObjectDetection();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraOn(true);
        if (canvasRef.current) {
          startDetection(videoRef.current, canvasRef.current);
        }
      }
    } catch {
      setCameraError('Camera access denied. Please allow camera permissions.');
    }
  }, [startDetection]);

  const stopCamera = useCallback(() => {
    stopDetection();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraOn(false);
  }, [stopDetection]);

  useEffect(() => () => {
    stopDetection();
    streamRef.current?.getTracks().forEach(t => t.stop());
  }, [stopDetection]);

  // Group detections by class
  const grouped = detections.reduce<Record<string, { count: number; maxScore: number }>>((acc, d) => {
    if (!acc[d.class]) acc[d.class] = { count: 0, maxScore: 0 };
    acc[d.class].count++;
    acc[d.class].maxScore = Math.max(acc[d.class].maxScore, d.score);
    return acc;
  }, {});

  const uniqueClasses = Object.keys(grouped).length;

  return (
    <div className="flex min-h-screen flex-col items-center bg-background px-4 py-8">
      <div className="w-full max-w-3xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/25">
            <Sparkles className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            AI Object Detection
          </h1>
          <p className="mt-2 text-base text-muted-foreground">
            Real-time object detection &amp; tracking powered by TensorFlow.js
          </p>
        </div>

        {/* Stats Bar */}
        {cameraOn && (
          <div className="mb-4 grid grid-cols-3 gap-3">
            <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Eye className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Objects</p>
                <p className="text-lg font-bold text-foreground">{detections.length}</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/10">
                <Box className="h-4 w-4 text-success" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Types</p>
                <p className="text-lg font-bold text-foreground">{uniqueClasses}</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
                <Zap className="h-4 w-4 text-accent-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Speed</p>
                <p className="text-lg font-bold text-foreground">{fps} <span className="text-xs font-normal text-muted-foreground">FPS</span></p>
              </div>
            </div>
          </div>
        )}

        {/* Main Card */}
        <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
          {/* Video / Canvas area */}
          <div className="relative aspect-[4/3] w-full bg-secondary">
            <video
              ref={videoRef}
              className="absolute inset-0 h-full w-full object-cover"
              style={{ display: 'none' }}
              playsInline
              muted
            />
            <canvas
              ref={canvasRef}
              className="absolute inset-0 h-full w-full object-cover"
              style={{ display: cameraOn ? 'block' : 'none' }}
            />

            {!cameraOn && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                {modelLoading ? (
                  <>
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                      <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-foreground">Loading AI Model…</p>
                      <p className="mt-1 text-xs text-muted-foreground">Preparing COCO-SSD for detection</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent">
                      <Camera className="h-10 w-10 text-accent-foreground" />
                    </div>
                    <div className="text-center">
                      <p className="font-medium text-foreground">Camera Ready</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Click the button below to start detecting objects
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Live badge */}
            {cameraOn && (
              <div className="absolute left-3 top-3 flex items-center gap-2">
                <span className="flex items-center gap-1.5 rounded-full bg-destructive px-3 py-1.5 text-xs font-bold text-destructive-foreground shadow-lg">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-destructive-foreground" />
                  LIVE
                </span>
              </div>
            )}

            {/* Object count badge */}
            {cameraOn && detections.length > 0 && (
              <div className="absolute right-3 top-3 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-lg">
                {detections.length} detected
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="border-t border-border p-5">
            {!cameraOn ? (
              <Button
                onClick={startCamera}
                disabled={modelLoading}
                className="w-full gap-2 text-base font-semibold"
                size="lg"
              >
                {modelLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Video className="h-5 w-5" />
                )}
                {modelLoading ? 'Loading Model…' : 'Start Detection'}
              </Button>
            ) : (
              <Button
                onClick={stopCamera}
                variant="destructive"
                className="w-full gap-2 text-base font-semibold"
                size="lg"
              >
                <VideoOff className="h-5 w-5" />
                Stop Detection
              </Button>
            )}

            {/* Errors */}
            {(error || cameraError) && (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error || cameraError}
              </div>
            )}
          </div>
        </div>

        {/* Detection Results Panel */}
        {cameraOn && Object.keys(grouped).length > 0 && (
          <div className="mt-4 rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-bold text-foreground">Detected Objects</h2>
              </div>
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                {detections.length} total
              </span>
            </div>
            <div className="space-y-2">
              {Object.entries(grouped)
                .sort(([, a], [, b]) => b.maxScore - a.maxScore)
                .map(([cls, { count, maxScore }]) => (
                  <div
                    key={cls}
                    className="flex items-center justify-between rounded-xl bg-secondary px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                        <Box className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold capitalize text-foreground">{cls}</p>
                        <p className="text-xs text-muted-foreground">
                          {count} instance{count > 1 ? 's' : ''} detected
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-primary">{Math.round(maxScore * 100)}%</p>
                      <p className="text-xs text-muted-foreground">confidence</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Shield className="h-3.5 w-3.5" />
          <span>Powered by TensorFlow.js · COCO-SSD · Runs entirely in your browser</span>
        </div>
      </div>
    </div>
  );
};

export default Index;
