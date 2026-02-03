import React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'primary' | 'accent' | 'success' | 'warning' | 'danger';
  className?: string;
  isLoading?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  trend,
  variant = 'primary',
  className,
  isLoading = false,
}) => {
  const variantClasses = {
    primary: 'stat-primary',
    accent: 'stat-accent',
    success: 'stat-primary', // Use primary color for consistency
    warning: 'stat-warning',
    danger: 'stat-danger',
  };

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl p-6 text-primary-foreground card-hover',
        variantClasses[variant],
        className
      )}
    >
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
        <Icon className="w-full h-full" />
      </div>

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="p-2 rounded-lg bg-primary-foreground/20">
            <Icon className="w-5 h-5" />
          </div>
          {trend && (
            <span
              className={cn(
                'text-sm font-medium px-2 py-1 rounded-full',
                trend.isPositive
                  ? 'bg-success/20 text-success-foreground'
                  : 'bg-destructive/20 text-destructive-foreground'
              )}
            >
              {trend.isPositive ? '+' : '-'}{trend.value}%
            </span>
          )}
        </div>

        {isLoading ? (
          <Skeleton className="h-9 w-16 mb-1 bg-primary-foreground/20" />
        ) : (
          <h3 className="text-3xl font-bold mb-1">{value}</h3>
        )}
        <p className="text-sm opacity-90">{title}</p>
      </div>
    </div>
  );
};

export default StatCard;
