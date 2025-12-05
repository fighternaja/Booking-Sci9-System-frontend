'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '../../contexts/AuthContext'

export default function AdminNavbar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  const navigation = [
    { name: 'ภาพรวม', href: '/admin', icon: '📊' },
    { name: 'จัดการห้อง', href: '/admin/rooms', icon: '🏢' },
    { name: 'ตารางห้อง', href: '/admin/schedule', icon: '📅' },
    { name: 'รายงาน', href: '/admin/reports', icon: '📈' }
  ]

  const isActive = (href) => {
    if (href === '/admin') {
      return pathname === '/admin'
    }
    return pathname.startsWith(href)
  }

  return (
    <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
        <div className="flex items-center">
          <h1 className="text-xl font-bold text-blue-600">🏢 Admin Panel</h1>
        </div>
      </div>

      {/* User Info */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center">
          <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
            <span className="text-white text-sm font-medium">
              {user?.name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-900">{user?.name}</p>
            <p className="text-xs text-gray-500">ผู้ดูแลระบบ</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="mt-6 px-3">
        <div className="space-y-1">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                isActive(item.href)
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <span className="mr-3 text-lg">{item.icon}</span>
              {item.name}
            </Link>
          ))}
        </div>
      </nav>

      {/* Notifications */}
      <div className="mt-6 px-3">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4 19h6v-6H4v6z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-yellow-800">การแจ้งเตือน</p>
              <p className="text-xs text-yellow-600">มี 3 การจองรออนุมัติ</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← กลับหน้าหลัก
          </Link>
          <button
            onClick={logout}
            className="text-sm text-red-600 hover:text-red-800"
          >
            ออกจากระบบ
          </button>
        </div>
      </div>
    </div>
  )
}
