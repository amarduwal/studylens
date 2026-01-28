'use client';

import { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  audioLevel: number;
  isActive: boolean;
  type?: 'bars' | 'circle' | 'wave';
  color?: string;
  className?: string;
}

export function AudioVisualizer({
  audioLevel,
  isActive,
  type = 'bars',
  color = '#3B82F6',
  className = '',
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      if (!isActive) {
        // Draw inactive state
        ctx.fillStyle = '#4B5563';
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

      ctx.fillStyle = color;

      if (type === 'bars') {
        const barCount = 5;
        const barWidth = width / (barCount * 2);

        for (let i = 0; i < barCount; i++) {
          const barHeight = Math.max(
            4,
            audioLevel * height * (0.5 + Math.random() * 0.5),
          );
          const x = i * barWidth * 2 + barWidth / 2;
          const y = (height - barHeight) / 2;

          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, 2);
          ctx.fill();
        }
      } else if (type === 'circle') {
        const radius = Math.max(10, audioLevel * Math.min(width, height) * 0.4);
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, radius, 0, Math.PI * 2);
        ctx.fill();

        // Add pulse ring
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.arc(
          width / 2,
          height / 2,
          radius + 5 + audioLevel * 10,
          0,
          Math.PI * 2,
        );
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [audioLevel, isActive, type, color]);

  return (
    <canvas ref={canvasRef} width={80} height={40} className={className} />
  );
}
