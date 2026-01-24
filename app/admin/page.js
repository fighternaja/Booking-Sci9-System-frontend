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
  const { token, logout, user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!token) {
      router.push('/login')
      return
    }
    fetchDashboardData()
    fetchBookings()
  }, [token])

  const fetchDashboardData = async () => {
    if (!token) {
      setLoading(false)
      return
    }

    try {
      const response = await fetch('http://127.0.0.1:8000/api/admin/dashboard', {
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
        console.error('Error fetching dashboard data: HTTP', response.status)
        return
      }

      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        console.error('Non-JSON response:', text)
        return
      }

      const data = await response.json()

      if (data.success) {
        // Calculate additional statistics from bookings
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const weekAgo = new Date(today)
        weekAgo.setDate(weekAgo.getDate() - 7)
        const monthAgo = new Date(today)
        monthAgo.setMonth(monthAgo.getMonth() - 1)

        // Get all bookings for calculations
        const allBookings = bookings || []
        const todayBookings = allBookings.filter(b => {
          const bookingDate = new Date(b.start_time)
          bookingDate.setHours(0, 0, 0, 0)
          return bookingDate.getTime() === today.getTime()
        })
        const weekBookings = allBookings.filter(b => new Date(b.start_time) >= weekAgo)
        const monthBookings = allBookings.filter(b => new Date(b.start_time) >= monthAgo)

        // Calculate most used rooms
        const roomUsage = {}
        allBookings.forEach(b => {
          if (b.room && b.room.name) {
            roomUsage[b.room.name] = (roomUsage[b.room.name] || 0) + 1
          }
        })
        const mostUsedRooms = Object.entries(roomUsage)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)

        // Calculate top users
        const userBookings = {}
        allBookings.forEach(b => {
          if (b.user && b.user.name) {
            userBookings[b.user.name] = (userBookings[b.user.name] || 0) + 1
          }
        })
        const topUsers = Object.entries(userBookings)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)

        setDashboardData({
          ...data.data,
          today_bookings: todayBookings.length,
          week_bookings: weekBookings.length,
          month_bookings: monthBookings.length,
          most_used_rooms: mostUsedRooms,
          top_users: topUsers
        })
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchBookings = async () => {
    if (!token) {
      setBookingLoading(false)
      return
    }

    try {
      const response = await fetch('http://127.0.0.1:8000/api/bookings', {
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
        console.error('Error fetching bookings: HTTP', response.status)
        return
      }

      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        console.error('Non-JSON response:', text)
        return
      }

      const data = await response.json()

      if (data.success) {
        setBookings(data.data)
      }
    } catch (error) {
      console.error('Error fetching bookings:', error)
    } finally {
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
        fetchBookings()
        fetchDashboardData() // อัพเดทสถิติ
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
        fetchBookings()
        fetchDashboardData() // อัพเดทสถิติ
      }
    } catch (error) {
      console.error('Error rejecting booking:', error)
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
      approved: 'bg-green-50 text-green-700 border border-green-200',
      rejected: 'bg-red-50 text-red-700 border border-red-200',
      cancelled: 'bg-gray-50 text-gray-700 border border-gray-200'
    }
    return badges[status] || 'bg-gray-50 text-gray-700'
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

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-100 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Hero Stats Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 shadow-xl mb-10 p-8 text-white">
        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl"></div>

        <div className="relative z-10 text-center mb-10">
          <div className="inline-flex items-center justify-center p-3 bg-white/10 backdrop-blur-md rounded-2xl mb-4 shadow-lg ring-1 ring-white/20">
            <span className="text-3xl mr-2">📊</span>
            <h1 className="text-2xl font-bold text-white tracking-wide">สถิติการใช้งาน</h1>
          </div>
          <p className="text-blue-100 font-light text-lg">ข้อมูลการใช้งานระบบจองห้อง</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Rooms */}
          <div className="group bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-2xl hover:bg-white/20 transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl mb-4 shadow-inner ring-1 ring-white/10 group-hover:scale-110 transition-transform">
                🏢
              </div>
              <h3 className="text-4xl font-bold mb-2 text-white">{dashboardData.total_rooms}</h3>
              <p className="text-sm font-medium text-blue-100 uppercase tracking-wider">ห้องทั้งหมด</p>
            </div>
          </div>

          {/* Bookings */}
          <div className="group bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-2xl hover:bg-white/20 transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl mb-4 shadow-inner ring-1 ring-white/10 group-hover:scale-110 transition-transform">
                📅
              </div>
              <h3 className="text-4xl font-bold mb-2 text-white">{dashboardData.total_bookings}</h3>
              <p className="text-sm font-medium text-blue-100 uppercase tracking-wider">การจองทั้งหมด</p>
            </div>
          </div>

          {/* Pending */}
          <div className="group bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-2xl hover:bg-white/20 transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl mb-4 shadow-inner ring-1 ring-white/10 group-hover:scale-110 transition-transform">
                ⏳
              </div>
              <h3 className="text-4xl font-bold mb-2 text-white">{dashboardData.pending_bookings}</h3>
              <p className="text-sm font-medium text-blue-100 uppercase tracking-wider">รออนุมัติ</p>
            </div>
          </div>

          {/* Users */}
          <div className="group bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-2xl hover:bg-white/20 transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl mb-4 shadow-inner ring-1 ring-white/10 group-hover:scale-110 transition-transform">
                👥
              </div>
              <h3 className="text-4xl font-bold mb-2 text-white">{dashboardData.total_users || 0}</h3>
              <p className="text-sm font-medium text-blue-100 uppercase tracking-wider">ผู้ใช้งาน</p>
            </div>
          </div>
        </div>
      </div>

      {/* Time-based Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-600">วันนี้</h3>
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-xl">📅</span>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{dashboardData.today_bookings}</p>
          <p className="text-sm text-gray-500 mt-1">การจองวันนี้</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-600">สัปดาห์นี้</h3>
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-xl">📊</span>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{dashboardData.week_bookings}</p>
          <p className="text-sm text-gray-500 mt-1">การจอง 7 วันที่ผ่านมา</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-600">เดือนนี้</h3>
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="text-xl">📈</span>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{dashboardData.month_bookings}</p>
          <p className="text-sm text-gray-500 mt-1">การจอง 30 วันที่ผ่านมา</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-600">ยกเลิก</h3>
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <span className="text-xl">❌</span>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{dashboardData.cancelled_bookings || 0}</p>
          <p className="text-sm text-gray-500 mt-1">การจองที่ถูกยกเลิก</p>
        </div>
      </div>

      {/* Booking Status Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
        <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
          <span className="text-2xl mr-2">📊</span>
          สถิติสถานะการจอง
        </h3>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">อนุมัติแล้ว</span>
              <span className="text-sm font-bold text-green-600">{dashboardData.approved_bookings || 0}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${dashboardData.total_bookings > 0 ? (dashboardData.approved_bookings / dashboardData.total_bookings * 100) : 0}%` }}
              ></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">รออนุมัติ</span>
              <span className="text-sm font-bold text-yellow-600">{dashboardData.pending_bookings || 0}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-yellow-500 to-yellow-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${dashboardData.total_bookings > 0 ? (dashboardData.pending_bookings / dashboardData.total_bookings * 100) : 0}%` }}
              ></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">ปฏิเสธ</span>
              <span className="text-sm font-bold text-red-600">{dashboardData.rejected_bookings || 0}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-red-500 to-red-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${dashboardData.total_bookings > 0 ? (dashboardData.rejected_bookings / dashboardData.total_bookings * 100) : 0}%` }}
              ></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">ยกเลิก</span>
              <span className="text-sm font-bold text-gray-600">{dashboardData.cancelled_bookings || 0}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-gray-500 to-gray-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${dashboardData.total_bookings > 0 ? (dashboardData.cancelled_bookings / dashboardData.total_bookings * 100) : 0}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Most Used Rooms & Top Users */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Most Used Rooms */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
            <span className="text-2xl mr-2">🏆</span>
            ห้องที่ถูกใช้งานมากที่สุด
          </h3>
          {dashboardData.most_used_rooms && dashboardData.most_used_rooms.length > 0 ? (
            <div className="space-y-3">
              {dashboardData.most_used_rooms.map((room, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-3 ${index === 0 ? 'bg-yellow-400 text-white' :
                      index === 1 ? 'bg-gray-300 text-white' :
                        index === 2 ? 'bg-orange-400 text-white' :
                          'bg-gray-200 text-gray-600'
                      }`}>
                      {index + 1}
                    </div>
                    <span className="font-medium text-gray-900">{room.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-blue-600">{room.count} ครั้ง</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-8">ยังไม่มีข้อมูล</p>
          )}
        </div>

        {/* Top Users */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
            <span className="text-2xl mr-2">👥</span>
            ผู้ใช้งานที่จองบ่อยที่สุด
          </h3>
          {dashboardData.top_users && dashboardData.top_users.length > 0 ? (
            <div className="space-y-3">
              {dashboardData.top_users.map((user, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-3 ${index === 0 ? 'bg-yellow-400 text-white' :
                      index === 1 ? 'bg-gray-300 text-white' :
                        index === 2 ? 'bg-orange-400 text-white' :
                          'bg-gray-200 text-gray-600'
                      }`}>
                      {index + 1}
                    </div>
                    <span className="font-medium text-gray-900">{user.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-green-600">{user.count} ครั้ง</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-8">ยังไม่มีข้อมูล</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Area (2 cols) */}
        <div className="lg:col-span-2 space-y-8">
          {/* Booking Management */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
              <h2 className="text-lg font-bold text-gray-900">รายการจองล่าสุด</h2>
              <div className="flex bg-gray-100 p-1 rounded-lg">
                {['all', 'pending', 'approved', 'rejected'].map(key => (
                  <button
                    key={key}
                    onClick={() => setFilter(key)}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${filter === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
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
              {bookingLoading ? (
                <div className="p-8 text-center text-gray-500">Loading bookings...</div>
              ) : filteredBookings.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-gray-400 mb-2">ไม่มีข้อมูลการจอง</p>
                </div>
              ) : (
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">ห้อง / วันที่</th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">ผู้จอง</th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">สถานะ</th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">ดำเนินการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredBookings.slice(0, 10).map((booking) => (
                      <tr key={booking.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div>
                              <div className="font-semibold text-gray-900">{booking.room.name}</div>
                              <div className="text-xs text-gray-500 mt-1">{formatDateToThai(booking.start_time)}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold mb-1">
                              {booking.user.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-xs text-gray-600 truncate max-w-[100px]">{booking.user.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(booking.status)}`}>
                            {getStatusText(booking.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {booking.status === 'pending' ? (
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => handleApprove(booking.id)}
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="อนุมัติ"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleReject(booking.id)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="ปฏิเสธ"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {filteredBookings.length > 10 && (
                <div className="p-4 border-t border-gray-100 text-center">
                  <Link href="/admin/bookings" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
                    ดูทั้งหมด
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar / Quick Actions (1 col) */}
        <div className="space-y-6">
          {/* Pending Alert Card (if any) */}
          {dashboardData.pending_bookings > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 -mt-2 -mr-2 w-20 h-20 bg-yellow-100 rounded-full opacity-50 blur-xl"></div>
              <h3 className="text-lg font-bold text-yellow-800 mb-2 relative z-10">⚠️ การจองรออนุมัติ</h3>
              <p className="text-yellow-700 text-sm mb-4 relative z-10">
                มี {dashboardData.pending_bookings} รายการจองที่รอการตรวจสอบจากคุณ
              </p>
              <button
                onClick={() => setFilter('pending')}
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 px-4 rounded-xl transition-colors text-sm relative z-10"
              >
                ตรวจสอบเลย
              </button>
            </div>
          )}

          {/* Quick Menu */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">เมนูด่วน</h3>
            <div className="space-y-3">
              <Link href="/admin/rooms" className="flex items-center p-3 rounded-xl hover:bg-gray-50 transition-colors group">
                <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center mr-3 group-hover:bg-blue-600 group-hover:text-white transition-all">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">จัดการห้อง</p>
                  <p className="text-xs text-gray-500">เพิ่ม/แก้ไขข้อมูลห้อง</p>
                </div>
              </Link>

            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
