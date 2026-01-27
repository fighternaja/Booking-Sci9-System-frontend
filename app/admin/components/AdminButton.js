'use client'

export default function AdminButton({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  icon = null,
  ...props
}) {
  const baseStyles = 'font-bold rounded-xl transition-all duration-200 inline-flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed'

  const variants = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200 hover:shadow-blue-300 shadow-lg',
    secondary: 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 hover:border-gray-300 shadow-sm',
    success: 'bg-green-500 hover:bg-green-600 text-white shadow-green-200 hover:shadow-green-300 shadow-lg',
    danger: 'bg-red-500 hover:bg-red-600 text-white shadow-red-200 hover:shadow-red-300 shadow-lg',
    outline: 'border-2 border-gray-200 hover:border-blue-500 text-gray-600 hover:text-blue-600 bg-transparent',
    ghost: 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-8 py-3.5 text-base',
  }

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {icon && <span>{icon}</span>}
      {children}
    </button>
  )
}
