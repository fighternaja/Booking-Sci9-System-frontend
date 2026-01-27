'use client'

export default function AdminCard({ children, className = '', noPadding = false, title, icon, action }) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-gray-100/50 hover:shadow-md transition-shadow duration-300 overflow-hidden ${className}`}>
      {(title || icon || action) && (
        <div className="px-6 py-4 border-b border-gray-100/50 flex justify-between items-center bg-gray-50/30">
          <div className="flex items-center gap-3">
            {icon && <span className="text-xl">{icon}</span>}
            {title && <h3 className="text-lg font-bold text-gray-900">{title}</h3>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className={noPadding ? '' : 'p-6 md:p-8'}>
        {children}
      </div>
    </div>
  )
}
