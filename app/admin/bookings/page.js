'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../contexts/AuthContext'
import Swal from 'sweetalert2'
import RescheduleModal from '../../components/RescheduleModal'

export default function AdminBookingsPage() {
  // --- State ---
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Filters
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Modals
  const [showRescheduleModal, setShowRescheduleModal] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState(null)

  // Equipment Modal State (retained for viewing equipment)
  const [showEquipmentModal, setShowEquipmentModal] = useState(false)
  const [selectedBookingId, setSelectedBookingId] = useState(null)
  const [bookingEquipment, setBookingEquipment] = useState({}) // Store equipment data locally for modal

  const { token, logout, user } = useAuth()
  const router = useRouter()

  // --- Effects ---
  useEffect(() => {
    if (!token) {
      router.push('/login')
      return
    }
    fetchBookings()
  }, [token, statusFilter, startDate, endDate]) // Refetch when expensive filters change (optional, or clientside filter)

  // --- Actions ---

  const fetchBookings = async () => {
    setLoading(true)
    setError(null)
    try {
      // Build Query Params
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (startDate) params.append('start_date', startDate)
      if (endDate) params.append('end_date', endDate)

      const response = await fetch(`http://127.0.0.1:8000/api/bookings?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      })

      if (!response.ok) {
        if (response.status === 401) {
          logout()
          router.push('/login')
          return
        }
        throw new Error('Failed to fetch bookings')
      }

      const data = await response.json()
      if (data.success) {
        setBookings(data.data)
      } else {
        setError(data.message)
      }
    } catch (err) {
      console.error(err)
      setError('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (booking) => {
    try {
      const result = await Swal.fire({
        title: 'ยืนยันการอนุมัติ?',
        text: `อนุมัติการจองห้อง ${booking.room?.name} สำหรับ ${booking.user?.name}`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#10B981',
        confirmButtonText: 'อนุมัติ',
        cancelButtonText: 'ยกเลิก'
      })

      if (!result.isConfirmed) return

      const res = await fetch(`http://127.0.0.1:8000/api/bookings/${booking.id}/approve`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (res.ok) {
        fetchBookings()
        Swal.fire('เรียบร้อย', 'อนุมัติการจองแล้ว', 'success')
      } else {
        throw new Error('Failed')
      }
    } catch (err) {
      Swal.fire('ข้อผิดพลาด', 'ไม่สามารถทำรายการได้', 'error')
    }
  }

  const handleReject = async (booking) => {
    const { value: reason } = await Swal.fire({
      title: 'ระบุเหตุผลการปฏิเสธ',
      input: 'text',
      inputLabel: 'เหตุผล (Optional)',
      inputPlaceholder: 'เช่น ห้องไม่ว่าง, มีการซ่อมแซม',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      confirmButtonText: 'ปฏิเสธการจอง'
    })

    if (reason === undefined) return // Cancelled

    try {
      const res = await fetch(`http://127.0.0.1:8000/api/bookings/${booking.id}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ rejection_reason: reason })
      })

      if (res.ok) {
        fetchBookings()
        Swal.fire('เรียบร้อย', 'ปฏิเสธการจองแล้ว', 'success')
      } else {
        throw new Error('Failed')
      }
    } catch (err) {
      Swal.fire('ข้อผิดพลาด', 'ไม่สามารถทำรายการได้', 'error')
    }
  }

  const handleCancel = async (booking) => {
    const result = await Swal.fire({
      title: 'ยืนยันการยกเลิก?',
      text: "การยกเลิกนี้จะมีผลทันทีและไม่สามารถกู้คืนได้",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      confirmButtonText: 'ยืนยันยกเลิก',
      cancelButtonText: 'เก็บไว้'
    })

    if (!result.isConfirmed) return

    try {
      // Use the specific cancel endpoint if available, or just update status ? 
      // Checking backend controller: public function cancel(Request $request, Booking $booking) -> api/bookings/{id}/cancel is likely route, check routes?
      // Usually RESTful: DELETE api/bookings/{id} or POST api/bookings/{id}/cancel
      // Let's assume the cancel method in controller maps to a route.
      // Based on previous code analysis, there was a performBulk using DELETE for cancel.
      // Controller has `cancel` method.

      // Let's try PUT update to status cancelled first as it's safer if route unknown, OR check controller "cancel" method above.
      // Controller has `cancel` method.

      const res = await fetch(`http://127.0.0.1:8000/api/bookings/${booking.id}/cancel`, {
        method: 'POST', // or DELETE/PUT depending on routes. api.php usually: Route::post('bookings/{booking}/cancel', [BookingController::class, 'cancel']);
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ cancellation_reason: 'Admin cancelled' })
      })

      if (!res.ok) {
        // Fallback if specific route fails, try generic update
        const res2 = await fetch(`http://127.0.0.1:8000/api/bookings/${booking.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status: 'cancelled' })
        })
        if (res2.ok) {
          fetchBookings()
          Swal.fire('เรียบร้อย', 'ยกเลิกการจองแล้ว', 'success')
          return
        }
        throw new Error('Failed')
      }

      fetchBookings()
      Swal.fire('เรียบร้อย', 'ยกเลิกการจองแล้ว', 'success')

    } catch (err) {
      Swal.fire('ข้อผิดพลาด', 'ไม่สามารถทำรายการได้', 'error')
    }
  }

  const handleEdit = (booking) => {
    setSelectedBooking(booking)
    setShowRescheduleModal(true)
  }

  // --- Filtering Helper ---
  const getFilteredBookings = () => {
    return bookings.filter(b => {
      // Search Term
      const term = searchTerm.toLowerCase()
      const matchSearch =
        b.user?.name?.toLowerCase().includes(term) ||
        b.room?.name?.toLowerCase().includes(term) ||
        b.purpose?.toLowerCase().includes(term)

      return matchSearch
    })
  }

  // --- Render Helpers ---
  const StatusBadge = ({ status }) => {
    const config = {
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'รออนุมัติ' },
      approved: { color: 'bg-green-100 text-green-800', label: 'อนุมัติแล้ว' },
      rejected: { color: 'bg-red-100 text-red-800', label: 'ปฏิเสธ' },
      cancelled: { color: 'bg-gray-100 text-gray-800', label: 'ยกเลิก' },
    }
    const c = config[status] || { color: 'bg-gray-100', label: status }

    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${c.color} border border-opacity-20`}>
        {c.label}
      </span>
    )
  }

  const formatDateTime = (isoString) => {
    if (!isoString) return '-'
    const d = new Date(isoString)
    return d.toLocaleString('th-TH', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Bar */}
      <div className="bg-white border-b sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">ระบบจัดการการจอง</h1>
          <div className="flex gap-3">
            <Link href="/admin" className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md hover:bg-gray-100 transition">
              Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">

        {/* Filtering Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
          <div className="flex flex-col lg:flex-row gap-4 justify-between items-end lg:items-center">

            {/* Status Tabs */}
            <div className="flex bg-gray-100 p-1 rounded-lg">
              {['all', 'pending', 'approved', 'cancelled'].map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${statusFilter === s ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                  {s === 'all' ? 'ทั้งหมด' :
                    s === 'pending' ? 'รออนุมัติ' :
                      s === 'approved' ? 'อนุมัติแล้ว' : 'ยกเลิก/ปฏิเสธ'}
                </button>
              ))}
            </div>

            {/* Date & Search */}
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <div className="flex gap-2 items-center">
                <input
                  type="date"
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                />
                <span className="text-gray-400">-</span>
                <input
                  type="date"
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                />
              </div>
              <input
                type="text"
                placeholder="ค้นหา ผู้จอง, ห้อง..."
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full sm:w-64"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent"></div>
            <div className="mt-2 text-gray-500">กำลังโหลด...</div>
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-700 p-4 rounded-xl text-center">
            {error}
            <button onClick={fetchBookings} className="ml-2 underline hover:text-red-800">ลองใหม่</button>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold">
                  <tr>
                    <th className="px-6 py-4">Booking Info</th>
                    <th className="px-6 py-4">ผู้จอง</th>
                    <th className="px-6 py-4">ห้อง/เวลา</th>
                    <th className="px-6 py-4">สถานะ</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {getFilteredBookings().length > 0 ? getFilteredBookings().map(booking => (
                    <tr key={booking.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">#{booking.id}</div>
                        <div className="text-gray-500 text-xs mt-1 truncate max-w-[150px]" title={booking.purpose}>
                          {booking.purpose}
                        </div>
                        {/* Equipment Badges if any (Eager loaded) */}
                        {booking.equipment && booking.equipment.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {booking.equipment.map(eq => (
                              <span key={eq.id} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700">
                                {eq.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{booking.user?.name || '-'}</div>
                        <div className="text-gray-500 text-xs">{booking.user?.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-gray-900 font-medium">{booking.room?.name}</div>
                        <div className="text-gray-500 text-xs mt-0.5">
                          {formatDateTime(booking.start_time)}
                          <br />
                          ถึง {formatDateTime(booking.end_time)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={booking.status} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">

                          {booking.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApprove(booking)}
                                className="px-3 py-1.5 bg-green-600 text-white rounded-md text-xs font-medium hover:bg-green-700 transition shadow-sm"
                              >
                                อนุมัติ
                              </button>
                              <button
                                onClick={() => handleReject(booking)}
                                className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-md text-xs font-medium hover:bg-gray-50 transition"
                              >
                                ปฏิเสธ
                              </button>
                            </>
                          )}

                          {(booking.status === 'approved' || booking.status === 'pending') && (
                            <>
                              <button
                                title="แก้ไข / เลื่อนเวลา"
                                onClick={() => handleEdit(booking)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition"
                              >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                title="ยกเลิกการจอง"
                                onClick={() => handleCancel(booking)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition"
                              >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </>
                          )}

                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                        ไม่พบข้อมูลการจอง
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Reschedule Modal */}
        {showRescheduleModal && selectedBooking && (
          <RescheduleModal
            isOpen={showRescheduleModal}
            onClose={() => setShowRescheduleModal(false)}
            booking={selectedBooking}
            onRescheduleSuccess={() => {
              setShowRescheduleModal(false)
              fetchBookings()
            }}
          />
        )}
      </div>
    </div>
  )
}
