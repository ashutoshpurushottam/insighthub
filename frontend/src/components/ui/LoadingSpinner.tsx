import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({
  size = 'md',
  className,
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  const borderClasses = {
    sm: 'border-2',
    md: 'border-[2.5px]',
    lg: 'border-3',
  };

  return (
    <div className={cn('flex items-center justify-center', className)}>
      <div
        className={cn(
          'animate-spin rounded-full border-gray-200',
          'border-t-transparent',
          '[background:conic-gradient(from_0deg,transparent_0%,transparent_30%,theme(colors.primary.500)_100%)]',
          'mask-border',
          sizeClasses[size],
          borderClasses[size],
        )}
        style={{
          borderTopColor: 'transparent',
          borderRightColor: 'rgb(59 130 246 / 0.3)',
          borderBottomColor: 'rgb(59 130 246 / 0.6)',
          borderLeftColor: 'rgb(59 130 246)',
        }}
      />
    </div>
  );
}
