import type { HTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'destructive';
}

export function Badge({ className, variant = 'default', children, ...props }: BadgeProps) {
  const variants = {
    default: 'border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90',
    secondary: 'border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90',
    outline: 'text-foreground bg-transparent border-border [a&]:hover:bg-accent [a&]:hover:text-accent-foreground',
    destructive: 'border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90',
  };

  return (
    <span
      data-slot="badge"
      className={cn(
        'inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none transition-[color,box-shadow] overflow-hidden',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
