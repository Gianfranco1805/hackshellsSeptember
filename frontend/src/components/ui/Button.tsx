import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'danger'

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'bg-violet-600 text-white active:bg-violet-700 disabled:bg-slate-300',
  secondary: 'bg-slate-100 text-slate-800 active:bg-slate-200 disabled:text-slate-400',
  danger: 'bg-red-600 text-white active:bg-red-700 disabled:bg-slate-300',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
}

export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  return (
    <button
      type="button"
      className={`w-full min-h-11 rounded-xl px-4 py-3 text-base font-medium transition-colors disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    />
  )
}
