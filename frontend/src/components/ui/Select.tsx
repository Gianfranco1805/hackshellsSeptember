import type { SelectHTMLAttributes } from 'react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
}

export function Select({ label, id, className = '', children, ...props }: SelectProps) {
  const selectId = id ?? label.toLowerCase().replace(/\s+/g, '-')
  return (
    <label htmlFor={selectId} className="block text-left">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <select
        id={selectId}
        className={`w-full min-h-11 rounded-2xl border border-slate-300 bg-white px-3 py-2 text-base focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy-light/30 ${className}`}
        {...props}
      >
        {children}
      </select>
    </label>
  )
}
