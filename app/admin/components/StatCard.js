'use client'

export default function StatCard({ label, value, icon = '📊', color = 'blue', description = '' }) {
  const colorStyles = {
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    green: 'bg-green-50 text-green-600',
    orange: 'bg-orange-50 text-orange-600',
    red: 'bg-red-50 text-red-600',
    indigo: 'bg-indigo-50 text-indigo-600',
  }

  const activeColor = colorStyles[color] || 'bg-gray-50 text-gray-600'

  return (
    <div className="bg-white rounded-2xl border border-gray-100/50 shadow-sm hover:shadow-md transition-all duration-300 p-6 group">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-2xl ${activeColor} flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-300`}>
          {icon}
        </div>
      </div>
      <div>
        <h3 className="text-gray-500 text-sm font-medium mb-1">{label}</h3>
        <p className="text-3xl font-bold text-gray-900 tracking-tight">{value}</p>
        {description && <p className="text-xs text-gray-400 mt-2">{description}</p>}
      </div>
    </div>
  )
}
