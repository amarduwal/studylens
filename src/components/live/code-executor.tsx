'use client';

import { useState, useEffect, useRef } from 'react';
import { Play, Copy, Check, Terminal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CodeExecutorProps {
  code: string;
  language: 'javascript' | 'python';
  explanation?: string;
  className?: string;
}

export function CodeExecutor({
  code,
  language,
  explanation,
  className = '',
}: CodeExecutorProps) {
  const [output, setOutput] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const executeCode = async () => {
    setIsRunning(true);
    setOutput('');
    setError(null);

    try {
      if (language === 'javascript') {
        // Execute JavaScript in a sandboxed iframe
        const result = await executeJavaScript(code);
        setOutput(result);
      } else if (language === 'python') {
        // For Python, we'd need a backend or Pyodide
        setOutput(
          'Python execution requires server-side setup. Code displayed for reference.',
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Execution error');
    } finally {
      setIsRunning(false);
    }
  };

  const executeJavaScript = (code: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);

      const logs: string[] = [];

      try {
        const iframeWindow = iframe.contentWindow as any;

        // Override console.log
        iframeWindow.console = {
          log: (...args: any[]) => {
            logs.push(
              args
                .map((arg) =>
                  typeof arg === 'object'
                    ? JSON.stringify(arg, null, 2)
                    : String(arg),
                )
                .join(' '),
            );
          },
          error: (...args: any[]) => {
            logs.push(`Error: ${args.join(' ')}`);
          },
          warn: (...args: any[]) => {
            logs.push(`Warning: ${args.join(' ')}`);
          },
        };

        // Execute code
        const result = iframeWindow.eval(code);

        // Add return value if present
        if (result !== undefined) {
          logs.push(
            `→ ${typeof result === 'object' ? JSON.stringify(result, null, 2) : result}`,
          );
        }

        document.body.removeChild(iframe);
        resolve(logs.join('\n'));
      } catch (err) {
        document.body.removeChild(iframe);
        reject(err);
      }
    });
  };

  const copyCode = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn('bg-gray-900 rounded-xl overflow-hidden', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-300">
            {language === 'javascript' ? 'JavaScript' : 'Python'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={copyCode}>
            {copied ? (
              <Check className="w-4 h-4 text-green-400" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={executeCode}
            disabled={isRunning}
          >
            <Play className="w-4 h-4 mr-1" />
            Run
          </Button>
        </div>
      </div>

      {/* Explanation */}
      {explanation && (
        <div className="px-4 py-2 bg-blue-500/10 border-b border-blue-500/20">
          <p className="text-sm text-blue-300">{explanation}</p>
        </div>
      )}

      {/* Code */}
      <div className="p-4">
        <pre className="text-sm text-gray-300 font-mono overflow-x-auto">
          <code>{code}</code>
        </pre>
      </div>

      {/* Output */}
      {(output || error) && (
        <div className="border-t border-gray-700">
          <div className="px-4 py-2 bg-gray-800/50">
            <span className="text-xs font-medium text-gray-500">Output</span>
          </div>
          <div className="p-4">
            {error ? (
              <pre className="text-sm text-red-400 font-mono">{error}</pre>
            ) : (
              <pre className="text-sm text-green-400 font-mono whitespace-pre-wrap">
                {output}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
