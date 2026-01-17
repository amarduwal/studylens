import { cn } from '@/lib/utils';

// ✅ StatItem Component (React.FC)
interface StatItemProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color?: string;
  className?: string;
}

export function StatItem({
  icon,
  label,
  value,
  color = 'text-foreground',
  className = '',
}: StatItemProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-xl bg-[hsl(var(--muted))]/50 hover:bg-[hsl(var(--muted))]/75 transition-colors',
        className
      )}
    >
      <span className="text-xl flex-shrink-0">{icon}</span>
      <div className="min-w-0">
        <div className={cn('font-bold text-lg truncate', color)}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        <p className="text-xs text-[hsl(var(--muted-foreground))] leading-tight">
          {label}
        </p>
      </div>
    </div>
  );
}

// ✅ Format Hour Helper
export function formatHour(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour === 12) return '12 PM';
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

// ✅ Format Date Helper
export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// ✅ Format Percentage Helper
export function formatPercentage(num: number): string {
  return `${num.toFixed(1)}%`;
}

// ✅ Difficulty Badge Helper
export function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const colors = {
    easy: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
    medium:
      'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300',
    hard: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
  };

  return (
    <span
      className={cn(
        'px-2.5 py-0.5 rounded-full text-xs font-medium',
        colors[difficulty as keyof typeof colors] ||
          'bg-gray-100 text-gray-700 dark:bg-gray-900/50'
      )}
    >
      {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
    </span>
  );
}

export function UpgradeBenefit({
  emoji,
  text,
  color,
}: {
  emoji: string;
  text: string;
  color: 'emerald' | 'blue' | 'purple' | 'amber';
}) {
  const colorClasses = {
    emerald:
      'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400',
    blue: 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400',
    purple:
      'bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400',
    amber:
      'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400',
  };

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-xl border transition-all hover:scale-[1.02]',
        colorClasses[color]
      )}
    >
      <span className="text-lg">{emoji}</span>
      <span className="font-medium text-sm">{text}</span>
    </div>
  );
}

export function getTimeUntilReset(resetTime?: string): string {
  if (!resetTime) return 'midnight';

  const reset = new Date(resetTime);
  const now = new Date();
  const diffMs = reset.getTime() - now.getTime();

  if (diffMs <= 0) return 'soon';

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes} minutes`;
}
