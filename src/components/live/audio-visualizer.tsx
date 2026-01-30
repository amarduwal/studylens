'use client';

import { useEffect, useRef, useCallback, memo } from 'react';
import { cn } from '@/lib/utils';

interface AudioVisualizerProps {
  audioLevel: number;
  isActive: boolean;
  isSpeaking?: boolean;
  className?: string;
}

export const AudioVisualizer = memo(function AudioVisualizer({
  audioLevel,
  isActive,
  isSpeaking = false,
  className = '',
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>(0);
  const barsRef = useRef<number[]>([0, 0, 0, 0, 0]);
  const lastFrameTime = useRef<number>(0);
  const colorsRef = useRef<{ primary: string; success: string; muted: string }>(
    {
      primary: '#D94A8C',
      success: '#22C55E',
      muted: '#6B7280',
    },
  );

  // Target ~30fps for mobile performance
  const FRAME_INTERVAL = 33;
  const BAR_COUNT = 5;

  // Get theme colors once on mount
  useEffect(() => {
    try {
      const style = getComputedStyle(document.documentElement);
      const primary = style.getPropertyValue('--primary').trim();
      const success = style.getPropertyValue('--success').trim();
      const muted = style.getPropertyValue('--muted-foreground').trim();

      if (primary) colorsRef.current.primary = `hsl(${primary})`;
      if (success) colorsRef.current.success = `hsl(${success})`;
      if (muted) colorsRef.current.muted = `hsl(${muted})`;
    } catch {
      // Use default colors
    }
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) {
      animationRef.current = requestAnimationFrame(draw);
      return;
    }

    // Throttle frame rate
    const now = performance.now();
    if (now - lastFrameTime.current < FRAME_INTERVAL) {
      animationRef.current = requestAnimationFrame(draw);
      return;
    }
    lastFrameTime.current = now;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      animationRef.current = requestAnimationFrame(draw);
      return;
    }

    // Get container size
    const rect = container.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    if (width === 0 || height === 0) {
      animationRef.current = requestAnimationFrame(draw);
      return;
    }

    // Set canvas size with limited DPR for performance
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (
      canvas.width !== Math.floor(width * dpr) ||
      canvas.height !== Math.floor(height * dpr)
    ) {
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);
    }

    ctx.clearRect(0, 0, width, height);

    // Calculate bar dimensions
    const barWidth = Math.max(3, Math.min(8, width / (BAR_COUNT * 2.2)));
    const gap = barWidth * 0.6;
    const totalWidth = BAR_COUNT * barWidth + (BAR_COUNT - 1) * gap;
    const startX = (width - totalWidth) / 2;

    const colors = colorsRef.current;

    // Inactive state
    if (!isActive) {
      ctx.fillStyle = colors.muted;
      const inactiveHeight = 4;
      const y = (height - inactiveHeight) / 2;

      for (let i = 0; i < BAR_COUNT; i++) {
        const x = startX + i * (barWidth + gap);
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, inactiveHeight, barWidth / 2);
        ctx.fill();
      }

      animationRef.current = requestAnimationFrame(draw);
      return;
    }

    // Active state
    ctx.fillStyle = isSpeaking ? colors.success : colors.primary;

    const minHeight = 6;
    const maxHeight = height * 0.85;
    const baseHeight = height * 0.2;

    for (let i = 0; i < BAR_COUNT; i++) {
      // Create smooth wave pattern
      const phase = now / 180 + i * 1.2;
      const wave = (Math.sin(phase) + 1) / 2; // 0 to 1
      const randomness = Math.sin(now / 100 + i * 2.5) * 0.15;

      // Calculate target height
      const levelContribution = audioLevel * (maxHeight - baseHeight);
      const waveContribution = wave * 0.3 + randomness;
      const targetHeight =
        baseHeight + levelContribution * (0.6 + waveContribution * 0.4);

      // Smooth interpolation (ease towards target)
      const smoothFactor = 0.2;
      barsRef.current[i] += (targetHeight - barsRef.current[i]) * smoothFactor;

      const barHeight = Math.max(
        minHeight,
        Math.min(maxHeight, barsRef.current[i]),
      );
      const x = startX + i * (barWidth + gap);
      const y = (height - barHeight) / 2;

      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, barWidth / 2);
      ctx.fill();
    }

    animationRef.current = requestAnimationFrame(draw);
  }, [audioLevel, isActive, isSpeaking]);

  useEffect(() => {
    animationRef.current = requestAnimationFrame(draw);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [draw]);

  return (
    <div ref={containerRef} className={cn('w-full h-full', className)}>
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: 'block' }}
      />
    </div>
  );
});
