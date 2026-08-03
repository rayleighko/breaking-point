import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

import type { ButtonHTMLAttributes } from 'react';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md border font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
  {
    variants: {
      variant: {
        default: 'border-[var(--accent)] bg-[var(--accent)] px-3 py-2 text-[#07111f]',
        outline: 'border-[var(--line)] bg-[var(--bg-soft)] px-3 py-2 text-[var(--fg)]',
        ghost: 'border-transparent bg-transparent px-3 py-2 text-[var(--fg-muted)]',
      },
      size: {
        default: 'h-9 text-sm',
        sm: 'h-8 text-xs',
        lg: 'h-10 text-base',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, type = 'button', ...props }: ButtonProps) {
  return (
    <button className={cn(buttonVariants({ variant, size }), className)} type={type} {...props} />
  );
}
