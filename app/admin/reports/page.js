'use client'

import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { convertDDMMYYYYToISO, formatDateToDDMMYYYY, formatDateToThai } from '../../utils/dateUtils'

export default function AdminReportsPage() {
  const [reports, setReports] = useState({
    totalBookings: 0,
    approvedBookings: 0,
    pendingBookings: 0,
    rejectedBookings: 0,
    totalRooms: 0,
    totalUsers: 0,
    recentBookings: [],
    popularRooms: [],
    monthlyStats: []
  })
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  })
  const startDateRef = useRef(null)
  const endDateRef = useRef(null)
  const { token } = useAuth()

  useEffect(() => {
    fetchReports()
  }, [dateRange])

  const fetchReports = async () => {
    try {
      setLoading(true)
      
      // Fetch rooms first (public endpoint)
      const roomsResponse = await fetch('http://127.0.0.1:8000/api/rooms', {
        headers: {
          'Accept': 'application/json'
        }
      })

      if (roomsResponse.ok) {
        const roomsData = await roomsResponse.json()
        if (roomsData.success) {
          setReports(prev => ({
            ...prev,
            totalRooms: roomsData.data.length
          }))
        }
      }

      // Fetch bookings (public endpoint for basic stats)
      const bookingsResponse = await fetch('http://127.0.0.1:8000/api/bookings', {
        headers: {
          'Accept': 'application/json'
        }
      })

      if (bookingsResponse.ok) {
        const bookingsData = await bookingsResponse.json()
        if (bookingsData.success) {
          const bookings = bookingsData.data
          const total = bookings.length
          const approved = bookings.filter(b => b.status === 'approved').length
          const pending = bookings.filter(b => b.status === 'pending').length
          const rejected = bookings.filter(b => b.status === 'rejected').length
          
          setReports(prev => ({
            ...prev,
            totalBookings: total,
            approvedBookings: approved,
            pendingBookings: pending,
            rejectedBookings: rejected,
            recentBookings: bookings.slice(0, 5) // Show last 5 bookings
          }))
        }
      }

      // Try to fetch dashboard stats if token is available
      if (token) {
        try {
          const dashboardResponse = await fetch('http://127.0.0.1:8000/api/admin/dashboard', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json'
            }
          })

          if (dashboardResponse.ok) {
            const dashboardData = await dashboardResponse.json()
            if (dashboardData.success) {
              setReports(prev => ({
                ...prev,
                totalUsers: dashboardData.data.total_users || 0
              }))
            }
          }
        } catch (error) {
          console.log('Dashboard API not available, using basic stats')
        }
      }

    } catch (error) {
      console.error('Error fetching reports:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDateRangeChange = (field, value) => {
    setDateRange(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleDisplayDateChange = (field, value) => {
    if (value.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      const isoDate = convertDDMMYYYYToISO(value)
      setDateRange(prev => ({
        ...prev,
        [field]: isoDate
      }))
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
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
        <h1 className="text-3xl font-bold text-gray-900 mb-4">📈 รายงาน</h1>
        <p className="text-gray-600 mb-6">รายงานสถิติการใช้งานระบบจองห้อง</p>
        
        <div className="flex items-center space-x-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">วันที่เริ่มต้น:</label>
            <div className="relative">
              <input
                type="text"
                value={formatDateToDDMMYYYY(dateRange.startDate)}
                onChange={(e) => handleDisplayDateChange('startDate', e.target.value)}
                placeholder="DD/MM/YYYY"
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 pr-10"
              />
              <input
                type="date"
                ref={startDateRef}
                value={dateRange.startDate}
                onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                aria-hidden="true"
              />
              <button
                type="button"
                onClick={() => startDateRef.current.showPicker()}
                className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-auto"
              >
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">วันที่สิ้นสุด:</label>
            <div className="relative">
              <input
                type="text"
                value={formatDateToDDMMYYYY(dateRange.endDate)}
                onChange={(e) => handleDisplayDateChange('endDate', e.target.value)}
                placeholder="DD/MM/YYYY"
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 pr-10"
              />
              <input
                type="date"
                ref={endDateRef}
                value={dateRange.endDate}
                onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                aria-hidden="true"
              />
              <button
                type="button"
                onClick={() => endDateRef.current.showPicker()}
                className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-auto"
              >
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
              </button>
            </div>
          </div>
          <button
            onClick={fetchReports}
            className="mt-6 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
          >
            🔄 รีเฟรช
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 text-blue-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">การจองทั้งหมด</p>
              <p className="text-2xl font-bold text-gray-900">{reports.totalBookings}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">อนุมัติแล้ว</p>
              <p className="text-2xl font-bold text-gray-900">{reports.approvedBookings}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">รออนุมัติ</p>
              <p className="text-2xl font-bold text-gray-900">{reports.pendingBookings}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-red-100 text-red-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">ปฏิเสธ</p>
              <p className="text-2xl font-bold text-gray-900">{reports.rejectedBookings}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100 text-purple-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">ห้องทั้งหมด</p>
              <p className="text-2xl font-bold text-gray-900">{reports.totalRooms}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-indigo-100 text-indigo-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">ผู้ใช้งาน</p>
              <p className="text-2xl font-bold text-gray-900">{reports.totalUsers}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Bookings */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">📋 การจองล่าสุด</h2>
        {reports.recentBookings.length > 0 ? (
          <div className="space-y-4">
            {reports.recentBookings.map((booking) => (
              <div key={booking.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">{booking.room?.name || 'ไม่ระบุห้อง'}</h3>
                    <p className="text-sm text-gray-600">โดย: {booking.user?.name || 'ไม่ระบุ'}</p>
                    <p className="text-sm text-gray-500">
                      {formatDateToThai(booking.start_time)} - {formatDateToThai(booking.end_time)}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    booking.status === 'approved' ? 'bg-green-100 text-green-800' :
                    booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {booking.status === 'approved' ? 'อนุมัติแล้ว' :
                     booking.status === 'pending' ? 'รออนุมัติ' : 'ปฏิเสธ'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">ไม่มีการจอง</h3>
            <p className="text-gray-600">ยังไม่มีการจองในระบบ</p>
          </div>
        )}
      </div>
    </div>
  )
}
