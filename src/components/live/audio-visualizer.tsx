'use client';

import { useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface AudioVisualizerProps {
  audioLevel: number;
  isActive: boolean;
  isSpeaking?: boolean;
  className?: string;
}

export function AudioVisualizer({
  audioLevel,
  isActive,
  isSpeaking = false,
  className = '',
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const barsRef = useRef<number[]>([0, 0, 0, 0, 0]);
  const targetBarsRef = useRef<number[]>([0, 0, 0, 0, 0]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    const dpr = window.devicePixelRatio || 1;

    // Set canvas size for high DPI
    if (canvas.width !== width * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    }

    ctx.clearRect(0, 0, width, height);

    // Get theme colors
    const computedStyle = getComputedStyle(document.documentElement);
    const primaryColor = `hsl(${computedStyle.getPropertyValue('--primary').trim()})`;
    const successColor = `hsl(${computedStyle.getPropertyValue('--success').trim()})`;
    const mutedColor = `hsl(${computedStyle.getPropertyValue('--muted-foreground').trim()})`;

    const barCount = 5;
    const barWidth = width / (barCount * 2.5);
    const gap = barWidth * 0.5;
    const totalWidth = barCount * barWidth + (barCount - 1) * gap;
    const startX = (width - totalWidth) / 2;

    if (!isActive) {
      // Inactive state - flat bars
      ctx.fillStyle = mutedColor;
      for (let i = 0; i < barCount; i++) {
        const x = startX + i * (barWidth + gap);
        const barHeight = 4;
        const y = (height - barHeight) / 2;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 2);
        ctx.fill();
      }
      return;
    }

    // Calculate target bar heights based on audio level
    const baseHeight = height * 0.15;
    const maxAddHeight = height * 0.7;

    for (let i = 0; i < barCount; i++) {
      // Create wave pattern
      const waveOffset = Math.sin(Date.now() / 150 + i * 0.8) * 0.3;
      const variation = 0.5 + waveOffset + Math.random() * 0.2;
      targetBarsRef.current[i] =
        baseHeight + audioLevel * maxAddHeight * variation;
    }

    // Smooth interpolation
    for (let i = 0; i < barCount; i++) {
      const diff = targetBarsRef.current[i] - barsRef.current[i];
      barsRef.current[i] += diff * 0.3; // Smoothing factor
    }

    // Choose color based on state
    ctx.fillStyle = isSpeaking ? successColor : primaryColor;

    // Draw bars
    for (let i = 0; i < barCount; i++) {
      const x = startX + i * (barWidth + gap);
      const barHeight = Math.max(4, barsRef.current[i]);
      const y = (height - barHeight) / 2;

      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, barWidth / 2);
      ctx.fill();
    }

    animationRef.current = requestAnimationFrame(draw);
  }, [audioLevel, isActive, isSpeaking]);

  useEffect(() => {
    draw();
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      className={cn('w-full h-full', className)}
      style={{ width: '100%', height: '100%' }}
    />
  );
}
