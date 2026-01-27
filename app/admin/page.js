'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { formatDateTimeToThai } from '../utils/dateUtils'
import AdminButton from './components/AdminButton'
import AdminCard from './components/AdminCard'
import AdminHeader from './components/AdminHeader'
import StatCard from './components/StatCard'
import { API_URL } from '../lib/api'

export default function AdminDashboard() {
  const [dashboardData, setDashboardData] = useState({
    total_rooms: 0,
    total_bookings: 0,
    pending_bookings: 0,
    approved_bookings: 0,
    rejected_bookings: 0,
    cancelled_bookings: 0,
    total_users: 0,
    today_bookings: 0,
    week_bookings: 0,
    month_bookings: 0,
    most_used_rooms: [],
    top_users: [],
    recent_bookings: []
  })
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [bookingLoading, setBookingLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const { token, logout, user, loading: authLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (authLoading) return
    if (!token) {
      router.push('/login')
      return
    }
    fetchAllData()
  }, [token, authLoading])

  const fetchAllData = async () => {
    if (!token) {
      setLoading(false)
      setBookingLoading(false)
      return
    }

    try {
      // Fetch both APIs in parallel for better performance
      const [dashboardResponse, bookingsResponse] = await Promise.all([
        fetch(`${API_URL}/api/admin/dashboard`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }),
        fetch(`${API_URL}/api/bookings?per_page=10`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        })
      ])

      // Handle dashboard response
      if (dashboardResponse.ok) {
        const contentType = dashboardResponse.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          const dashboardData = await dashboardResponse.json()

          if (dashboardData.success) {
            if (bookingsResponse.ok) {
              const bookingsContentType = bookingsResponse.headers.get('content-type')
              if (bookingsContentType && bookingsContentType.includes('application/json')) {
                const bookingsData = await bookingsResponse.json()
                if (bookingsData.success) {
                  setBookings(bookingsData.data)
                }
              }
            }

            // Use backend calculated statistics
            setDashboardData({
              ...dashboardData.data,
              // Backend now provides these fields directly
              today_bookings: dashboardData.data.today_bookings || 0,
              week_bookings: dashboardData.data.week_bookings || 0,
              month_bookings: dashboardData.data.month_bookings || 0,
              most_used_rooms: dashboardData.data.most_used_rooms || [],
              top_users: dashboardData.data.top_users || [],
              recent_bookings: dashboardData.data.recent_bookings || []
            })
          }
        }
      }

      if (dashboardResponse.status === 401 || bookingsResponse.status === 401) {
        logout()
        router.push('/login')
        return
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
      setBookingLoading(false)
    }
  }

  const handleApprove = async (bookingId) => {
    try {
      const response = await fetch(`${API_URL}/api/bookings/${bookingId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      })

      if (!response.ok) {
        if (response.status === 401) {
          logout()
          router.push('/login')
          return
        }
        console.error('Error approving booking: HTTP', response.status)
        return
      }

      const data = await response.json()

      if (data.success) {
        setBookings(prevBookings =>
          prevBookings.map(b =>
            b.id === bookingId ? { ...b, status: 'approved' } : b
          )
        )
        setDashboardData(prev => ({
          ...prev,
          pending_bookings: Math.max(0, prev.pending_bookings - 1),
          approved_bookings: prev.approved_bookings + 1
        }))
      }
    } catch (error) {
      console.error('Error approving booking:', error)
    }
  }

  const handleReject = async (bookingId) => {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะปฏิเสธการจองนี้?')) return

    try {
      const response = await fetch(`${API_URL}/api/bookings/${bookingId}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      })

      if (!response.ok) {
        if (response.status === 401) {
          logout()
          router.push('/login')
          return
        }
        console.error('Error rejecting booking: HTTP', response.status)
        return
      }

      const data = await response.json()

      if (data.success) {
        setBookings(prevBookings =>
          prevBookings.map(b =>
            b.id === bookingId ? { ...b, status: 'rejected' } : b
          )
        )
        setDashboardData(prev => ({
          ...prev,
          pending_bookings: Math.max(0, prev.pending_bookings - 1),
          rejected_bookings: prev.rejected_bookings + 1
        }))
      }
    } catch (error) {
      console.error('Error rejecting booking:', error)
    }
  }

  const filteredBookings = bookings.filter(booking => {
    if (filter === 'all') return true
    if (filter === 'pending') return booking.status === 'pending'
    if (filter === 'approved') return booking.status === 'approved'
    if (filter === 'rejected') return booking.status === 'rejected'
    return true
  })



  if (loading || authLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-10 w-48 bg-gray-200 rounded-lg"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-2xl"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <AdminHeader
        title="ภาพรวมระบบ"
        subtitle="สวัสดี, ยินดีต้อนรับกลับสู่ระบบจัดการ"
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="ห้องทั้งหมด" value={dashboardData.total_rooms} icon="🏢" color="blue" description="ห้องที่เปิดใช้งาน" />
        <StatCard label="การจองทั้งหมด" value={dashboardData.total_bookings} icon="📅" color="purple" description="รายการจองทั้งหมด" />
        <StatCard label="ผู้ใช้งาน" value={dashboardData.total_users} icon="👥" color="green" description="ผู้ใช้งานในระบบ" />
        <StatCard label="รออนุมัติ" value={dashboardData.pending_bookings} icon="⏳" color="orange" description="รายการที่รอดำเนินการ" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Bookings */}
          <AdminCard className="overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">รายการจองล่าสุด</h2>
                <p className="text-sm text-gray-500 mt-1">ติดตามสถานะการจองล่าสุด</p>
              </div>
              <Link href="/admin/bookings">
                <AdminButton variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                  ดูทั้งหมด →
                </AdminButton>
              </Link>
            </div>

            {filteredBookings.length > 0 ? (
              <div className="space-y-4">
                {filteredBookings.slice(0, 5).map((booking) => (
                  <div key={booking.id} className="group flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-blue-300 hover:shadow-md transition-all bg-white">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-bold text-gray-900 truncate">{booking.room.name}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${booking.status === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                          booking.status === 'approved' ? 'bg-green-50 text-green-700 border-green-200' :
                            booking.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                              'bg-gray-50 text-gray-600 border-gray-200'
                          }`}>
                          {booking.status === 'pending' ? 'รออนุมัติ' :
                            booking.status === 'approved' ? 'อนุมัติ' :
                              booking.status === 'rejected' ? 'ปฏิเสธ' : 'ยกเลิก'}
                        </span>
                      </div>
                      <div className="flex items-center text-sm text-gray-500 gap-3">
                        <span className="flex items-center gap-1">📅 {formatDateTimeToThai(booking.start_time)}</span>
                        <span className="text-gray-300">|</span>
                        <span className="flex items-center gap-1 truncate">👤 {booking.user.name}</span>
                      </div>
                    </div>

                    {booking.status === 'pending' && (
                      <div className="flex gap-2 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleApprove(booking.id)}
                          className="w-8 h-8 flex items-center justify-center bg-green-100 hover:bg-green-600 text-green-700 hover:text-white rounded-full transition-all"
                          title="อนุมัติ"
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => handleReject(booking.id)}
                          className="w-8 h-8 flex items-center justify-center bg-red-100 hover:bg-red-600 text-red-700 hover:text-white rounded-full transition-all"
                          title="ปฏิเสธ"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <p>ไม่พบข้อมูลการจอง</p>
              </div>
            )}
          </AdminCard>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'วันนี้', value: dashboardData.today_bookings, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'สัปดาห์นี้', value: dashboardData.week_bookings, color: 'text-purple-600', bg: 'bg-purple-50' },
              { label: 'เดือนนี้', value: dashboardData.month_bookings, color: 'text-green-600', bg: 'bg-green-50' }
            ].map((stat, i) => (
              <div key={i} className={`p-4 rounded-2xl ${stat.bg} flex flex-col items-center justify-center text-center`}>
                <span className="text-gray-600 text-xs font-bold uppercase tracking-wider mb-1">{stat.label}</span>
                <span className={`text-3xl font-bold ${stat.color}`}>{stat.value}</span>
                <span className="text-[10px] text-gray-500 mt-1">การจอง</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar Column */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <AdminCard>
            <h3 className="text-lg font-bold text-gray-900 mb-4">⚡ เมนูด่วน</h3>
            <div className="grid grid-cols-2 gap-3">
              <Link href="/admin/rooms" className="group flex flex-col items-center justify-center p-4 rounded-xl bg-gray-50 hover:bg-white hover:shadow-md border border-gray-100 transition-all">
                <span className="text-2xl mb-2 group-hover:scale-110 transition-transform">🏢</span>
                <span className="text-sm font-bold text-gray-700 group-hover:text-blue-600">จัดการห้อง</span>
              </Link>
              <Link href="/admin/bookings" className="group flex flex-col items-center justify-center p-4 rounded-xl bg-gray-50 hover:bg-white hover:shadow-md border border-gray-100 transition-all">
                <span className="text-2xl mb-2 group-hover:scale-110 transition-transform">📝</span>
                <span className="text-sm font-bold text-gray-700 group-hover:text-purple-600">รายการจอง</span>
              </Link>
              <Link href="/admin/schedule" className="group flex flex-col items-center justify-center p-4 rounded-xl bg-gray-50 hover:bg-white hover:shadow-md border border-gray-100 transition-all">
                <span className="text-2xl mb-2 group-hover:scale-110 transition-transform">📅</span>
                <span className="text-sm font-bold text-gray-700 group-hover:text-green-600">ตารางเวลา</span>
              </Link>
              <Link href="/admin/settings" className="group flex flex-col items-center justify-center p-4 rounded-xl bg-gray-50 hover:bg-white hover:shadow-md border border-gray-100 transition-all">
                <span className="text-2xl mb-2 group-hover:scale-110 transition-transform">⚙️</span>
                <span className="text-sm font-bold text-gray-700 group-hover:text-gray-900">ตั้งค่า</span>
              </Link>
            </div>
          </AdminCard>

          {/* Most Used Rooms */}
          <AdminCard>
            <h3 className="text-lg font-bold text-gray-900 mb-4">🏆 ห้องยอดนิยม</h3>
            {dashboardData.most_used_rooms.length > 0 ? (
              <div className="space-y-3">
                {dashboardData.most_used_rooms.slice(0, 5).map((room, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs text-white ${i === 0 ? 'bg-yellow-400' :
                        i === 1 ? 'bg-gray-400' :
                          i === 2 ? 'bg-orange-400' : 'bg-blue-200'
                        }`}>
                        {i + 1}
                      </div>
                      <span className="font-semibold text-gray-700 text-sm">{room.name}</span>
                    </div>
                    <span className="text-xs font-bold text-gray-500">
                      {room.count} ครั้ง
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-400 py-4 text-sm">ยังไม่มีข้อมูล</p>
            )}
          </AdminCard>
        </div>
      </div>
    </div>
  )
}
