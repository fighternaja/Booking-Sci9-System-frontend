'use client'

import { useEffect, useState } from 'react'
import * as XLSX from 'xlsx'
import { useAuth } from '../../contexts/AuthContext'
import AdminHeader from '../components/AdminHeader'
import AdminCard from '../components/AdminCard'
import AdminButton from '../components/AdminButton'
import StatCard from '../components/StatCard'
import DashboardCharts from '../components/DashboardCharts'
import { API_URL, getStorageUrl } from '../../lib/api'

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
      const dashboardResponse = await fetch(`${API_URL}/api/admin/dashboard`, {
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
      const bookingsResponse = await fetch(`${API_URL}/api/bookings`, {
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
    const roomImages = {}
    bookings.forEach(b => {
      if (b.room && b.room.name) {
        roomCounts[b.room.name] = (roomCounts[b.room.name] || 0) + 1
        if (b.room.image) roomImages[b.room.name] = b.room.image
      }
    })
    return Object.entries(roomCounts)
      .map(([name, count]) => ({ name, count, image: roomImages[name] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }

  const calculateTopUsers = (bookings) => {
    const userCounts = {}
    const userImages = {}
    bookings.forEach(b => {
      if (b.user && b.user.name) {
        userCounts[b.user.name] = (userCounts[b.user.name] || 0) + 1
        if (b.user.profile_picture) userImages[b.user.name] = b.user.profile_picture
      }
    })
    return Object.entries(userCounts)
      .map(([name, count]) => ({ name, count, image: userImages[name] }))
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
      { status: 'อนุมัติ', count: statusCounts.approved, color: 'green', percentage: ((statusCounts.approved / total) * 100).toFixed(1) },
      { status: 'รออนุมัติ', count: statusCounts.pending, color: 'orange', percentage: ((statusCounts.pending / total) * 100).toFixed(1) },
      { status: 'ปฏิเสธ', count: statusCounts.rejected, color: 'red', percentage: ((statusCounts.rejected / total) * 100).toFixed(1) },
      { status: 'ยกเลิก', count: statusCounts.cancelled, color: 'gray', percentage: ((statusCounts.cancelled / total) * 100).toFixed(1) }
    ]
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
      pending: 'bg-yellow-50 text-yellow-700 border-yellow-100',
      approved: 'bg-green-50 text-green-700 border-green-100',
      rejected: 'bg-red-50 text-red-700 border-red-100',
      cancelled: 'bg-gray-50 text-gray-700 border-gray-100'
    }
    return badges[status] || 'bg-gray-50 text-gray-700 border-gray-100'
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
      <div className="space-y-8">
        <div className="h-10 bg-gray-100 rounded-xl animate-pulse w-1/3"></div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-32 bg-gray-100 rounded-2xl animate-pulse"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <AdminHeader
        title="รายงานการจองห้อง"
        subtitle="รายงานและการวิเคราะห์ข้อมูลการจองห้องแบบครบถ้วน"
        actions={
          <div className="flex items-center gap-3">
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ค้นหา..."
                className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm w-64"
              />
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm bg-white"
            >
              <option value="all">ทุกสถานะ</option>
              <option value="approved">อนุมัติแล้ว</option>
              <option value="pending">รออนุมัติ</option>
              <option value="rejected">ปฏิเสธ</option>
              <option value="cancelled">ยกเลิก</option>
            </select>
            <AdminButton
              onClick={exportToExcel}
              disabled={exportLoading}
              variant="secondary"
              icon={exportLoading ?
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                :
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              }
            >
              {exportLoading ? 'กำลังส่งออก...' : 'Export Excel'}
            </AdminButton>
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <StatCard label="การจองทั้งหมด" value={reports.totalBookings} icon="📅" color="blue" description="รายการทั้งหมดในระบบ" />
        <StatCard label="อนุมัติแล้ว" value={reports.approvedBookings} icon="✅" color="green" description="การจองที่ยืนยันแล้ว" />
        <StatCard label="รออนุมัติ" value={reports.pendingBookings} icon="⏳" color="orange" description="รอการตรวจสอบ" />
        <StatCard label="ปฏิเสธ" value={reports.rejectedBookings} icon="❌" color="red" description="ไม่อนุมัติการจอง" />
        <StatCard label="ยกเลิก" value={reports.cancelledBookings} icon="🚫" color="gray" description="ผู้ใช้ยกเลิก" />
      </div>

      {/* Charts Section */}
      <DashboardCharts token={token} />

      {/* Bookings Table */}
      <AdminCard title={`รายการจองทั้งหมด (${filteredBookings.length})`} icon="📋" noPadding className="overflow-hidden">
        <div className="overflow-x-auto">
          {filteredBookings.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              ไม่พบข้อมูลการจอง
            </div>
          ) : (
            <table className="min-w-full">
              <thead className="bg-gray-50/50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">ห้อง</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">ผู้จอง</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">วันที่</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">เวลา</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">สถานะ</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredBookings.slice(0, 50).map((booking) => (
                  <tr key={booking.id} className="hover:bg-blue-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-bold text-gray-900">
                      <div className="flex items-center gap-3">
                        {booking.room?.image && (
                          <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden flex-shrink-0">
                            <img
                              src={getStorageUrl(booking.room.image)}
                              alt={booking.room.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <span>{booking.room?.name || '-'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold mr-3 border border-blue-200 overflow-hidden">
                          {booking.user?.profile_picture ? (
                            <img
                              src={getStorageUrl(booking.user.profile_picture)}
                              alt={booking.user.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            booking.user?.name?.charAt(0).toUpperCase() || '?'
                          )}
                        </div>
                        <span className="text-sm text-gray-700 font-medium">{booking.user?.name || '-'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(booking.start_time).toLocaleDateString('th-TH')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 font-medium">
                      {new Date(booking.start_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} - {new Date(booking.end_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStatusBadge(booking.status)}`}>
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
          <div className="p-4 border-t border-gray-100 text-center text-sm text-gray-500 bg-gray-50/50">
            แสดง 50 รายการแรก จากทั้งหมด {filteredBookings.length} รายการ
          </div>
        )}
      </AdminCard>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Popular Rooms */}
        <AdminCard title="ห้องที่ได้รับความนิยมสูงสุด" icon="🏆">
          {reports.popularRooms.length > 0 ? (
            <div className="space-y-3">
              {reports.popularRooms.map((room, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-100 transition-all">
                  <div className="flex items-center">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold mr-4 ${index === 0 ? 'bg-yellow-100 text-yellow-700' :
                      index === 1 ? 'bg-gray-200 text-gray-700' :
                        index === 2 ? 'bg-orange-100 text-orange-700' :
                          'bg-white border border-gray-200 text-gray-500'
                      }`}>
                      {index + 1}
                    </div>
                    {room.image && (
                      <div className="w-8 h-8 rounded bg-gray-100 border border-gray-200 overflow-hidden flex-shrink-0 mr-3">
                        <img
                          src={getStorageUrl(room.image)}
                          alt={room.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <span className="font-medium text-gray-900">{room.name}</span>
                  </div>
                  <span className="text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">{room.count} ครั้ง</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-8">ยังไม่มีข้อมูล</p>
          )}
        </AdminCard>

        {/* Top Users */}
        <AdminCard title="ผู้ใช้งานที่จองบ่อยที่สุด" icon="👥">
          {reports.topUsers.length > 0 ? (
            <div className="space-y-3">
              {reports.topUsers.map((user, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-100 transition-all">
                  <div className="flex items-center">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold mr-4 ${index === 0 ? 'bg-yellow-100 text-yellow-700' :
                      index === 1 ? 'bg-gray-200 text-gray-700' :
                        index === 2 ? 'bg-orange-100 text-orange-700' :
                          'bg-white border border-gray-200 text-gray-500'
                      }`}>
                      {index + 1}
                    </div>
                    {user.image && (
                      <div className="w-8 h-8 rounded-full bg-gray-100 border border-gray-200 overflow-hidden flex-shrink-0 mr-3">
                        <img
                          src={getStorageUrl(user.image)}
                          alt={user.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <span className="font-medium text-gray-900">{user.name}</span>
                  </div>
                  <span className="text-sm font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full">{user.count} ครั้ง</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-8">ยังไม่มีข้อมูล</p>
          )}
        </AdminCard>

        {/* Peak Hours Chart */}
        <AdminCard title="ช่วงเวลาที่มีการจองมากที่สุด" icon="⏰">
          <div className="space-y-3">
            {reports.peakHours.map((hour, index) => (
              <div key={index} className="flex items-center group">
                <div className="w-16 text-sm font-bold text-gray-500">{hour.label}</div>
                <div className="flex-1 mx-3">
                  <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2.5 rounded-full transition-all duration-500 group-hover:from-blue-600 group-hover:to-indigo-600"
                      style={{ width: `${hour.percentage}%` }}
                    ></div>
                  </div>
                </div>
                <div className="w-12 text-right text-sm font-bold text-gray-700">
                  {hour.count}
                </div>
              </div>
            ))}
          </div>
        </AdminCard>

        {/* Demand by Day */}
        <AdminCard title="ความต้องการตามวันในสัปดาห์" icon="📅">
          <div className="space-y-4">
            {reports.demandByDay.map((day, index) => (
              <div key={index}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">{day.day}</span>
                  <span className="text-sm font-bold text-green-600">{day.count} การจอง</span>
                </div>
                <div className="w-ful bg-gray-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-green-500 to-emerald-500 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${day.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </AdminCard>
      </div>
    </div>
  )
}
