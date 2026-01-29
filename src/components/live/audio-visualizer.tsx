'use client';

import { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  audioLevel: number;
  isActive: boolean;
  type?: 'bars' | 'circle' | 'wave';
  colorActive?: string; // Changed from color
  colorInactive?: string;
  className?: string;
}

export function AudioVisualizer({
  audioLevel,
  isActive,
  type = 'bars',
  className = '',
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get computed colors from CSS variables
    const computedStyle = getComputedStyle(document.documentElement);
    const primaryColor = `hsl(${computedStyle.getPropertyValue('--primary').trim()})`;
    const mutedColor = `hsl(${computedStyle.getPropertyValue('--muted-foreground').trim()})`;

    const draw = () => {
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      if (!isActive) {
        ctx.fillStyle = mutedColor;
        if (type === 'bars') {
          const barCount = 5;
          const barWidth = width / (barCount * 2);
          for (let i = 0; i < barCount; i++) {
            const x = i * barWidth * 2 + barWidth / 2;
            ctx.fillRect(x, height / 2 - 2, barWidth, 4);
          }
        }
        return;
      }

      ctx.fillStyle = primaryColor;

      if (type === 'bars') {
        const barCount = 5;
        const barWidth = width / (barCount * 2);

        for (let i = 0; i < barCount; i++) {
          // Smoother random variation
          const variation =
            0.3 + Math.sin(Date.now() / 200 + i) * 0.2 + Math.random() * 0.2;
          const barHeight = Math.max(4, audioLevel * height * variation);
          const x = i * barWidth * 2 + barWidth / 2;
          const y = (height - barHeight) / 2;

          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, 2);
          ctx.fill();
        }
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [audioLevel, isActive, type]);

  return (
    <canvas ref={canvasRef} width={80} height={40} className={className} />
  );
}
