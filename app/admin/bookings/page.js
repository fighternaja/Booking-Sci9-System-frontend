'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import Swal from 'sweetalert2'
import RescheduleModal from '../../components/RescheduleModal'
import { useAuth } from '../../contexts/AuthContext'
import { formatDateTimeToThai } from '../../utils/dateUtils'
import AdminButton from '../components/AdminButton'
import AdminCard from '../components/AdminCard'
import AdminHeader from '../components/AdminHeader'

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

  const { token, logout, user, loading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  // --- Effects ---
  useEffect(() => {
    const statusParam = searchParams.get('status')
    if (statusParam) {
      setStatusFilter(statusParam)
    }
  }, [searchParams])

  useEffect(() => {
    if (authLoading) return // Wait for auth to load
    if (!token) {
      router.push('/login')
      return
    }
    fetchBookings()
  }, [token, authLoading, statusFilter, startDate, endDate])

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
      const res = await fetch(`http://127.0.0.1:8000/api/bookings/${booking.id}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ cancellation_reason: 'Admin cancelled' })
      })

      if (!res.ok) {
        // Fallback
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <AdminHeader
        title="จัดการการจอง"
        subtitle="อนุมัติ ปฏิเสธ และจัดการการจองห้อง"
      />

      {/* Toolbar & Filters */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col lg:flex-row gap-4 justify-between items-center sticky top-0 z-10">

        {/* Status Tabs */}
        <div className="flex bg-gray-100/50 p-1 rounded-xl overflow-x-auto max-w-full">
          {[
            { id: 'all', label: 'ทั้งหมด' },
            { id: 'pending', label: 'รออนุมัติ' },
            { id: 'approved', label: 'อนุมัติ' },
            { id: 'rejected', label: 'ปฏิเสธ' },
            { id: 'cancelled', label: 'ยกเลิก' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setStatusFilter(tab.id)
                const params = new URLSearchParams(searchParams)
                if (tab.id !== 'all') {
                  params.set('status', tab.id)
                } else {
                  params.delete('status')
                }
                router.push(`?${params.toString()}`, { scroll: false })
              }}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${statusFilter === tab.id
                  ? 'bg-white text-blue-600 shadow-sm border border-gray-200/50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Date */}
        <div className="flex flex-wrap gap-2 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-64">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input
              type="text"
              placeholder="ค้นหา..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <input
            type="date"
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
          />
        </div>
      </div>

      {/* Bookings List */}
      <div className="space-y-4">
        {loading ? (
          <div className="space-y-4 animate-pulse">
            {[1, 2, 3].map(i => <div key={i} className="h-32 bg-gray-200 rounded-2xl"></div>)}
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 p-8 rounded-2xl text-center">
            <p className="font-bold mb-2">เกิดข้อผิดพลาด</p>
            <p className="text-sm">{error}</p>
            <button onClick={fetchBookings} className="mt-4 text-red-600 hover:text-red-800 underline font-bold text-sm">
              ลองใหม่
            </button>
          </div>
        ) : getFilteredBookings().length > 0 ? (
          getFilteredBookings().map(booking => (
            <div key={booking.id} className="bg-white rounded-2xl border border-gray-100/50 p-6 shadow-sm hover:shadow-md transition-all duration-300 group">
              <div className="flex flex-col lg:flex-row gap-6">

                {/* Time & Room (Left) */}
                <div className="lg:w-1/4 flex flex-col justify-center border-b lg:border-b-0 lg:border-r border-gray-100 pb-4 lg:pb-0 lg:pr-6">
                  <div className="text-sm font-bold text-blue-600 mb-1">{booking.room?.name}</div>
                  <div className="text-xl font-bold text-gray-900 leading-tight">
                    {formatDateTimeToThai(booking.start_time).split(' ')[0]}
                  </div>
                  <div className="text-gray-500 text-sm mt-1">
                    {formatDateTimeToThai(booking.start_time).split(' ').slice(1).join(' ')} - {formatDateTimeToThai(booking.end_time).split(' ').slice(1).join(' ')}
                  </div>
                </div>

                {/* Info (Middle) */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${booking.status === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-100' :
                        booking.status === 'approved' ? 'bg-green-50 text-green-700 border-green-100' :
                          booking.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-100' :
                            'bg-gray-50 text-gray-600 border-gray-100'
                      }`}>
                      {booking.status === 'pending' ? 'รออนุมัติ' :
                        booking.status === 'approved' ? 'อนุมัติแล้ว' :
                          booking.status === 'rejected' ? 'ถูกปฏิเสธ' : 'ยกเลิกแล้ว'}
                    </span>
                    <h3 className="font-bold text-gray-900">{booking.purpose || 'ไม่มีหัวข้อการประชุม'}</h3>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-xs">👤</span>
                      {booking.user?.name}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-xs">📧</span>
                      {booking.user?.email}
                    </div>
                  </div>

                  {booking.equipment && booking.equipment.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {booking.equipment.map(eq => (
                        <span key={eq.id} className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600">
                          + {eq.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions (Right) */}
                <div className="flex flex-row lg:flex-col gap-2 justify-center lg:w-40 border-t lg:border-t-0 lg:border-l border-gray-100 pt-4 lg:pt-0 lg:pl-6">
                  {booking.status === 'pending' && (
                    <>
                      <button onClick={() => handleApprove(booking)} className="flex-1 bg-green-50 hover:bg-green-100 text-green-700 font-bold py-2 px-4 rounded-xl text-sm transition-colors border border-green-200">
                        อนุมัติ
                      </button>
                      <button onClick={() => handleReject(booking)} className="flex-1 bg-red-50 hover:bg-red-100 text-red-700 font-bold py-2 px-4 rounded-xl text-sm transition-colors border border-red-200">
                        ปฏิเสธ
                      </button>
                    </>
                  )}
                  {(booking.status === 'approved' || booking.status === 'pending') && (
                    <button onClick={() => handleEdit(booking)} className="flex-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 font-medium py-2 px-4 rounded-xl text-sm transition-colors">
                      แก้ไข
                    </button>
                  )}
                  {(booking.status !== 'cancelled' && booking.status !== 'rejected') && (
                    <button onClick={() => handleCancel(booking)} className="flex-1 text-gray-400 hover:text-red-600 hover:bg-red-50 font-medium py-2 px-4 rounded-xl text-sm transition-colors">
                      ยกเลิก
                    </button>
                  )}
                </div>

              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-20 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
            <span className="text-4xl block mb-4">📭</span>
            <p className="text-gray-500 font-medium">ไม่พบข้อมูลการจอง</p>
            <p className="text-gray-400 text-sm mt-1">ลองปรับตัวกรองหรือค้นหาคำอื่น</p>
          </div>
        )}
      </div>

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
  )
}
