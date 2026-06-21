import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

// shadcn-style Button, themed to the Everest brand. Variants standardise focus
// rings (keyboard a11y), disabled states and hit areas. Sizes default to a 44px
// minimum height so they meet the mobile touch-target guideline out of the box.
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 select-none',
  {
    variants: {
      variant: {
        default: 'text-white shadow-[0_8px_18px_-10px_rgba(0,157,255,.6)] [background:linear-gradient(135deg,#009dff,#007acc)] hover:brightness-105',
        brand: 'text-white shadow-[0_8px_20px_-10px_rgba(124,92,255,.6)] [background:linear-gradient(135deg,#009dff,#7C3AED)] hover:brightness-105',
        success: 'text-white [background:linear-gradient(135deg,#16a34a,#15803d)] hover:brightness-105',
        violet: 'text-white [background:linear-gradient(135deg,#7C5CFF,#6D28D9)] hover:brightness-105',
        amber: 'text-white [background:linear-gradient(135deg,#f59e0b,#d97706)] hover:brightness-105',
        teal: 'text-white [background:linear-gradient(135deg,#14B8A6,#0D9488)] hover:brightness-105',
        secondary: 'text-[var(--ink-600)] bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] hover:bg-white',
        outline: 'text-[var(--ink-600)] border border-[var(--hairline)] bg-transparent hover:bg-[var(--glass-bg)]',
        ghost: 'text-[var(--ink-600)] hover:bg-[var(--glass-bg)]',
        soft: 'text-[var(--brand-700)] bg-[rgba(0,157,255,.1)] hover:bg-[rgba(0,157,255,.16)]',
        destructive: 'text-white bg-[var(--danger-500)] hover:brightness-105',
      },
      size: {
        default: 'min-h-11 px-4 py-2',
        sm: 'min-h-9 px-3 text-[13px] rounded-lg',
        lg: 'min-h-12 px-6 text-base',
        pill: 'min-h-11 px-5 rounded-full',
        icon: 'h-11 w-11 rounded-full',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = 'button', ...props }, ref) => {
    return <button ref={ref} type={type} className={cn(buttonVariants({ variant, size, className }))} {...props} />
  },
)
Button.displayName = 'Button'

export { Button, buttonVariants }
