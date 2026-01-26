'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'



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
        fetch('http://127.0.0.1:8000/api/admin/dashboard', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }),
        fetch('http://127.0.0.1:8000/api/bookings?per_page=10', {
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
      const response = await fetch(`http://127.0.0.1:8000/api/bookings/${bookingId}/approve`, {
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
      const response = await fetch(`http://127.0.0.1:8000/api/bookings/${bookingId}/reject`, {
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

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      approved: 'bg-green-100 text-green-700 border-green-200',
      rejected: 'bg-red-100 text-red-700 border-red-200',
      cancelled: 'bg-gray-100 text-gray-700 border-gray-200'
    }
    return `${styles[status] || 'bg-gray-100 text-gray-700'} border px-3 py-1 rounded-full text-xs font-semibold shadow-sm`
  }

  const getStatusText = (status) => {
    const texts = {
      pending: 'รออนุมัติ',
      approved: 'อนุมัติแล้ว',
      rejected: 'ปฏิเสธ',
      cancelled: 'ยกเลิก'
    }
    return texts[status] || status
  }

  const filteredBookings = bookings.filter(booking => {
    if (filter === 'all') return true
    if (filter === 'pending') return booking.status === 'pending'
    if (filter === 'approved') return booking.status === 'approved'
    if (filter === 'rejected') return booking.status === 'rejected'
    return true
  })

  const formatDateToThai = (dateString) => {
    const date = new Date(dateString)
    const thaiMonths = [
      'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
    ]
    const day = date.getDate()
    const month = thaiMonths[date.getMonth()]
    const year = date.getFullYear() + 543
    const hour = String(date.getHours()).padStart(2, '0')
    const minute = String(date.getMinutes()).padStart(2, '0')
    return `${day} ${month} ${year} • ${hour}:${minute} น.`
  }

  if (loading || authLoading) {
    return (
      <div className="min-h-screen p-8 bg-gray-50/50">
        <div className="animate-pulse max-w-7xl mx-auto space-y-8">
          <div className="h-48 bg-gray-200 rounded-3xl"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-2xl"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8 bg-gray-50/50">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header / Hero Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1a1c2e] via-[#16213e] to-[#1f2937] shadow-xl p-8 md:p-12 text-white">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>

          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-sm font-medium text-blue-100 mb-4">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                System Online
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-2 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                Admin Dashboard
              </h1>
              <p className="text-gray-400 text-lg max-w-xl">
                ภาพรวมระบบการจองห้องพักและสถิติการใช้งานประจำวันของคุณ
              </p>
            </div>

            <div className="flex gap-3">
              <Link
                href="/admin/bookings"
                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-900/20 transition-all hover:-translate-y-0.5"
              >
                จัดการการจอง
              </Link>
              <Link
                href="/admin/reports"
                className="px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white rounded-xl font-bold border border-white/10 transition-all hover:-translate-y-0.5"
              >
                ดูรายงาน
              </Link>
            </div>
          </div>
        </div>



        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: 'ห้องทั้งหมด', value: dashboardData.total_rooms, icon: '🏢', color: 'blue', bg: 'from-blue-500 to-blue-600' },
            { label: 'การจองทั้งหมด', value: dashboardData.total_bookings, icon: '📅', color: 'purple', bg: 'from-purple-500 to-purple-600' },
            { label: 'ผู้ใช้งาน', value: dashboardData.total_users, icon: '👥', color: 'indigo', bg: 'from-indigo-500 to-indigo-600' },
            { label: 'รออนุมัติ', value: dashboardData.pending_bookings, icon: '⏳', color: 'orange', bg: 'from-orange-500 to-orange-600' }
          ].map((stat, i) => (
            <div key={i} className="group relative bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className={`absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity`}>
                <span className="text-6xl">{stat.icon}</span>
              </div>
              <div className="relative z-10">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.bg} flex items-center justify-center text-2xl shadow-lg mb-4 text-white`}>
                  {stat.icon}
                </div>
                <h3 className="text-4xl font-black text-gray-900 mb-1">{stat.value}</h3>
                <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content - Recent Bookings */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50/30">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-xl">📝</span>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">รายการจองล่าสุด</h2>
                    <p className="text-sm text-gray-500">จัดการการจองที่เข้ามาล่าสุด</p>
                  </div>
                </div>
                <div className="flex bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
                  {['all', 'pending', 'approved', 'rejected'].map(key => (
                    <button
                      key={key}
                      onClick={() => setFilter(key)}
                      className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${filter === key
                        ? 'bg-gray-900 text-white shadow-md'
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                    >
                      {key === 'all' ? 'ทั้งหมด' :
                        key === 'pending' ? 'รออนุมัติ' :
                          key === 'approved' ? 'อนุมัติ' : 'ปฏิเสธ'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50/50">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-left">ห้อง / เวลา</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">ผู้จอง</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">สถานะ</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredBookings.slice(0, 10).map((booking) => (
                      <tr key={booking.id} className="group hover:bg-blue-50/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-gray-900 group-hover:text-blue-700 transition-colors">{booking.room.name}</span>
                            <span className="text-xs font-medium text-gray-500">{formatDateToThai(booking.start_time)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center">
                            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gray-50 border border-gray-100">
                              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 text-white flex items-center justify-center text-xs font-bold">
                                {booking.user.name.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-sm font-medium text-gray-700">{booking.user.name}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={getStatusBadge(booking.status)}>
                            {getStatusText(booking.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                            {booking.status === 'pending' ? (
                              <>
                                <button
                                  onClick={() => handleApprove(booking.id)}
                                  className="w-8 h-8 rounded-lg bg-green-100 text-green-600 flex items-center justify-center hover:bg-green-600 hover:text-white transition-all shadow-sm"
                                  title="อนุมัติ"
                                >
                                  ✓
                                </button>
                                <button
                                  onClick={() => handleReject(booking.id)}
                                  className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center hover:bg-red-600 hover:text-white transition-all shadow-sm"
                                  title="ปฏิเสธ"
                                >
                                  ✕
                                </button>
                              </>
                            ) : (
                              <span className="text-xs font-medium text-gray-400">ดำเนินการแล้ว</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredBookings.length === 0 && (
                      <tr>
                        <td colSpan="4" className="px-6 py-12 text-center text-gray-400">
                          ไม่พบข้อมูลการจอง
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {filteredBookings.length > 10 && (
                <div className="p-4 border-t border-gray-100 bg-gray-50/30 text-center">
                  <Link href="/admin/bookings" className="text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors">
                    ดูทั้งหมด →
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-sm">⚡</span>
                เมนูด่วน
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <Link href="/admin/rooms" className="flex flex-col items-center justify-center p-4 rounded-2xl bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors border border-blue-100">
                  <span className="text-2xl mb-2">🏢</span>
                  <span className="text-xs font-bold">จัดการห้อง</span>
                </Link>

                <Link href="/admin/settings" className="flex flex-col items-center justify-center p-4 rounded-2xl bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors border border-gray-100">
                  <span className="text-2xl mb-2">⚙️</span>
                  <span className="text-xs font-bold">ตั้งค่า</span>
                </Link>
                <Link href="/admin/notifications" className="flex flex-col items-center justify-center p-4 rounded-2xl bg-orange-50 text-orange-700 hover:bg-orange-100 transition-colors border border-orange-100">
                  <span className="text-2xl mb-2">🔔</span>
                  <span className="text-xs font-bold">แจ้งเตือน</span>
                </Link>
              </div>
            </div>

            {/* Most Used Rooms */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center text-sm">🏆</span>
                ห้องยอดนิยม
              </h3>
              <div className="space-y-4">
                {dashboardData.most_used_rooms.map((room, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-white hover:shadow-md transition-all border border-transparent hover:border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${i === 0 ? 'bg-yellow-400 text-white shadow-yellow-200' :
                        i === 1 ? 'bg-gray-300 text-white' :
                          i === 2 ? 'bg-orange-400 text-white' : 'bg-gray-200 text-gray-500'
                        }`}>
                        {i + 1}
                      </div>
                      <span className="font-bold text-gray-700">{room.name}</span>
                    </div>
                    <span className="text-xs font-bold px-2 py-1 rounded-md bg-white border border-gray-200 text-gray-600">
                      {room.count} ครั้ง
                    </span>
                  </div>
                ))}
                {dashboardData.most_used_rooms.length === 0 && (
                  <p className="text-center text-gray-400 text-sm py-4">ยังไม่มีข้อมูล</p>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
