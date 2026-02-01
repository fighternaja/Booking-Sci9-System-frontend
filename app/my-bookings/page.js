'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import RescheduleModal from '../components/RescheduleModal'
import { useAuth } from '../contexts/AuthContext'
import { formatDateTimeToThai } from '../utils/dateUtils'
import Swal from 'sweetalert2'
import RecurringBookingsList from '../components/RecurringBookingsList'
import { API_URL, getStorageUrl } from '../lib/api'

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
      const response = await fetch(`${API_URL}/api/recurring-bookings/stats`, {
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
      const response = await fetch(`${API_URL}/api/bookings?t=${timestamp}`, {
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
      const response = await fetch(`${API_URL}/api/equipment`, {
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
      const response = await fetch(`${API_URL}/api/bookings/${bookingId}/equipment`, {
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
      const response = await fetch(`${API_URL}/api/bookings/${selectedBookingId}/equipment`, {
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
      const response = await fetch(`${API_URL}/api/bookings/${bookingId}/equipment/${equipmentId}`, {
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

  const handleCheckIn = async (bookingId) => {
    const result = await Swal.fire({
      title: 'ยืนยันการเช็คอิน?',
      text: 'คุณต้องการยืนยันว่ามาถึงห้องแล้วใช่หรือไม่?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ใช่, ฉันมาถึงแล้ว',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#e5e7eb',
      confirmButtonTextColor: '#ffffff',
    })

    if (!result.isConfirmed) return

    try {
      const response = await fetch(`${API_URL}/api/bookings/${bookingId}/checkin`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      })

      const data = await response.json()

      if (data.success) {
        await Swal.fire({
          title: 'เช็คอินสำเร็จ!',
          text: 'บันทึกเวลาการเข้าใช้ห้องเรียบร้อยแล้ว',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        })
        fetchBookings()
      } else {
        Swal.fire({
          title: 'ไม่สามารถเช็คอินได้',
          text: data.message || 'เกิดข้อผิดพลาด',
          icon: 'error'
        })
      }
    } catch (error) {
      console.error('Error checking in:', error)
      Swal.fire({
        title: 'เกิดข้อผิดพลาด',
        text: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้',
        icon: 'error'
      })
    }
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
      pending: 'bg-amber-100 text-amber-700 border border-amber-200',
      approved: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
      rejected: 'bg-rose-100 text-rose-700 border border-rose-200',
      cancelled: 'bg-slate-100 text-slate-500 border border-slate-200'
    }
    const labels = {
      pending: 'รออนุมัติ',
      approved: 'อนุมัติแล้ว',
      rejected: 'ปฏิเสธ',
      cancelled: 'ยกเลิก'
    }
    const icons = {
      pending: <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
      approved: <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>,
      rejected: <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>,
      cancelled: <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold shadow-sm ${styles[status] || styles.cancelled}`}>
        {icons[status]}
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
        group relative px-5 py-2.5 text-sm font-medium transition-all duration-200 rounded-xl flex items-center gap-2
        ${filter === id
          ? 'text-white bg-blue-600 shadow-lg shadow-blue-500/30'
          : 'text-gray-600 hover:text-blue-700 hover:bg-white/80'
        }
      `}
    >
      <span className={`transition-transform duration-200 ${filter === id ? 'scale-110' : 'group-hover:scale-110'}`}>{icon}</span>
      {label}
      {(count > 0 || id === 'recurring') && (
        <span className={`
            ml-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold
            ${filter === id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500 group-hover:bg-blue-50 group-hover:text-blue-600'}
        `}>
          {count}
        </span>
      )}
    </button>
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-500 text-sm font-medium animate-pulse">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 pb-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-24">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-700 tracking-tight mb-2">
              รายการจองห้อง
            </h1>
            <p className="text-gray-500 text-lg">จัดการประวัติการจองและติดตามสถานะ</p>
          </div>
          <Link
            href="/rooms"
            className="group inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-bold rounded-2xl hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-300 transform hover:-translate-y-0.5"
          >
            <svg className="w-5 h-5 mr-2 transition-transform group-hover:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            จองห้องใหม่
          </Link>
        </div>

        {/* Filters */}
        <div className="mb-8 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          <div className="flex space-x-2 min-w-max p-1 bg-white/50 backdrop-blur-md rounded-2xl border border-white/60 shadow-sm">
            <TabButton id="all" label="ทั้งหมด" icon="📋" count={bookings.length} />
            <TabButton id="upcoming" label="ที่จะมาถึง" icon="📅" count={bookings.filter(b => b.status === 'approved' && new Date(b.start_time) > new Date()).length} />
            <TabButton id="pending" label="รออนุมัติ" icon="⏳" count={bookings.filter(b => b.status === 'pending').length} />
            <TabButton id="history" label="ประวัติ" icon="📚" count={bookings.filter(b => b.status === 'approved' && new Date(b.start_time) < new Date()).length} />
            <TabButton id="recurring" label="แบบต่อเนื่อง" icon="🔄" count={recurringCount} />
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-8 rounded-2xl bg-white border border-red-100 p-6 flex items-start gap-4 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
              <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-red-800 font-semibold">เกิดข้อผิดพลาด</h3>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
            <button onClick={fetchBookings} className="px-4 py-2 bg-red-50 text-red-700 rounded-lg text-sm font-semibold hover:bg-red-100 transition-colors">
              ลองใหม่
            </button>
          </div>
        )}

        {/* Main Content */}
        {filter === 'recurring' ? (
          <div className="bg-white/60 backdrop-blur-sm rounded-3xl p-6 shadow-sm border border-white/60">
            <RecurringBookingsList token={token} />
          </div>
        ) : (
          <div className="space-y-5">
            {filteredBookings.length > 0 ? (
              filteredBookings.map((booking) => (
                <div key={booking.id} className="group relative bg-white/80 backdrop-blur-md rounded-3xl p-1 border border-white shadow-sm hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300">
                  <div className="flex flex-col md:flex-row h-full">
                    {/* Room Image */}
                    <div className="w-full md:w-56 h-48 md:h-auto rounded-2xl overflow-hidden relative shrink-0">
                      {booking.room?.image ? (
                        <img
                          src={getStorageUrl(booking.room.image)}
                          alt={booking.room.name}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-50 flex items-center justify-center text-gray-300">
                          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}

                      {/* Mobile Status Badge Overlay */}
                      <div className="absolute top-3 right-3 md:hidden">
                        <StatusBadge status={booking.status} />
                      </div>
                    </div>

                    {/* Details */}
                    <div className="flex-1 p-5 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                              {booking.room?.name || 'ห้องไม่ทราบชื่อ'}
                            </h3>
                            <div className="flex items-center text-gray-500 text-sm mt-1 font-medium">
                              <svg className="w-4 h-4 mr-1.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              {booking.room?.location || 'ไม่ระบุสถานที่'}
                            </div>
                          </div>
                          <div className="hidden md:block">
                            <StatusBadge status={booking.status} />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-6 mt-4">
                          <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-50/50 border border-blue-100/50">
                            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-blue-800 uppercase tracking-widest">เวลาที่จอง</p>
                              <p className="text-sm font-semibold text-gray-900 mt-0.5">{formatDateTimeToThai(booking.start_time)}</p>
                              <p className="text-xs text-gray-500">ถึง {formatDateTimeToThai(booking.end_time)}</p>
                            </div>
                          </div>

                          <div className="flex items-start gap-3 p-3 rounded-xl bg-purple-50/50 border border-purple-100/50">
                            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600 shrink-0">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-purple-800 uppercase tracking-widest">วัตถุประสงค์</p>
                              <p className="text-sm font-medium text-gray-900 mt-0.5 line-clamp-2">{booking.purpose}</p>
                            </div>
                          </div>

                          {/* User Info Column */}
                          <div className="flex items-start gap-3 p-3 rounded-xl bg-orange-50/50 border border-orange-100/50">
                            <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600 shrink-0">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            </div>
                            <div className="min-w-0">
                              <p className="text-[10px] font-bold text-orange-800 uppercase tracking-widest">ผู้จอง</p>
                              <p className="text-sm font-medium text-gray-900 mt-0.5 truncate" title={booking.user?.name}>{booking.user?.name || '-'}</p>
                              <div className="text-xs text-gray-500 flex flex-col gap-0.5 mt-0.5">
                                <span className="flex items-center gap-1 truncate" title={booking.user?.email}>
                                  <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                  {booking.user?.email || '-'}
                                </span>
                                {booking.user?.phone && (
                                  <span className="flex items-center gap-1">
                                    <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                    {booking.user.phone}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Equipment List (Compact) */}
                        {bookingEquipment[booking.id] && bookingEquipment[booking.id].length > 0 && (
                          <div className="mt-4 flex flex-wrap gap-2 items-center">
                            <span className="text-xs font-semibold text-gray-400 mr-1 flex items-center">
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                              อุปกรณ์:
                            </span>
                            {bookingEquipment[booking.id].map(eq => (
                              <span key={eq.id} className="inline-flex items-center px-2 py-1 rounded-lg bg-gray-50 text-xs font-medium text-gray-600 border border-gray-100">
                                {eq.name} <span className="text-gray-400 ml-1">x{eq.pivot.quantity}</span>
                                {booking.status === 'pending' && (
                                  <button
                                    onClick={() => handleDeleteEquipment(booking.id, eq.id)}
                                    className="ml-1.5 text-gray-300 hover:text-red-500 transition-colors"
                                  >
                                    &times;
                                  </button>
                                )}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Actions Bar */}
                      <div className="flex flex-wrap justify-end items-center gap-2 mt-5 pt-4 border-t border-gray-100/50">
                        {/* Check-in Button */}
                        {booking.status === 'approved' &&
                          !booking.checked_in_at &&
                          booking.requires_checkin !== false && (
                            (() => {
                              const now = new Date();
                              const startTime = new Date(booking.start_time);
                              const endTime = new Date(booking.end_time);
                              // Allow check-in 30 mins before start until end
                              const checkInStart = new Date(startTime.getTime() - 30 * 60000);

                              if (now >= checkInStart && now < endTime) {
                                return (
                                  <button
                                    onClick={() => handleCheckIn(booking.id)}
                                    className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/40 hover:-translate-y-0.5 transition-all flex items-center gap-2"
                                  >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                    </svg>
                                    เช็คอินเข้าใช้งาน
                                  </button>
                                );
                              }
                              return null;
                            })()
                          )}

                        {booking.checked_in_at && (
                          <div className="px-3 py-2 bg-green-50 text-green-700 text-sm font-semibold rounded-xl border border-green-200 flex items-center gap-1.5 cursor-default">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            เช็คอินแล้ว ({formatDateTimeToThai(booking.checked_in_at).split(' เวลา ')[1]})
                          </div>
                        )}

                        {(booking.status === 'pending' || booking.status === 'approved') && (
                          <button
                            onClick={() => openEquipmentModal(booking.id)}
                            className="text-sm font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-2 rounded-xl transition-all"
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
                            className="text-sm font-semibold text-amber-600 hover:text-amber-700 hover:bg-amber-50 px-3 py-2 rounded-xl transition-all"
                          >
                            เลื่อนจอง
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
                                cancelButtonColor: '#f3f4f6',
                                confirmButtonText: 'ยืนยัน',
                                cancelButtonText: 'เก็บไว้',
                                borderRadius: '1rem'
                              }).then(async (result) => {
                                if (result.isConfirmed) {
                                  try {
                                    const response = await fetch(`${API_URL}/api/bookings/${booking.id}`, {
                                      method: 'PUT',
                                      headers: {
                                        'Authorization': `Bearer ${token}`,
                                        'Content-Type': 'application/json',
                                        'Accept': 'application/json'
                                      },
                                      body: JSON.stringify({ status: 'cancelled' })
                                    })
                                    if (response.ok) {
                                      fetchBookings()
                                    }
                                  } catch (err) {
                                    console.error(err)
                                  }
                                }
                              })
                            }}
                            className="text-sm font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-xl transition-all"
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
              <div className="flex flex-col items-center justify-center py-24 bg-white/60 backdrop-blur-md rounded-3xl border border-white/60 text-center">
                <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6 shadow-inner">
                  <svg className="w-10 h-10 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">ไม่มีข้อมูลการจอง</h3>
                <p className="text-gray-500 max-w-sm mx-auto">
                  คุณยังไม่มีรายการจองในหมวดหมู่นี้ เริ่มต้นจองห้องใหม่ได้เลย
                </p>
                <Link
                  href="/rooms"
                  className="mt-6 inline-flex items-center px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30"
                >
                  จองห้องทันที
                </Link>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Equipment Modal */}
      {showEquipmentModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl font-bold text-gray-900">เพิ่มอุปกรณ์เสริม</h2>
              <button onClick={() => setShowEquipmentModal(false)} className="text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 p-2 rounded-full transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">เลือกอุปกรณ์</label>
                <div className="relative">
                  <select
                    value={equipmentFormData.equipment_id}
                    onChange={(e) => setEquipmentFormData({ ...equipmentFormData, equipment_id: e.target.value })}
                    className="w-full pl-4 pr-10 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none appearance-none font-medium text-gray-700 shadow-sm"
                  >
                    <option value="">-- กรุณาเลือก --</option>
                    {availableEquipment.map((eq) => (
                      <option key={eq.id} value={eq.id} disabled={eq.available_quantity <= 0}>
                        {eq.name} (คงเหลือ {eq.available_quantity})
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">จำนวนที่ต้องการ</label>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setEquipmentFormData(p => ({ ...p, quantity: Math.max(1, p.quantity - 1) }))}
                    className="w-10 h-10 flex items-center justify-center text-gray-600 bg-white border border-gray-200 rounded-full hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 shadow-sm"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
                  </button>
                  <input
                    type="number"
                    value={equipmentFormData.quantity}
                    onChange={(e) => setEquipmentFormData({ ...equipmentFormData, quantity: parseInt(e.target.value) || 1 })}
                    className="w-16 text-center bg-gray-50 border border-gray-200 rounded-xl py-2 font-bold text-gray-900 text-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    min="1"
                  />
                  <button
                    onClick={() => setEquipmentFormData(p => ({ ...p, quantity: p.quantity + 1 }))}
                    className="w-10 h-10 flex items-center justify-center text-gray-600 bg-white border border-gray-200 rounded-full hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 shadow-sm"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">หมายเหตุเพิ่มเติม</label>
                <textarea
                  value={equipmentFormData.notes}
                  onChange={(e) => setEquipmentFormData({ ...equipmentFormData, notes: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none resize-none font-medium text-gray-700 shadow-sm"
                  rows="3"
                  placeholder="เช่น ขอสายต่อ HDMI ยาวพิเศษ..."
                />
              </div>
            </div>

            <div className="p-6 pt-2 flex gap-3 bg-gray-50/50">
              <button
                onClick={() => setShowEquipmentModal(false)}
                className="flex-1 px-4 py-3 text-gray-700 font-bold hover:bg-gray-200 bg-white border border-gray-200 rounded-xl transition-all shadow-sm hover:shadow-md"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleAddEquipment}
                className="flex-1 px-4 py-3 bg-blue-600 text-white font-bold hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-500/30 transition-all hover:-translate-y-0.5"
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

