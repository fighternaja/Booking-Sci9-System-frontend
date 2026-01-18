'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import AdminNavbar from './components/AdminNavbar'
import Footer from '../components/Footer'

export default function AdminLayout({ children }) {
  const { user, isAdmin, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && (!user || !isAdmin())) {
      router.push('/')
    }
  }, [user, isAdmin, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">กำลังโหลด...</p>
        </div>
      </div>
    )
  }

  if (!user || !isAdmin()) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />
      <main className="ml-64 pt-24">
        {children}
      </main>
    </div>
  )
}
