import * as React from 'react'
import { cn } from '@/lib/utils'

// shadcn-style Card wrappers over the existing `glass-card` look, so new surfaces
// get consistent structure (header / title / content) without re-deriving the
// glass treatment each time.
const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn('glass-card', className)} {...props} />,
)
Card.displayName = 'Card'

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn('flex flex-col gap-1 p-5 pb-2', className)} {...props} />,
)
CardHeader.displayName = 'CardHeader'

const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => <h3 ref={ref} className={cn('portal-section-title', className)} style={{ margin: 0 }} {...props} />,
)
CardTitle.displayName = 'CardTitle'

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn('p-5 pt-0', className)} {...props} />,
)
CardContent.displayName = 'CardContent'

// A standard empty-state block: icon + heading + hint + optional action.
function EmptyState({
  icon, title, hint, action, className,
}: { icon?: React.ReactNode; title: string; hint?: string; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center py-10 px-4', className)}>
      {icon && <div className="mb-2.5 text-slate-300">{icon}</div>}
      <p className="font-display font-bold text-dark">{title}</p>
      {hint && <p className="text-sm text-[var(--muted)] mt-1 max-w-sm">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export { Card, CardHeader, CardTitle, CardContent, EmptyState }
