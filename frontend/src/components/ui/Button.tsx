import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'accent' | 'danger'
type Size = 'block' | 'pill'

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'bg-navy text-white active:bg-navy-light disabled:bg-slate-300',
  secondary: 'bg-slate-100 text-navy active:bg-slate-200 disabled:text-slate-400',
  accent: 'bg-gold text-navy active:bg-gold-light disabled:bg-slate-300',
  danger: 'bg-red-600 text-white active:bg-red-700 disabled:bg-slate-300',
}

const SIZE_CLASSES: Record<Size, string> = {
  block: 'w-full min-h-11 rounded-full px-4 py-3 text-base',
  pill: 'inline-flex w-auto min-h-11 items-center gap-2 rounded-full px-4 py-2 text-sm',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

export function Button({ variant = 'primary', size = 'block', className = '', ...props }: ButtonProps) {
  return (
    <button
      type="button"
      className={`font-medium transition-colors disabled:cursor-not-allowed ${SIZE_CLASSES[size]} ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    />
  )
}
