import { useRef, useState, useCallback, useEffect } from 'react';
import {
  Video, VideoOff, Loader2, AlertCircle, Sparkles, Zap, Camera, MonitorSpeaker,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useObjectDetection, type Detection } from '@/hooks/useObjectDetection';

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

  return (
    <div className="flex min-h-screen flex-col items-center bg-background px-4 py-6">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="mb-5 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            AI Object Detection
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Real-time object detection &amp; tracking using your camera
          </p>
        </div>

        {/* Main Card */}
        <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden max-w-lg mx-auto">
          {/* Video / Canvas area */}
          <div className="relative aspect-[4/3] w-full bg-secondary">
            <video
              ref={videoRef}
              className="absolute inset-0 h-full w-full object-cover"
              style={{ display: cameraOn ? 'none' : 'none' }}
              playsInline
              muted
            />
            <canvas
              ref={canvasRef}
              className="absolute inset-0 h-full w-full object-cover"
              style={{ display: cameraOn ? 'block' : 'none' }}
            />

            {!cameraOn && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                {modelLoading ? (
                  <>
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Loading AI model…</p>
                  </>
                ) : (
                  <>
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent">
                      <Camera className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Click below to start your camera
                    </p>
                  </>
                )}
              </div>
            )}

            {/* Live badge + FPS */}
            {cameraOn && (
              <div className="absolute left-3 top-3 flex items-center gap-2">
                <span className="flex items-center gap-1.5 rounded-full bg-destructive/90 px-2.5 py-1 text-xs font-semibold text-destructive-foreground backdrop-blur-sm">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-destructive-foreground" />
                  LIVE
                </span>
                <span className="flex items-center gap-1 rounded-full bg-foreground/70 px-2.5 py-1 text-xs font-medium text-background backdrop-blur-sm">
                  <Zap className="h-3 w-3" />
                  {fps} FPS
                </span>
              </div>
            )}

            {/* Object count */}
            {cameraOn && detections.length > 0 && (
              <div className="absolute right-3 top-3 rounded-full bg-primary/90 px-2.5 py-1 text-xs font-semibold text-primary-foreground backdrop-blur-sm">
                {detections.length} object{detections.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="p-4">
            {!cameraOn ? (
              <Button
                onClick={startCamera}
                disabled={modelLoading}
                className="w-full gap-2"
                size="lg"
              >
                <Video className="h-4 w-4" />
                Start Camera
              </Button>
            ) : (
              <Button
                onClick={stopCamera}
                variant="destructive"
                className="w-full gap-2"
                size="lg"
              >
                <VideoOff className="h-4 w-4" />
                Stop Camera
              </Button>
            )}

            {/* Errors */}
            {(error || cameraError) && (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error || cameraError}
              </div>
            )}

            {/* Detection list */}
            {cameraOn && Object.keys(grouped).length > 0 && (
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {Object.entries(grouped).map(([cls, { count, maxScore }]) => (
                  <div
                    key={cls}
                    className="flex items-center justify-between rounded-lg bg-accent px-3 py-2"
                  >
                    <span className="text-xs font-medium capitalize text-accent-foreground">
                      {cls}{count > 1 ? ` ×${count}` : ''}
                    </span>
                    <span className="text-xs font-semibold text-primary">
                      {Math.round(maxScore * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Powered by TensorFlow.js · COCO-SSD model · Runs entirely in your browser
        </p>
      </div>
    </div>
  );
};

export default Index;
