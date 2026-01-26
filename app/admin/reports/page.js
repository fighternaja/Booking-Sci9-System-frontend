'use client'

import { useEffect, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { useAuth } from '../../contexts/AuthContext'

import DashboardCharts from '../components/DashboardCharts'

export default function AdminReportsPage() {

  const [reports, setReports] = useState({
    totalBookings: 0,
    approvedBookings: 0,
    pendingBookings: 0,
    rejectedBookings: 0,
    cancelledBookings: 0,
    totalRooms: 0,
    totalUsers: 0,
    allBookings: [],
    popularRooms: [],
    topUsers: [],
    peakHours: [],
    demandByDay: [],
    statusDistribution: [],
    trendData: [],
    heatMap: { data: [], hours: [] }
  })
  const [loading, setLoading] = useState(true)
  const [exportLoading, setExportLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const { token } = useAuth()

  useEffect(() => {
    if (token) {
      fetchReports()
    }
  }, [token])

  const fetchReports = async () => {
    try {
      setLoading(true)

      // Fetch dashboard stats
      const dashboardResponse = await fetch('http://127.0.0.1:8000/api/admin/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      })

      let dashboardStats = {}
      if (dashboardResponse.ok) {
        const dashboardData = await dashboardResponse.json()
        if (dashboardData.success) {
          dashboardStats = dashboardData.data
        }
      }

      // Fetch all bookings
      const bookingsResponse = await fetch('http://127.0.0.1:8000/api/bookings', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      })

      let allBookings = []
      if (bookingsResponse.ok) {
        const bookingsData = await bookingsResponse.json()
        if (bookingsData.success) {
          allBookings = bookingsData.data
        }
      }

      // Calculate analytics
      const popularRooms = calculatePopularRooms(allBookings)
      const topUsers = calculateTopUsers(allBookings)
      const peakHours = calculatePeakHours(allBookings)
      const demandByDay = calculateDemandByDay(allBookings)
      const statusDist = calculateStatusDistribution(allBookings)
      const trendData = calculateTrendData(allBookings)
      const heatMap = calculateHeatMap(allBookings)

      setReports({
        totalBookings: dashboardStats.total_bookings || 0,
        approvedBookings: dashboardStats.approved_bookings || 0,
        pendingBookings: dashboardStats.pending_bookings || 0,
        rejectedBookings: dashboardStats.rejected_bookings || 0,
        cancelledBookings: allBookings.filter(b => b.status === 'cancelled').length,
        totalRooms: dashboardStats.total_rooms || 0,
        totalUsers: dashboardStats.total_users || 0,
        allBookings,
        popularRooms,
        topUsers,
        peakHours,
        demandByDay,
        statusDistribution: statusDist
      })
    } catch (error) {
      console.error('Error fetching reports:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculatePopularRooms = (bookings) => {
    const roomCounts = {}
    bookings.forEach(b => {
      if (b.room && b.room.name) {
        roomCounts[b.room.name] = (roomCounts[b.room.name] || 0) + 1
      }
    })
    return Object.entries(roomCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }

  const calculateTopUsers = (bookings) => {
    const userCounts = {}
    bookings.forEach(b => {
      if (b.user && b.user.name) {
        userCounts[b.user.name] = (userCounts[b.user.name] || 0) + 1
      }
    })
    return Object.entries(userCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }

  const calculatePeakHours = (bookings) => {
    const hourCounts = Array(24).fill(0)
    bookings.forEach(b => {
      if (b.start_time) {
        const hour = new Date(b.start_time).getHours()
        hourCounts[hour]++
      }
    })
    const maxCount = Math.max(...hourCounts)
    return hourCounts.map((count, hour) => ({
      hour,
      label: `${String(hour).padStart(2, '0')}:00`,
      count,
      percentage: maxCount > 0 ? (count / maxCount) * 100 : 0
    })).filter(h => h.hour >= 6 && h.hour <= 20)
  }

  const calculateDemandByDay = (bookings) => {
    const dayNames = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์']
    const dayCounts = Array(7).fill(0)
    bookings.forEach(b => {
      if (b.start_time) {
        const day = new Date(b.start_time).getDay()
        dayCounts[day]++
      }
    })
    const maxCount = Math.max(...dayCounts)
    return dayCounts.map((count, index) => ({
      day: dayNames[index],
      count,
      percentage: maxCount > 0 ? (count / maxCount) * 100 : 0
    }))
  }

  const calculateStatusDistribution = (bookings) => {
    const statusCounts = { approved: 0, pending: 0, rejected: 0, cancelled: 0 }
    bookings.forEach(b => {
      if (statusCounts.hasOwnProperty(b.status)) {
        statusCounts[b.status]++
      }
    })
    const total = bookings.length || 1
    return [
      { status: 'อนุมัติ', count: statusCounts.approved, color: 'from-green-500 to-green-600', percentage: ((statusCounts.approved / total) * 100).toFixed(1) },
      { status: 'รออนุมัติ', count: statusCounts.pending, color: 'from-yellow-500 to-yellow-600', percentage: ((statusCounts.pending / total) * 100).toFixed(1) },
      { status: 'ปฏิเสธ', count: statusCounts.rejected, color: 'from-red-500 to-red-600', percentage: ((statusCounts.rejected / total) * 100).toFixed(1) },
      { status: 'ยกเลิก', count: statusCounts.cancelled, color: 'from-gray-500 to-gray-600', percentage: ((statusCounts.cancelled / total) * 100).toFixed(1) }
    ]
  }

  // Advanced Analytics: Trend Analysis (Last 30 days)
  const calculateTrendData = (bookings) => {
    const last30Days = []
    const today = new Date()

    for (let i = 29; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)

      const nextDate = new Date(date)
      nextDate.setDate(nextDate.getDate() + 1)

      const count = bookings.filter(b => {
        const bookingDate = new Date(b.start_time)
        return bookingDate >= date && bookingDate < nextDate
      }).length

      last30Days.push({
        date: date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }),
        count
      })
    }

    return last30Days
  }

  // Advanced Analytics: Heat Map (Day x Hour)
  const calculateHeatMap = (bookings) => {
    const dayNames = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']
    const hours = Array.from({ length: 15 }, (_, i) => i + 6) // 6:00 - 20:00

    const heatMapData = dayNames.map((day, dayIndex) => {
      const hourData = hours.map(hour => {
        const count = bookings.filter(b => {
          const date = new Date(b.start_time)
          return date.getDay() === dayIndex && date.getHours() === hour
        }).length
        return count
      })
      return { day, hours: hourData }
    })

    return { data: heatMapData, hours }
  }

  const exportToExcel = async () => {
    setExportLoading(true)
    try {
      const workbook = XLSX.utils.book_new()

      // Summary sheet
      const summaryData = [
        { 'รายการ': 'การจองทั้งหมด', 'จำนวน': reports.totalBookings },
        { 'รายการ': 'อนุมัติแล้ว', 'จำนวน': reports.approvedBookings },
        { 'รายการ': 'รออนุมัติ', 'จำนวน': reports.pendingBookings },
        { 'รายการ': 'ปฏิเสธ', 'จำนวน': reports.rejectedBookings },
        { 'รายการ': 'ยกเลิก', 'จำนวน': reports.cancelledBookings }
      ]
      const summarySheet = XLSX.utils.json_to_sheet(summaryData)
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'สรุปรายงาน')

      // Popular rooms sheet
      if (reports.popularRooms.length > 0) {
        const roomsData = reports.popularRooms.map((r, i) => ({
          'อันดับ': i + 1,
          'ห้อง': r.name,
          'จำนวนการจอง': r.count
        }))
        const roomsSheet = XLSX.utils.json_to_sheet(roomsData)
        XLSX.utils.book_append_sheet(workbook, roomsSheet, 'ห้องยอดนิยม')
      }

      // Top users sheet
      if (reports.topUsers.length > 0) {
        const usersData = reports.topUsers.map((u, i) => ({
          'อันดับ': i + 1,
          'ผู้ใช้': u.name,
          'จำนวนการจอง': u.count
        }))
        const usersSheet = XLSX.utils.json_to_sheet(usersData)
        XLSX.utils.book_append_sheet(workbook, usersSheet, 'ผู้ใช้งานบ่อย')
      }

      // All bookings sheet
      if (filteredBookings.length > 0) {
        const bookingsData = filteredBookings.map(b => {
          const startDate = new Date(b.start_time)
          const endDate = new Date(b.end_time)

          return {
            'ชื่อผู้ใช้': b.user?.name || '-',
            'ห้อง': b.room?.name || '-',
            'วันที่เริ่มต้น': startDate.toLocaleDateString('th-TH', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }),
            'วันที่สิ้นสุด': endDate.toLocaleDateString('th-TH', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }),
            'เวลาที่จอง': `${startDate.toLocaleTimeString('th-TH', {
              hour: '2-digit',
              minute: '2-digit'
            })} - ${endDate.toLocaleTimeString('th-TH', {
              hour: '2-digit',
              minute: '2-digit'
            })}`,
            'หมายเหตุ': b.purpose || '-'
          }
        })
        const bookingsSheet = XLSX.utils.json_to_sheet(bookingsData)

        // Set column widths for better readability
        bookingsSheet['!cols'] = [
          { wch: 20 }, // ชื่อผู้ใช้
          { wch: 25 }, // ห้อง
          { wch: 25 }, // วันที่เริ่มต้น
          { wch: 25 }, // วันที่สิ้นสุด
          { wch: 20 }, // เวลาที่จอง
          { wch: 40 }  // หมายเหตุ
        ]

        XLSX.utils.book_append_sheet(workbook, bookingsSheet, 'รายการจอง')
      }

      XLSX.writeFile(workbook, `รายงานการจอง_${new Date().toISOString().split('T')[0]}.xlsx`)
    } catch (error) {
      console.error('Error exporting:', error)
      alert('เกิดข้อผิดพลาดในการส่งออกไฟล์')
    } finally {
      setExportLoading(false)
    }
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

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
      approved: 'bg-green-100 text-green-700 border border-green-200',
      rejected: 'bg-red-100 text-red-700 border border-red-200',
      cancelled: 'bg-gray-100 text-gray-700 border border-gray-200'
    }
    return badges[status] || 'bg-gray-100 text-gray-700'
  }

  const filteredBookings = reports.allBookings.filter(booking => {
    const matchesSearch = searchTerm === '' ||
      booking.user?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.room?.name.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'all' || booking.status === statusFilter

    return matchesSearch && matchesStatus
  })

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
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
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">📊 รายงานการจองห้อง</h1>
        <p className="text-gray-600 mb-6">รายงานและการวิเคราะห์ข้อมูลการจองห้องแบบครบถ้วน</p>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ค้นหาชื่อผู้จอง หรือห้อง..."
                className="w-80 px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">ทุกสถานะ</option>
              <option value="approved">อนุมัติแล้ว</option>
              <option value="pending">รออนุมัติ</option>
              <option value="rejected">ปฏิเสธ</option>
              <option value="cancelled">ยกเลิก</option>
            </select>
          </div>

          <button
            onClick={exportToExcel}
            disabled={exportLoading}
            className="inline-flex items-center px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
          >
            {exportLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                กำลังส่งออก...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                ส่งออก Excel
              </>
            )}
          </button>
        </div>
      </div>

      {/* Charts Section */}
      <DashboardCharts token={token} />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">📅</span>
            <span className="text-3xl font-bold">{reports.totalBookings}</span>
          </div>
          <p className="text-blue-100 text-sm">การจองทั้งหมด</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">✅</span>
            <span className="text-3xl font-bold">{reports.approvedBookings}</span>
          </div>
          <p className="text-green-100 text-sm">อนุมัติแล้ว</p>
        </div>

        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">⏳</span>
            <span className="text-3xl font-bold">{reports.pendingBookings}</span>
          </div>
          <p className="text-yellow-100 text-sm">รออนุมัติ</p>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">❌</span>
            <span className="text-3xl font-bold">{reports.rejectedBookings}</span>
          </div>
          <p className="text-red-100 text-sm">ปฏิเสธ</p>
        </div>

        <div className="bg-gradient-to-br from-gray-500 to-gray-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">🚫</span>
            <span className="text-3xl font-bold">{reports.cancelledBookings}</span>
          </div>
          <p className="text-gray-100 text-sm">ยกเลิก</p>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-8">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 flex items-center">
            <span className="text-2xl mr-2">📋</span>
            รายการจองทั้งหมด ({filteredBookings.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          {filteredBookings.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              ไม่พบข้อมูลการจอง
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">ห้อง</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">ผู้จอง</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">วันที่</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">เวลา</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredBookings.slice(0, 50).map((booking) => (
                  <tr key={booking.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{booking.room?.name || '-'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold mr-2">
                          {booking.user?.name?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <span className="text-sm text-gray-900">{booking.user?.name || '-'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(booking.start_time).toLocaleDateString('th-TH')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(booking.start_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} - {new Date(booking.end_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(booking.status)}`}>
                        {getStatusText(booking.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {filteredBookings.length > 50 && (
          <div className="p-4 border-t border-gray-100 text-center text-sm text-gray-500">
            แสดง 50 รายการแรก จากทั้งหมด {filteredBookings.length} รายการ
          </div>
        )}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Popular Rooms */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
            <span className="text-2xl mr-2">🏆</span>
            ห้องที่ได้รับความนิยมสูงสุด
          </h3>
          {reports.popularRooms.length > 0 ? (
            <div className="space-y-3">
              {reports.popularRooms.map((room, index) => (
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
          {reports.topUsers.length > 0 ? (
            <div className="space-y-3">
              {reports.topUsers.map((user, index) => (
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

      {/* Peak Hours Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
        <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
          <span className="text-2xl mr-2">⏰</span>
          ช่วงเวลาที่มีการจองมากที่สุด
        </h3>
        <div className="space-y-2">
          {reports.peakHours.map((hour, index) => (
            <div key={index} className="flex items-center">
              <div className="w-16 text-sm font-medium text-gray-700">{hour.label}</div>
              <div className="flex-1 mx-3">
                <div className="w-full bg-gray-200 rounded-full h-8 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-indigo-500 h-8 rounded-full flex items-center justify-end pr-2 transition-all duration-500"
                    style={{ width: `${hour.percentage}%` }}
                  >
                    {hour.count > 0 && (
                      <span className="text-xs font-bold text-white">{hour.count}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="w-12 text-right text-sm font-semibold text-gray-600">
                {hour.count}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Demand by Day */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
        <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
          <span className="text-2xl mr-2">📅</span>
          ความต้องการตามวันในสัปดาห์
        </h3>
        <div className="space-y-4">
          {reports.demandByDay.map((day, index) => (
            <div key={index}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">{day.day}</span>
                <span className="text-sm font-bold text-green-600">{day.count} การจอง</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${day.percentage}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

