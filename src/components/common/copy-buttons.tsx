'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CopyButtonProps {
  text: string;
  className?: string;
  size?: 'sm' | 'md';
}

export function CopyButton({ text, className, size = 'md' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleCopy}
      className={cn(
        'h-6 w-6 rounded opacity-0 group-hover:opacity-100 transition-opacity',
        className
      )}
    >
      {copied ? (
        <Check className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
      ) : (
        <Copy className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
      )}
    </Button>
  );
}
