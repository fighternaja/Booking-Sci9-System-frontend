'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function AdminDashboard() {
  const [dashboardData, setDashboardData] = useState({
    total_rooms: 0,
    total_bookings: 0,
    pending_bookings: 0,
    recent_bookings: []
  })
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [bookingLoading, setBookingLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const { token } = useAuth()

  useEffect(() => {
    fetchDashboardData()
    fetchBookings()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/admin/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      const data = await response.json()
      
      if (data.success) {
        setDashboardData(data.data)
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchBookings = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/bookings', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
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
          'Content-Type': 'application/json'
        }
      })

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
          'Content-Type': 'application/json'
        }
      })

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
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800'
    }
    return badges[status] || 'bg-gray-100 text-gray-800'
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
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    
      <div className="p-8">
        <div className="mb-8">
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold text-lg transition-colors shadow-md">
            ภาพรวมระบบ
          </button>
          <p className="text-gray-600 mt-2">ข้อมูลสถิติและการจัดการระบบจองห้อง</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">จำนวนห้องทั้งหมด</p>
                <p className="text-2xl font-semibold text-gray-900">{dashboardData.total_rooms}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">การจองทั้งหมด</p>
                <p className="text-2xl font-semibold text-gray-900">{dashboardData.total_bookings}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-yellow-100">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">รออนุมัติ</p>
                <p className="text-2xl font-semibold text-gray-900">{dashboardData.pending_bookings}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-100">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">ผู้ใช้ทั้งหมด</p>
                <p className="text-2xl font-semibold text-gray-900">{dashboardData.total_users || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Pending Bookings Section */}
        {dashboardData.pending_bookings > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
            <div className="flex items-center mb-4">
              <div className="p-2 bg-yellow-100 rounded-full mr-3">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-yellow-800">การจองรออนุมัติ</h2>
                <p className="text-sm text-yellow-700">มี {dashboardData.pending_bookings} การจองรอการอนุมัติ</p>
              </div>
            </div>
            
            <div className="space-y-3">
              {bookings.filter(b => b.status === 'pending').slice(0, 3).map((booking) => (
                <div key={booking.id} className="bg-white rounded-lg p-4 border border-yellow-200">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900">{booking.room.name}</h3>
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                          รออนุมัติ
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{booking.room.location}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-blue-600 text-xs font-medium">
                          {booking.user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{booking.user.name}</p>
                        <p className="text-xs text-gray-500">{booking.user.email}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">วันที่จอง</p>
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(booking.start_time).toLocaleDateString('th-TH')} - {new Date(booking.end_time).toLocaleDateString('th-TH')}
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-600">วัตถุประสงค์: {booking.purpose}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(booking.id)}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors"
                      >
                        อนุมัติ
                      </button>
                      <button
                        onClick={() => handleReject(booking.id)}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors"
                      >
                        ปฏิเสธ
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              
              {bookings.filter(b => b.status === 'pending').length > 3 && (
                <div className="text-center pt-3">
                  <button 
                    onClick={() => setFilter('pending')}
                    className="text-yellow-700 hover:text-yellow-800 text-sm font-medium"
                  >
                    ดูการจองรออนุมัติทั้งหมด ({bookings.filter(b => b.status === 'pending').length})
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Booking Management Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">การจองทั้งหมด</h2>
              <p className="text-sm text-gray-600">จัดการการจองในระบบ</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'all', label: 'ทั้งหมด' },
                { key: 'pending', label: 'รออนุมัติ' },
                { key: 'approved', label: 'อนุมัติแล้ว' },
                { key: 'rejected', label: 'ปฏิเสธ' }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    filter === tab.key
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {bookingLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-gray-50 p-4 rounded-lg animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredBookings.slice(0, 5).map((booking) => (
                <div key={booking.id} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900">{booking.room.name}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(booking.status)}`}>
                          {getStatusText(booking.status)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{booking.room.location}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-blue-600 text-xs font-medium">
                          {booking.user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{booking.user.name}</p>
                        <p className="text-xs text-gray-500">{booking.user.email}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">วัตถุประสงค์</p>
                      <p className="text-sm font-medium text-gray-900">{booking.purpose}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">วันที่</p>
                      <p className="text-sm font-medium text-gray-900">
                        {formatDateToThai(booking.start_time)}
                      </p>
                    </div>
                  </div>

                  {booking.status === 'pending' && (
                    <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
                      <button
                        onClick={() => handleReject(booking.id)}
                        className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
                      >
                        ปฏิเสธ
                      </button>
                      <button
                        onClick={() => handleApprove(booking.id)}
                        className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm font-medium"
                      >
                        อนุมัติ
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {filteredBookings.length === 0 && (
                <div className="text-center py-8">
                  <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p className="text-gray-500">
                    {filter === 'all' ? 'ไม่มีการจอง' : 
                     filter === 'pending' ? 'ไม่มีการจองรออนุมัติ' :
                     filter === 'approved' ? 'ไม่มีการจองที่อนุมัติแล้ว' :
                     'ไม่มีการจองที่ปฏิเสธ'}
                  </p>
                </div>
              )}

              {filteredBookings.length > 5 && (
                <div className="text-center pt-4 border-t border-gray-200">
                  <Link
                    href="/admin/bookings"
                    className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    ดูการจองทั้งหมด ({filteredBookings.length} รายการ)
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">เมนูจัดการ</h2>
            <div className="grid grid-cols-1 gap-3">
              <Link
                href="/admin/bookings"
                className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="p-2 bg-blue-100 rounded-lg mr-3">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">จัดการการจอง</p>
                  <p className="text-sm text-gray-600">ดูและจัดการการจองทั้งหมด</p>
                </div>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>

              <Link
                href="/admin/rooms"
                className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="p-2 bg-purple-100 rounded-lg mr-3">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">จัดการห้อง</p>
                  <p className="text-sm text-gray-600">เพิ่ม แก้ไข หรือลบห้อง</p>
                </div>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>

              <Link
                href="/admin/schedule"
                className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="p-2 bg-green-100 rounded-lg mr-3">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">ตารางการจอง</p>
                  <p className="text-sm text-gray-600">ดูตารางการจองแบบปฏิทิน</p>
                </div>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>

              <Link
                href="/admin/reports"
                className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="p-2 bg-orange-100 rounded-lg mr-3">
                  <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">รายงาน</p>
                  <p className="text-sm text-gray-600">สร้างรายงานการใช้งาน</p>
                </div>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>

          {/* Recent Activities */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">กิจกรรมล่าสุด</h2>
            <div className="space-y-4">
              {dashboardData.recent_bookings.length > 0 ? (
                dashboardData.recent_bookings.map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                        <span className="text-blue-600 text-sm font-medium">
                          {booking.user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{booking.user.name}</p>
                        <p className="text-sm text-gray-600">{booking.room.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(booking.status)}`}>
                        {getStatusText(booking.status)}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(booking.created_at).toLocaleDateString('th-TH')}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p className="text-gray-500">ไม่มีกิจกรรมล่าสุด</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

  )
}
