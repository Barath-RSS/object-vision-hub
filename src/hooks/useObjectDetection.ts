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
        const loaded = await cocoSsd.load({ base: 'mobilenet_v2' });
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
        ctx.drawImage(video, 0, 0);

        try {
          const predictions = await model.detect(video);
          const results: Detection[] = predictions.map(p => ({
            class: p.class,
            score: p.score,
            bbox: p.bbox as [number, number, number, number],
          }));
          setDetections(results);

          // Draw boxes
          const scale = canvas.width / 500;
          results.forEach((det, i) => {
            const [x, y, w, h] = det.bbox;
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
            const r = 4;
            ctx.roundRect(x, ly, tw, th, [r, r, r, r]);
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
