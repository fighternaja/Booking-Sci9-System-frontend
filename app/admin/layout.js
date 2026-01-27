'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import AdminNavbar from './components/AdminNavbar'

export default function AdminLayout({ children }) {
    const { user, isAdmin, loading } = useAuth()
    const router = useRouter()
    const [isClient, setIsClient] = useState(false)

    useEffect(() => {
        setIsClient(true)
    }, [])

    useEffect(() => {
        if (isClient && !loading) {
            if (!user || !isAdmin()) {
                router.push('/')
            }
        }
    }, [user, isAdmin, loading, router, isClient])

    // Don't render anything until client-side hydration is complete
    if (!isClient) {
        return null
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 font-medium">กำลังโหลด...</p>
                </div>
            </div>
        )
    }

    if (!user || !isAdmin()) {
        return null
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <AdminNavbar />
            {/* 
        Adjusted padding:
        - md:ml-64: Pushes content to the right of the fixed sidebar on desktop
        - pt-20: Top padding for mobile (when navbar is top)
        - md:pt-10: reduced top padding for desktop since sidebar is side
        - p-4/md:p-8: General padding
      */}
            <main className="md:ml-64 pt-28 md:pt-32 p-4 md:p-8 transition-all duration-300">
                <div className="max-w-7xl mx-auto space-y-6">
                    {children}
                </div>
            </main>
        </div>
    )
}
