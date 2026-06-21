import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

// shadcn-style Badge for statuses, kinds and counts. Replaces the many bespoke
// inline pill styles with named variants.
const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full font-semibold whitespace-nowrap',
  {
    variants: {
      variant: {
        neutral: 'bg-slate-100 text-slate-600',
        brand: 'bg-[rgba(0,157,255,.12)] text-[var(--brand-700)]',
        success: 'bg-green-100 text-green-700',
        info: 'bg-sky-100 text-sky-700',
        warning: 'bg-amber-100 text-amber-700',
        danger: 'bg-red-100 text-red-700',
        violet: 'bg-violet-100 text-violet-700',
      },
      size: {
        sm: 'text-[11px] px-1.5 py-0.5',
        default: 'text-xs px-2 py-0.5',
      },
    },
    defaultVariants: { variant: 'neutral', size: 'default' },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, size, className }))} {...props} />
}

export { badgeVariants }
