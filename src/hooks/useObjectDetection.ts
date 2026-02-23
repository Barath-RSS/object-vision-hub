import { useState, useRef, useCallback, useEffect } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

export interface Detection {
  class: string;
  score: number;
  bbox: [number, number, number, number];
}

const COLORS = [
  '#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#6366f1',
];

const MIN_SCORE = 0.45;
const MAX_DETECTIONS = 20;
const NMS_IOU_THRESHOLD = 0.5;

/** Intersection-over-Union for two boxes [x,y,w,h] */
function iou(a: number[], b: number[]): number {
  const x1 = Math.max(a[0], b[0]);
  const y1 = Math.max(a[1], b[1]);
  const x2 = Math.min(a[0] + a[2], b[0] + b[2]);
  const y2 = Math.min(a[1] + a[3], b[1] + b[3]);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const areaA = a[2] * a[3];
  const areaB = b[2] * b[3];
  return inter / (areaA + areaB - inter);
}

/** Per-class Non-Max Suppression */
function nms(dets: Detection[], iouThresh: number): Detection[] {
  // Group by class
  const byClass: Record<string, Detection[]> = {};
  for (const d of dets) {
    (byClass[d.class] ??= []).push(d);
  }

  const kept: Detection[] = [];
  for (const cls of Object.keys(byClass)) {
    const sorted = byClass[cls].sort((a, b) => b.score - a.score);
    const suppress = new Set<number>();
    for (let i = 0; i < sorted.length; i++) {
      if (suppress.has(i)) continue;
      kept.push(sorted[i]);
      for (let j = i + 1; j < sorted.length; j++) {
        if (iou(sorted[i].bbox, sorted[j].bbox) > iouThresh) {
          suppress.add(j);
        }
      }
    }
  }
  return kept;
}

export function useObjectDetection() {
  const [model, setModel] = useState<cocoSsd.ObjectDetection | null>(null);
  const [modelLoading, setModelLoading] = useState(true);
  const [detecting, setDetecting] = useState(false);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [fps, setFps] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef(performance.now());
  const fpsFrames = useRef(0);
  const fpsInterval = useRef<number>(0);

  useEffect(() => {
    let cancelled = false;
    async function loadModel() {
      try {
        await tf.ready();
        // Use mobilenet_v2 for best accuracy in COCO-SSD
        const loaded = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
        if (!cancelled) {
          setModel(loaded);
          setModelLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError('Failed to load AI model. Please refresh.');
          setModelLoading(false);
        }
      }
    }
    loadModel();
    return () => { cancelled = true; };
  }, []);

  const startDetection = useCallback((
    video: HTMLVideoElement,
    canvas: HTMLCanvasElement,
  ) => {
    if (!model) return;
    setDetecting(true);
    setError(null);

    const ctx = canvas.getContext('2d')!;
    fpsFrames.current = 0;
    lastTimeRef.current = performance.now();

    fpsInterval.current = window.setInterval(() => {
      const now = performance.now();
      const elapsed = (now - lastTimeRef.current) / 1000;
      setFps(Math.round(fpsFrames.current / elapsed));
      fpsFrames.current = 0;
      lastTimeRef.current = now;
    }, 1000);

    const loop = async () => {
      if (video.readyState >= 2) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Mirror the canvas so front camera isn't inverted
        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(video, -canvas.width, 0);
        ctx.restore();

        try {
          // Request more boxes from the model, then filter ourselves
          const predictions = await model.detect(video, MAX_DETECTIONS, MIN_SCORE);

          const raw: Detection[] = predictions.map(p => ({
            class: p.class,
            score: p.score,
            bbox: p.bbox as [number, number, number, number],
          }));

          // Apply per-class NMS to remove duplicate / overlapping boxes
          const results = nms(raw, NMS_IOU_THRESHOLD);
          setDetections(results);

          // Draw boxes
          const scale = canvas.width / 500;
          results.forEach((det, i) => {
            const [ox, y, w, h] = det.bbox;
            // Mirror the x coordinate to match flipped canvas
            const x = canvas.width - ox - w;
            const color = COLORS[i % COLORS.length];
            const lw = Math.max(2, 2.5 * scale);
            const fontSize = Math.max(12, 14 * scale);

            // Box
            ctx.strokeStyle = color;
            ctx.lineWidth = lw;
            ctx.strokeRect(x, y, w, h);

            // Label bg
            const label = `${det.class} ${Math.round(det.score * 100)}%`;
            ctx.font = `600 ${fontSize}px Inter, system-ui, sans-serif`;
            const tm = ctx.measureText(label);
            const th = fontSize + 8;
            const tw = tm.width + 12;
            const ly = y > th ? y - th : y;

            ctx.fillStyle = color;
            ctx.globalAlpha = 0.85;
            ctx.beginPath();
            ctx.roundRect(x, ly, tw, th, [4, 4, 4, 4]);
            ctx.fill();
            ctx.globalAlpha = 1;

            ctx.fillStyle = '#ffffff';
            ctx.fillText(label, x + 6, ly + fontSize + 1);
          });
        } catch {
          // skip frame
        }
        fpsFrames.current++;
      }
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
  }, [model]);

  const stopDetection = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    clearInterval(fpsInterval.current);
    setDetecting(false);
    setDetections([]);
    setFps(0);
  }, []);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      clearInterval(fpsInterval.current);
    };
  }, []);

  return { modelLoading, detecting, detections, fps, error, startDetection, stopDetection, model };
}
