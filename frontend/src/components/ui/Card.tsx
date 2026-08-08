import * as React from 'react';
import { cn } from '@/lib/utils';

export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-2xl border border-gray-100 bg-surface shadow-soft p-6', className)}
      {...props}
    >
      {children}
    </div>
  );
}
