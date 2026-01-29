'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Eraser, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DrawingElement {
  type: 'circle' | 'rectangle' | 'line' | 'arrow' | 'text' | 'curve';
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
  endX?: number;
  endY?: number;
  text?: string;
  color?: string;
  fontSize?: number;
}

interface WhiteboardCanvasProps {
  elements: DrawingElement[];
  title?: string;
  onClear?: () => void;
  className?: string;
}

export function WhiteboardCanvas({
  elements,
  title,
  onClear,
  className = '',
}: WhiteboardCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      const container = canvasRef.current?.parentElement;
      if (container) {
        setDimensions({
          width: container.clientWidth,
          height: container.clientHeight,
        });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Draw elements
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#1F2937';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw title
    if (title) {
      ctx.fillStyle = '#F3F4F6';
      ctx.font = 'bold 20px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(title, canvas.width / 2, 40);
    }

    // Draw elements
    elements.forEach((element) => {
      const x = (element.x / 100) * canvas.width;
      const y = (element.y / 100) * canvas.height;

      ctx.fillStyle = element.color || '#3B82F6';
      ctx.strokeStyle = element.color || '#3B82F6';
      ctx.lineWidth = 2;

      switch (element.type) {
        case 'circle':
          const radius =
            ((element.radius || 10) / 100) *
            Math.min(canvas.width, canvas.height);
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.stroke();
          break;

        case 'rectangle':
          const width = ((element.width || 20) / 100) * canvas.width;
          const height = ((element.height || 15) / 100) * canvas.height;
          ctx.strokeRect(x, y, width, height);
          break;

        case 'line':
        case 'arrow':
          const endX = ((element.endX || element.x + 20) / 100) * canvas.width;
          const endY = ((element.endY || element.y) / 100) * canvas.height;

          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(endX, endY);
          ctx.stroke();

          if (element.type === 'arrow') {
            // Draw arrowhead
            const angle = Math.atan2(endY - y, endX - x);
            const headLength = 15;

            ctx.beginPath();
            ctx.moveTo(endX, endY);
            ctx.lineTo(
              endX - headLength * Math.cos(angle - Math.PI / 6),
              endY - headLength * Math.sin(angle - Math.PI / 6),
            );
            ctx.moveTo(endX, endY);
            ctx.lineTo(
              endX - headLength * Math.cos(angle + Math.PI / 6),
              endY - headLength * Math.sin(angle + Math.PI / 6),
            );
            ctx.stroke();
          }
          break;

        case 'text':
          ctx.fillStyle = element.color || '#F3F4F6';
          ctx.font = `${element.fontSize || 16}px Inter, sans-serif`;
          ctx.textAlign = 'left';
          ctx.fillText(element.text || '', x, y);
          break;
      }
    });
  }, [elements, title, dimensions]);

  return (
    <div
      className={`relative bg-gray-800 rounded-xl overflow-hidden ${className}`}
    >
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        className="w-full h-full"
      />

      {onClear && (
        <div className="absolute top-2 right-2">
          <Button variant="secondary" size="sm" onClick={onClear}>
            <Trash2 className="w-4 h-4 mr-1" />
            Clear
          </Button>
        </div>
      )}

      {elements.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-500">
          <p>AI will draw diagrams here</p>
        </div>
      )}
    </div>
  );
}
