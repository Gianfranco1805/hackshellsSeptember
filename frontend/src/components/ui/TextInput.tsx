import type { InputHTMLAttributes } from 'react'

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
}

export function TextInput({ label, id, className = '', ...props }: TextInputProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-')
  return (
    <label htmlFor={inputId} className="block text-left">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <input
        id={inputId}
        className={`w-full min-h-11 rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200 ${className}`}
        {...props}
      />
    </label>
  )
}
