'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import RescheduleModal from '../components/RescheduleModal'
import { useAuth } from '../contexts/AuthContext'
import { formatDateTimeToThai } from '../utils/dateUtils'
import Swal from 'sweetalert2'
import RecurringBookingsList from '../components/RecurringBookingsList'

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all')
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [showRescheduleModal, setShowRescheduleModal] = useState(false)
  const [recurringCount, setRecurringCount] = useState(0)

  // Equipment management states
  const [availableEquipment, setAvailableEquipment] = useState([])
  const [showEquipmentModal, setShowEquipmentModal] = useState(false)
  const [selectedBookingId, setSelectedBookingId] = useState(null)
  const [bookingEquipment, setBookingEquipment] = useState({})
  const [equipmentFormData, setEquipmentFormData] = useState({
    equipment_id: '',
    quantity: 1,
    notes: ''
  })

  const { user, token, logout, loading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam) {
      setFilter(tabParam)
    }
  }, [searchParams])

  useEffect(() => {
    if (authLoading) return // Wait for auth
    if (!user) {
      router.push('/login')
      return
    }
    if (!token) {
      router.push('/login')
      return
    }
    fetchBookings()
    fetchAvailableEquipment()
    fetchRecurringCount()
  }, [user, token, router, authLoading])

  const fetchRecurringCount = async () => {
    if (!token) return
    try {
      const response = await fetch('http://127.0.0.1:8000/api/recurring-bookings/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      })
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setRecurringCount(data.data.total)
        }
      }
    } catch (error) {
      console.error('Error fetching recurring count:', error)
    }
  }

  const fetchBookings = async () => {
    if (!token) {
      setLoading(false)
      return
    }

    try {
      setError(null)
      const timestamp = new Date().getTime()
      const response = await fetch(`http://127.0.0.1:8000/api/bookings?t=${timestamp}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      })

      if (!response.ok) {
        if (response.status === 401) {
          logout()
          router.push('/login')
          return
        }
        throw new Error(`HTTP Error ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        setBookings(data.data || [])
        setError(null)
        data.data.forEach(booking => {
          fetchBookingEquipment(booking.id)
        })
      } else {
        setError(data.message || 'ไม่สามารถโหลดข้อมูลการจองได้')
      }
    } catch (error) {
      console.error('Error fetching bookings:', error)
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์')
    } finally {
      setLoading(false)
    }
  }

  const fetchAvailableEquipment = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/equipment', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setAvailableEquipment(data.data)
        }
      }
    } catch (error) {
      console.error('Error fetching equipment:', error)
    }
  }

  const fetchBookingEquipment = async (bookingId) => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/bookings/${bookingId}/equipment`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setBookingEquipment(prev => ({
            ...prev,
            [bookingId]: data.data
          }))
        }
      }
    } catch (error) {
      console.error('Error fetching booking equipment:', error)
    }
  }

  const handleAddEquipment = async () => {
    if (!equipmentFormData.equipment_id) {
      alert('กรุณาเลือกอุปกรณ์')
      return
    }

    try {
      const response = await fetch(`http://127.0.0.1:8000/api/bookings/${selectedBookingId}/equipment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(equipmentFormData)
      })

      const data = await response.json()

      if (data.success) {
        fetchBookingEquipment(selectedBookingId)
        setShowEquipmentModal(false)
        resetEquipmentForm()
        Swal.fire({
          title: 'สำเร็จ!',
          text: 'เพิ่มอุปกรณ์แล้ว',
          icon: 'success',
          confirmButtonColor: '#3b82f6'
        })
      } else {
        alert(data.message || 'เกิดข้อผิดพลาด')
      }
    } catch (error) {
      console.error('Error adding equipment:', error)
      alert('เกิดข้อผิดพลาดในการเพิ่มอุปกรณ์')
    }
  }

  const handleDeleteEquipment = async (bookingId, equipmentId) => {
    const result = await Swal.fire({
      title: 'ยืนยันการลบ?',
      text: 'คุณแน่ใจหรือไม่ที่จะลบอุปกรณ์นี้?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#e5e7eb',
      confirmButtonText: 'ลบ',
      cancelButtonText: 'ยกเลิก',
      cancelButtonTextClass: 'text-gray-700'
    })

    if (!result.isConfirmed) return

    try {
      const response = await fetch(`http://127.0.0.1:8000/api/bookings/${bookingId}/equipment/${equipmentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      })

      const data = await response.json()

      if (data.success) {
        fetchBookingEquipment(bookingId)
        Swal.fire({
          title: 'สำเร็จ!',
          text: 'ลบอุปกรณ์แล้ว',
          icon: 'success',
          confirmButtonColor: '#3b82f6'
        })
      } else {
        alert(data.message || 'เกิดข้อผิดพลาด')
      }
    } catch (error) {
      console.error('Error deleting equipment:', error)
      alert('เกิดข้อผิดพลาดในการลบอุปกรณ์')
    }
  }

  const openEquipmentModal = (bookingId) => {
    setSelectedBookingId(bookingId)
    setShowEquipmentModal(true)
    resetEquipmentForm()
  }

  const resetEquipmentForm = () => {
    setEquipmentFormData({
      equipment_id: '',
      quantity: 1,
      notes: ''
    })
  }

  const filteredBookings = bookings.filter(booking => {
    if (filter === 'all') return true
    if (filter === 'upcoming') return booking.status === 'approved' && new Date(booking.start_time) > new Date()
    if (filter === 'pending') return booking.status === 'pending'
    if (filter === 'history') return booking.status === 'approved' && new Date(booking.start_time) < new Date()
    return true
  })

  // Modern UI Helper Components
  const StatusBadge = ({ status }) => {
    const styles = {
      pending: 'bg-yellow-50 text-yellow-600 border border-yellow-100',
      approved: 'bg-green-50 text-green-600 border border-green-100',
      rejected: 'bg-red-50 text-red-600 border border-red-100',
      cancelled: 'bg-gray-50 text-gray-500 border border-gray-100'
    }
    const labels = {
      pending: 'รออนุมัติ',
      approved: 'อนุมัติแล้ว',
      rejected: 'ปฏิเสธ',
      cancelled: 'ยกเลิก'
    }

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status] || styles.cancelled}`}>
        {labels[status] || status}
      </span>
    )
  }

  const handleTabChange = (id) => {
    setFilter(id)
    const params = new URLSearchParams(searchParams)
    params.set('tab', id)
    router.push(`?${params.toString()}`, { scroll: false })
  }

  const TabButton = ({ id, label, icon, count }) => (
    <button
      onClick={() => handleTabChange(id)}
      className={`
        relative px-6 py-3 text-sm font-medium transition-all duration-300 rounded-lg flex items-center gap-2
        ${filter === id
          ? 'text-blue-600 bg-blue-50'
          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
        }
      `}
    >
      <span>{icon}</span>
      {label}
      {(count > 0 || id === 'recurring') && (
        <span className={`
            ml-1 px-2 py-0.5 rounded-full text-xs
            ${filter === id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}
        `}>
          {count}
        </span>
      )}
      {filter === id && (
        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-full" />
      )}
    </button>
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-500 text-sm font-medium">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pt-24">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">การจองของฉัน</h1>
            <p className="text-gray-500 mt-1">จัดการประวัติการจองและสถานะของคุณได้ที่นี่</p>
          </div>
          <Link
            href="/rooms"
            className="group inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <svg className="w-5 h-5 mr-2 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            จองห้องใหม่
          </Link>
        </div>

        {/* Filters */}
        <div className="mb-8 overflow-x-auto pb-2">
          <div className="flex space-x-2 min-w-max">
            <TabButton id="all" label="ทั้งหมด" icon="📋" count={bookings.length} />
            <TabButton id="upcoming" label="ที่จะมาถึง" icon="📅" count={bookings.filter(b => b.status === 'approved' && new Date(b.start_time) > new Date()).length} />
            <TabButton id="pending" label="รออนุมัติ" icon="⏳" count={bookings.filter(b => b.status === 'pending').length} />
            <TabButton id="history" label="ประวัติ" icon="📚" count={bookings.filter(b => b.status === 'approved' && new Date(b.start_time) < new Date()).length} />
            <TabButton id="recurring" label="แบบต่อเนื่อง" icon="🔄" count={recurringCount} />
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-8 rounded-xl bg-red-50 border border-red-100 p-4 flex items-center gap-3">
            <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1 text-sm text-red-700 font-medium">{error}</div>
            <button onClick={fetchBookings} className="text-sm font-semibold text-red-600 hover:text-red-800">ลองใหม่</button>
          </div>
        )}

        {/* Main Content */}
        {filter === 'recurring' ? (
          <RecurringBookingsList token={token} />
        ) : (
          <div className="space-y-4">
            {filteredBookings.length > 0 ? (
              filteredBookings.map((booking) => (
                <div key={booking.id} className="group bg-white rounded-2xl p-5 border border-gray-100 hover:border-blue-100 shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Room Image */}
                    <div className="w-full md:w-48 h-32 rounded-xl overflow-hidden bg-gray-100 shrink-0 relative">
                      {booking.room?.image ? (
                        <img
                          src={`http://127.0.0.1:8000/${booking.room.image}`}
                          alt={booking.room.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                              {booking.room?.name || 'ห้องไม่ทราบชื่อ'}
                            </h3>
                            <div className="flex items-center text-gray-500 text-sm mt-1">
                              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              {booking.room?.location || 'ไม่ระบุสถานที่'}
                            </div>
                          </div>
                          <StatusBadge status={booking.status} />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">เวลาที่จอง</p>
                              <p className="text-sm font-medium text-gray-900 mt-0.5">{formatDateTimeToThai(booking.start_time)}</p>
                              <p className="text-xs text-gray-500">ถึง {formatDateTimeToThai(booking.end_time)}</p>
                            </div>
                          </div>

                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">ผู้จอง</p>
                              <p className="text-sm font-medium text-gray-900 mt-0.5">{booking.user?.name || user?.name || '-'}</p>
                            </div>
                          </div>

                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">วัตถุประสงค์</p>
                              <p className="text-sm font-medium text-gray-900 mt-0.5 line-clamp-2">{booking.purpose}</p>
                            </div>
                          </div>
                        </div>

                        {/* Equipment List (Compact) */}
                        {bookingEquipment[booking.id] && bookingEquipment[booking.id].length > 0 && (
                          <div className="mt-4 pt-4 border-t border-gray-50">
                            <p className="text-xs font-semibold text-gray-500 mb-2">อุปกรณ์ที่ขอ:</p>
                            <div className="flex flex-wrap gap-2">
                              {bookingEquipment[booking.id].map(eq => (
                                <span key={eq.id} className="inline-flex items-center px-2 py-1 rounded-md bg-gray-50 text-xs text-gray-600 border border-gray-200">
                                  {eq.name} x{eq.pivot.quantity}
                                  {booking.status === 'pending' && (
                                    <button
                                      onClick={() => handleDeleteEquipment(booking.id, eq.id)}
                                      className="ml-1.5 text-gray-400 hover:text-red-500"
                                    >
                                      &times;
                                    </button>
                                  )}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Actions Bar */}
                      <div className="flex justify-end items-center gap-3 mt-6 pt-4 border-t border-gray-100">
                        {(booking.status === 'pending' || booking.status === 'approved') && (
                          <button
                            onClick={() => openEquipmentModal(booking.id)}
                            className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            + เพิ่มอุปกรณ์
                          </button>
                        )}

                        {booking.status === 'approved' && new Date(booking.start_time) > new Date() && (
                          <button
                            onClick={() => {
                              setSelectedBooking(booking)
                              setShowRescheduleModal(true)
                            }}
                            className="text-sm font-medium text-amber-600 hover:text-amber-700 hover:bg-amber-50 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            เลื่อนเวลา
                          </button>
                        )}

                        {['pending', 'approved'].includes(booking.status) && new Date(booking.start_time) > new Date() && (
                          <button
                            onClick={() => {
                              Swal.fire({
                                title: 'ยกเลิกการจอง?',
                                text: "ต้องการยกเลิกการจองนี้ใช่หรือไม่",
                                icon: 'warning',
                                showCancelButton: true,
                                confirmButtonColor: '#ef4444',
                                cancelButtonColor: '#e5e7eb',
                                confirmButtonText: 'ยืนยัน ยกเลิก',
                                cancelButtonText: 'เก็บไว้',
                                cancelButtonTextClass: 'text-gray-700'
                              }).then(async (result) => {
                                if (result.isConfirmed) {
                                  try {
                                    const response = await fetch(`http://127.0.0.1:8000/api/bookings/${booking.id}`, {
                                      method: 'PUT',
                                      headers: {
                                        'Authorization': `Bearer ${token}`,
                                        'Content-Type': 'application/json',
                                        'Accept': 'application/json'
                                      },
                                      body: JSON.stringify({ status: 'cancelled' })
                                    })
                                    if (response.ok) {
                                      Swal.fire({
                                        title: 'ยกเลิกสำเร็จ',
                                        icon: 'success',
                                        timer: 1500,
                                        showConfirmButton: false
                                      })
                                      fetchBookings()
                                    }
                                  } catch (err) {
                                    Swal.fire('ผิดพลาด', 'ไม่สามารถยกเลิกได้', 'error')
                                  }
                                }
                              })
                            }}
                            className="text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            ยกเลิก
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-100 border-dashed">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900">ไม่มีข้อมูลการจอง</h3>
                <p className="text-gray-500 text-sm mt-1">คุณยังไม่มีรายการจองในหมวดหมู่นี้</p>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Equipment Modal */}
      {showEquipmentModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden transform transition-all scale-100">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">เพิ่มอุปกรณ์เสริม</h2>
              <button onClick={() => setShowEquipmentModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">เลือกอุปกรณ์</label>
                <select
                  value={equipmentFormData.equipment_id}
                  onChange={(e) => setEquipmentFormData({ ...equipmentFormData, equipment_id: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                >
                  <option value="">-- กรุณาเลือก --</option>
                  {availableEquipment.map((eq) => (
                    <option key={eq.id} value={eq.id} disabled={eq.available_quantity <= 0}>
                      {eq.name} (คงเหลือ {eq.available_quantity})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">จำนวนที่ต้องการ</label>
                <div className="flex items-center border border-gray-200 rounded-xl bg-gray-50 w-32">
                  <button
                    onClick={() => setEquipmentFormData(p => ({ ...p, quantity: Math.max(1, p.quantity - 1) }))}
                    className="px-3 py-2 text-gray-500 hover:text-blue-600"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={equipmentFormData.quantity}
                    onChange={(e) => setEquipmentFormData({ ...equipmentFormData, quantity: parseInt(e.target.value) || 1 })}
                    className="w-full text-center bg-transparent border-none focus:ring-0 p-0"
                    min="1"
                  />
                  <button
                    onClick={() => setEquipmentFormData(p => ({ ...p, quantity: p.quantity + 1 }))}
                    className="px-3 py-2 text-gray-500 hover:text-blue-600"
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">หมายเหตุเพิ่มเติม</label>
                <textarea
                  value={equipmentFormData.notes}
                  onChange={(e) => setEquipmentFormData({ ...equipmentFormData, notes: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none resize-none"
                  rows="3"
                  placeholder="เช่น ขอสายต่อ HDMI ยาวพิเศษ..."
                />
              </div>
            </div>

            <div className="p-6 pt-2 bg-gray-50 flex gap-3">
              <button
                onClick={() => setShowEquipmentModal(false)}
                className="flex-1 px-4 py-2.5 text-gray-700 font-medium hover:bg-gray-200 rounded-xl transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleAddEquipment}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-medium hover:bg-blue-700 rounded-xl shadow-sm transition-colors"
              >
                ยืนยันการเพิ่ม
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {showRescheduleModal && selectedBooking && (
        <RescheduleModal
          isOpen={showRescheduleModal}
          onClose={() => {
            setShowRescheduleModal(false)
            setSelectedBooking(null)
          }}
          booking={selectedBooking}
          onRescheduleSuccess={() => {
            fetchBookings()
          }}
        />
      )}
    </div>
  )
}

