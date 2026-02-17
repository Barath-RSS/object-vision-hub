import { useState, useRef, useCallback, useEffect } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

export interface Detection {
  class: string;
  score: number;
  bbox: [number, number, number, number]; // [x, y, width, height]
}

export function useObjectDetection() {
  const [model, setModel] = useState<cocoSsd.ObjectDetection | null>(null);
  const [loading, setLoading] = useState(true);
  const [detecting, setDetecting] = useState(false);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [processedImageUrl, setProcessedImageUrl] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadModel() {
      try {
        await tf.ready();
        const loaded = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
        if (!cancelled) {
          setModel(loaded);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError('Failed to load AI model. Please refresh the page.');
          setLoading(false);
        }
      }
    }
    loadModel();
    return () => { cancelled = true; };
  }, []);

  const detect = useCallback(async (imageElement: HTMLImageElement) => {
    if (!model) return;
    setDetecting(true);
    setError(null);
    setDetections([]);
    setProcessedImageUrl(null);

    try {
      const predictions = await model.detect(imageElement);
      const results: Detection[] = predictions.map(p => ({
        class: p.class,
        score: p.score,
        bbox: p.bbox as [number, number, number, number],
      }));
      setDetections(results);

      // Draw bounding boxes on canvas
      const canvas = canvasRef.current;
      if (!canvas) {
        canvas === null;
        const c = document.createElement('canvas');
        canvasRef.current = c;
      }
      const c = canvasRef.current!;
      c.width = imageElement.naturalWidth;
      c.height = imageElement.naturalHeight;
      const ctx = c.getContext('2d')!;
      ctx.drawImage(imageElement, 0, 0);

      const colors = [
        '#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
        '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#6366f1',
      ];

      results.forEach((det, i) => {
        const [x, y, w, h] = det.bbox;
        const color = colors[i % colors.length];
        const lineWidth = Math.max(2, Math.min(4, c.width / 300));
        const fontSize = Math.max(14, Math.min(22, c.width / 40));

        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.strokeRect(x, y, w, h);

        const label = `${det.class} ${Math.round(det.score * 100)}%`;
        ctx.font = `bold ${fontSize}px Inter, system-ui, sans-serif`;
        const textMetrics = ctx.measureText(label);
        const textHeight = fontSize + 8;
        const textWidth = textMetrics.width + 12;

        const labelY = y > textHeight ? y - textHeight : y;
        ctx.fillStyle = color;
        ctx.fillRect(x, labelY, textWidth, textHeight);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(label, x + 6, labelY + fontSize + 2);
      });

      const url = c.toDataURL('image/png');
      setProcessedImageUrl(url);
    } catch (err) {
      setError('Detection failed. Please try a different image.');
    } finally {
      setDetecting(false);
    }
  }, [model]);

  return { loading, detecting, detections, error, processedImageUrl, detect };
}
