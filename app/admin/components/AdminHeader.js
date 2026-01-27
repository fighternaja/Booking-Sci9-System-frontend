'use client'

export default function AdminHeader({ title, subtitle = '', actions = null }) {
  return (
    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight mb-2">{title}</h1>
        {subtitle && <p className="text-gray-500 text-base font-medium">{subtitle}</p>}
      </div>
      {actions && <div className="flex gap-3 flex-wrap">{actions}</div>}
    </div>
  )
}
