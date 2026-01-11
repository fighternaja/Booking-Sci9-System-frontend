'use client'

import { useEffect, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
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
    monthlyStats: [],
    roomUtilization: [],
    userActivity: [],
    bookingTrends: []
  })
  const [loading, setLoading] = useState(true)
  const [exportLoading, setExportLoading] = useState(false)
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

  const fetchRooms = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/rooms', { 
        headers: { 'Accept': 'application/json' } 
      })
      if (response.ok) {
        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json()
          return data.success ? data.data : []
        } else {
          const text = await response.text()
          console.error('Non-JSON response:', text)
          return []
        }
      }
    } catch (error) {
      console.error('Error fetching rooms:', error)
    }
    return []
  }

  const fetchReports = async () => {
    try {
      setLoading(true)
      
      // Prefer admin dashboard for accurate, authorized stats
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
              const d = dashboardData.data
              const rooms = await fetchRooms()
              const bookings = Array.isArray(d.recent_bookings) ? d.recent_bookings : []
              
              setReports(prev => ({
                ...prev,
                totalBookings: d.total_bookings ?? 0,
                approvedBookings: d.approved_bookings ?? 0,
                pendingBookings: d.pending_bookings ?? 0,
                rejectedBookings: d.rejected_bookings ?? 0,
                totalRooms: d.total_rooms ?? 0,
                totalUsers: d.total_users ?? 0,
                recentBookings: bookings.slice(0, 10),
                roomUtilization: calculateRoomUtilization(bookings, rooms),
                userActivity: calculateUserActivity(bookings),
                bookingTrends: calculateBookingTrends(bookings)
              }))
              return
            }
          }
        } catch (error) {
          console.log('Dashboard API not available, falling back to public stats')
        }
      }

      // Fallback: public endpoints when token not available
      const [roomsResponse, bookingsResponse] = await Promise.all([
        fetch('http://127.0.0.1:8000/api/rooms', { headers: { 'Accept': 'application/json' } }),
        fetch('http://127.0.0.1:8000/api/bookings', { headers: { 'Accept': 'application/json' } })
      ])

      let rooms = []
      let bookings = []

      if (roomsResponse.ok) {
        const roomsData = await roomsResponse.json()
        if (roomsData.success) {
          rooms = roomsData.data
        }
      }

      if (bookingsResponse.ok) {
        const bookingsData = await bookingsResponse.json()
        if (bookingsData.success) {
          bookings = bookingsData.data
        }
      }
      
      setReports(prev => ({
        ...prev,
        totalRooms: rooms.length,
        totalBookings: bookings.length,
        approvedBookings: bookings.filter(b => b.status === 'approved').length,
        pendingBookings: bookings.filter(b => b.status === 'pending').length,
        rejectedBookings: bookings.filter(b => b.status === 'rejected').length,
        recentBookings: bookings.slice(0, 10),
        roomUtilization: calculateRoomUtilization(bookings, rooms),
        userActivity: calculateUserActivity(bookings),
        bookingTrends: calculateBookingTrends(bookings)
      }))

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

  // Analytics functions
  const calculateRoomUtilization = (bookings, rooms) => {
    if (!Array.isArray(rooms) || rooms.length === 0) return []
    
    const utilization = rooms.map(room => {
      const roomBookings = bookings.filter(booking => booking.room_id === room.id)
      const totalHours = roomBookings.reduce((total, booking) => {
        try {
          const start = new Date(booking.start_time)
          const end = new Date(booking.end_time)
          if (isNaN(start.getTime()) || isNaN(end.getTime())) return total
          return total + (end - start) / (1000 * 60 * 60) // Convert to hours
        } catch (error) {
          console.error('Error calculating booking hours:', error)
          return total
        }
      }, 0)
      
      return {
        roomName: room.name || 'ไม่ระบุ',
        totalBookings: roomBookings.length,
        totalHours: Math.round(totalHours * 100) / 100,
        utilizationRate: Math.min(Math.round((totalHours / (7 * 13)) * 100), 100) // Cap at 100%
      }
    })
    
    return utilization.sort((a, b) => b.totalHours - a.totalHours)
  }

  const calculateUserActivity = (bookings) => {
    if (!Array.isArray(bookings)) return []
    
    const userStats = {}
    bookings.forEach(booking => {
      const userId = booking.user_id || booking.user?.id
      if (!userId) return
      
      if (!userStats[userId]) {
        userStats[userId] = {
          userName: booking.user?.name || 'ไม่ระบุ',
          totalBookings: 0,
          approvedBookings: 0,
          pendingBookings: 0,
          rejectedBookings: 0
        }
      }
      userStats[userId].totalBookings++
      const statusKey = `${booking.status}Bookings`
      if (userStats[userId].hasOwnProperty(statusKey)) {
        userStats[userId][statusKey]++
      }
    })
    
    return Object.values(userStats).sort((a, b) => b.totalBookings - a.totalBookings)
  }

  const calculateBookingTrends = (bookings) => {
    if (!Array.isArray(bookings)) return []
    
    const trends = {}
    bookings.forEach(booking => {
      try {
        const bookingDate = new Date(booking.start_time)
        if (isNaN(bookingDate.getTime())) return
        
        const date = bookingDate.toISOString().split('T')[0]
        if (!trends[date]) {
          trends[date] = { date, total: 0, approved: 0, pending: 0, rejected: 0 }
        }
        trends[date].total++
        
        const status = booking.status || 'pending'
        if (trends[date].hasOwnProperty(status)) {
          trends[date][status]++
        }
      } catch (error) {
        console.error('Error processing booking trend:', error)
      }
    })
    
    return Object.values(trends).sort((a, b) => new Date(a.date) - new Date(b.date))
  }

  // Export functions
  const exportToExcel = async () => {
    setExportLoading(true)
    try {
      const workbook = XLSX.utils.book_new()
      
      // Summary sheet
      const summaryData = [
        ['รายงานสถิติการใช้งานระบบจองห้อง'],
        [`วันที่: ${formatDateToThai(new Date().toISOString())}`],
        [`ช่วงวันที่: ${formatDateToDDMMYYYY(dateRange.startDate)} - ${formatDateToDDMMYYYY(dateRange.endDate)}`],
        [''],
        ['สถิติโดยรวม'],
        ['การจองทั้งหมด', reports.totalBookings || 0],
        ['อนุมัติแล้ว', reports.approvedBookings || 0],
        ['รออนุมัติ', reports.pendingBookings || 0],
        ['ปฏิเสธ', reports.rejectedBookings || 0],
        ['ห้องทั้งหมด', reports.totalRooms || 0],
        ['ผู้ใช้งาน', reports.totalUsers || 0]
      ]
      
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'สรุป')
      
      // Bookings sheet
      if (reports.recentBookings && reports.recentBookings.length > 0) {
        const bookingData = [
          ['ห้อง', 'ผู้จอง', 'วันที่เริ่มต้น', 'วันที่สิ้นสุด', 'สถานะ', 'วัตถุประสงค์']
        ]
        
        reports.recentBookings.forEach(booking => {
          try {
            bookingData.push([
              booking.room?.name || 'ไม่ระบุ',
              booking.user?.name || 'ไม่ระบุ',
              formatDateToThai(booking.start_time),
              formatDateToThai(booking.end_time),
              booking.status === 'approved' ? 'อนุมัติแล้ว' : 
              booking.status === 'pending' ? 'รออนุมัติ' : 'ปฏิเสธ',
              booking.purpose || 'ไม่ระบุ'
            ])
          } catch (error) {
            console.error('Error processing booking for export:', error)
          }
        })
        
        const bookingSheet = XLSX.utils.aoa_to_sheet(bookingData)
        XLSX.utils.book_append_sheet(workbook, bookingSheet, 'การจอง')
      }
      
      // Room utilization sheet
      if (reports.roomUtilization && reports.roomUtilization.length > 0) {
        const utilizationData = [
          ['ห้อง', 'จำนวนการจอง', 'ชั่วโมงรวม', 'อัตราการใช้งาน (%)']
        ]
        
        reports.roomUtilization.forEach(room => {
          utilizationData.push([
            room.roomName || 'ไม่ระบุ',
            room.totalBookings || 0,
            room.totalHours || 0,
            room.utilizationRate || 0
          ])
        })
        
        const utilizationSheet = XLSX.utils.aoa_to_sheet(utilizationData)
        XLSX.utils.book_append_sheet(workbook, utilizationSheet, 'การใช้งานห้อง')
      }
      
      // Booking trends sheet
      if (reports.bookingTrends && reports.bookingTrends.length > 0) {
        const trendsData = [
          ['วันที่', 'รวม', 'อนุมัติ', 'รออนุมัติ', 'ปฏิเสธ', 'อัตราการอนุมัติ (%)']
        ]
        
        reports.bookingTrends.forEach(trend => {
          const approvalRate = trend.total > 0 ? Math.round((trend.approved / trend.total) * 100) : 0
          trendsData.push([
            formatDateToThai(trend.date),
            trend.total || 0,
            trend.approved || 0,
            trend.pending || 0,
            trend.rejected || 0,
            approvalRate
          ])
        })
        
        const trendsSheet = XLSX.utils.aoa_to_sheet(trendsData)
        XLSX.utils.book_append_sheet(workbook, trendsSheet, 'แนวโน้มการจอง')
      }
      
      XLSX.writeFile(workbook, `รายงานการจองห้อง_${new Date().toISOString().split('T')[0]}.xlsx`)
    } catch (error) {
      console.error('Error exporting to Excel:', error)
      alert('เกิดข้อผิดพลาดในการส่งออกไฟล์ Excel')
    } finally {
      setExportLoading(false)
    }
  }

  const exportToPDF = () => {
    // Simple PDF export using browser print
    window.print()
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
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">วันที่เริ่มต้น:</label>
            <div className="relative">
              <input
                type="text"
                value={formatDateToDDMMYYYY(dateRange.startDate)}
                onChange={(e) => handleDisplayDateChange('startDate', e.target.value)}
                placeholder="DD/MM/YYYY"
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 pr-10 w-full"
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
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 pr-10 w-full"
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
        </div>
        
        <div className="flex items-center space-x-4 mb-6">
          <button
            onClick={fetchReports}
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg transform hover:scale-105"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            รีเฟรช
          </button>
          <button
            onClick={exportToExcel}
            disabled={exportLoading}
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg transform hover:scale-105 disabled:transform-none"
          >
            {exportLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                กำลังส่งออก...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                ส่งออก Excel
              </>
            )}
          </button>
          <button
            onClick={exportToPDF}
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg transform hover:scale-105"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            ส่งออก PDF
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

      {/* Room Utilization Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">🏢 การใช้งานห้อง</h2>
          {reports.roomUtilization.length > 0 ? (
            <div className="space-y-4">
              {reports.roomUtilization.slice(0, 5).map((room, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-900">{room.roomName}</h3>
                    <span className="text-sm text-gray-600">{room.utilizationRate}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(room.utilizationRate, 100)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600 mt-2">
                    <span>การจอง: {room.totalBookings}</span>
                    <span>ชั่วโมง: {room.totalHours}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600">ไม่มีข้อมูลการใช้งานห้อง</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">👥 กิจกรรมผู้ใช้</h2>
          {reports.userActivity.length > 0 ? (
            <div className="space-y-4">
              {reports.userActivity.slice(0, 5).map((user, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-900">{user.userName}</h3>
                    <span className="text-sm text-gray-600">{user.totalBookings} การจอง</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="text-center">
                      <div className="text-green-600 font-semibold">{user.approvedBookings}</div>
                      <div className="text-gray-500">อนุมัติ</div>
                    </div>
                    <div className="text-center">
                      <div className="text-yellow-600 font-semibold">{user.pendingBookings}</div>
                      <div className="text-gray-500">รออนุมัติ</div>
                    </div>
                    <div className="text-center">
                      <div className="text-red-600 font-semibold">{user.rejectedBookings}</div>
                      <div className="text-gray-500">ปฏิเสธ</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600">ไม่มีข้อมูลกิจกรรมผู้ใช้</p>
            </div>
          )}
        </div>
      </div>

      {/* Daily Booking Statistics Chart */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">📊 สถิติการจองรายวัน</h2>
        {reports.bookingTrends.length > 0 ? (
          <div>
            {/* Daily Statistics Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-blue-600">การจองเฉลี่ยต่อวัน</p>
                    <p className="text-2xl font-bold text-blue-900">
                      {reports.bookingTrends.length > 0 
                        ? Math.round(reports.bookingTrends.reduce((sum, trend) => sum + (trend.total || 0), 0) / reports.bookingTrends.length)
                        : 0
                      }
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-green-600">อัตราการอนุมัติ</p>
                    <p className="text-2xl font-bold text-green-900">
                      {(() => {
                        const totalBookings = reports.bookingTrends.reduce((sum, trend) => sum + (trend.total || 0), 0)
                        const totalApproved = reports.bookingTrends.reduce((sum, trend) => sum + (trend.approved || 0), 0)
                        return totalBookings > 0 ? Math.round((totalApproved / totalBookings) * 100) : 0
                      })()}%
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-orange-50 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-orange-600">วันที่มีการจองมากที่สุด</p>
                    <p className="text-lg font-bold text-orange-900">
                      {reports.bookingTrends.length > 0 
                        ? Math.max(...reports.bookingTrends.map(t => t.total || 0))
                        : 0
                      } การจอง
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Interactive Chart */}
            <div className="mb-6">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">กราฟแสดงแนวโน้มการจอง 7 วันล่าสุด</h3>
                <div className="flex items-end justify-between h-80 space-x-1">
                  {reports.bookingTrends.slice(0, 7).map((trend, index) => {
                    const trendTotal = trend.total || 0
                    const trendApproved = trend.approved || 0
                    const trendPending = trend.pending || 0
                    const trendRejected = trend.rejected || 0
                    
                    const maxTotal = Math.max(...reports.bookingTrends.slice(0, 7).map(t => t.total || 0))
                    const height = maxTotal > 0 ? (trendTotal / maxTotal) * 280 : 0
                    const isToday = new Date(trend.date).toDateString() === new Date().toDateString()
                    
                    return (
                      <div key={index} className="flex flex-col items-center flex-1 group">
                        <div className="relative w-full flex flex-col items-center">
                          {/* Main Bar */}
                          <div className="w-full max-w-16 h-80 flex flex-col justify-end">
                            <div className="w-full flex flex-col space-y-0.5">
                              {trendApproved > 0 && trendTotal > 0 && (
                                <div 
                                  className="bg-gradient-to-t from-green-600 to-green-400 rounded-t-lg transition-all duration-300 hover:from-green-700 hover:to-green-500 cursor-pointer"
                                  style={{ height: `${(trendApproved / trendTotal) * height}px` }}
                                  title={`อนุมัติแล้ว: ${trendApproved} การจอง`}
                                ></div>
                              )}
                              {trendPending > 0 && trendTotal > 0 && (
                                <div 
                                  className="bg-gradient-to-t from-yellow-500 to-yellow-300 transition-all duration-300 hover:from-yellow-600 hover:to-yellow-400 cursor-pointer"
                                  style={{ height: `${(trendPending / trendTotal) * height}px` }}
                                  title={`รออนุมัติ: ${trendPending} การจอง`}
                                ></div>
                              )}
                              {trendRejected > 0 && trendTotal > 0 && (
                                <div 
                                  className="bg-gradient-to-t from-red-600 to-red-400 rounded-b-lg transition-all duration-300 hover:from-red-700 hover:to-red-500 cursor-pointer"
                                  style={{ height: `${(trendRejected / trendTotal) * height}px` }}
                                  title={`ปฏิเสธ: ${trendRejected} การจอง`}
                                ></div>
                              )}
                              {trendTotal === 0 && (
                                <div 
                                  className="bg-gray-200 rounded transition-all duration-300 hover:bg-gray-300 cursor-pointer"
                                  style={{ height: '20px' }}
                                  title="ไม่มีข้อมูลการจอง"
                                ></div>
                              )}
                            </div>
                          </div>
                          
                          {/* Day Info */}
                          <div className="mt-3 text-center">
                            <div className={`text-lg font-bold ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>
                              {trendTotal}
                            </div>
                            <div className={`text-xs ${isToday ? 'text-blue-500 font-medium' : 'text-gray-500'}`}>
                              {new Date(trend.date).toLocaleDateString('th-TH', { 
                                weekday: 'short',
                                day: '2-digit', 
                                month: '2-digit' 
                              })}
                            </div>
                            {isToday && (
                              <div className="text-xs text-blue-500 font-medium">วันนี้</div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
              
              {/* Chart Legend */}
              <div className="flex justify-center space-x-8 mt-6">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-gradient-to-r from-green-600 to-green-400 rounded"></div>
                  <span className="text-sm font-medium text-gray-700">อนุมัติแล้ว</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-gradient-to-r from-yellow-500 to-yellow-300 rounded"></div>
                  <span className="text-sm font-medium text-gray-700">รออนุมัติ</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-gradient-to-r from-red-600 to-red-400 rounded"></div>
                  <span className="text-sm font-medium text-gray-700">ปฏิเสธ</span>
                </div>
              </div>
            </div>

            {/* Daily Breakdown Table */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">รายละเอียดสถิติรายวัน</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">วันที่</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">รวม</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">อนุมัติ</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">รออนุมัติ</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">ปฏิเสธ</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">อัตรา</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reports.bookingTrends.slice(0, 7).map((trend, index) => {
                      const approvalRate = trend.total > 0 ? Math.round((trend.approved / trend.total) * 100) : 0
                      const isToday = new Date(trend.date).toDateString() === new Date().toDateString()
                      
                      return (
                        <tr key={index} className={isToday ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="text-sm font-medium text-gray-900">
                                {formatDateToThai(trend.date)}
                              </div>
                              {isToday && (
                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                  วันนี้
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            <span className="text-sm font-semibold text-gray-900">{trend.total}</span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            <span className="text-sm font-semibold text-green-600">{trend.approved}</span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            <span className="text-sm font-semibold text-yellow-600">{trend.pending}</span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            <span className="text-sm font-semibold text-red-600">{trend.rejected}</span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            <span className={`text-sm font-semibold ${
                              approvalRate >= 80 ? 'text-green-600' : 
                              approvalRate >= 60 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {approvalRate}%
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <svg className="w-20 h-20 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">ไม่มีข้อมูลสถิติการจอง</h3>
            <p className="text-gray-600">ยังไม่มีข้อมูลการจองในช่วงเวลาที่เลือก</p>
          </div>
        )}
      </div>

    </div>
  )
}
