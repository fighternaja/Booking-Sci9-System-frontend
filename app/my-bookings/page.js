'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import RescheduleModal from '../components/RescheduleModal'
import { useAuth } from '../contexts/AuthContext'
import { formatDateTimeToThai, splitDateTimeToThai } from '../utils/dateUtils'
import Swal from 'sweetalert2'

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all')
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [showRescheduleModal, setShowRescheduleModal] = useState(false)
  const { user, token, logout } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }
    if (!token) {
      router.push('/login')
      return
    }
    fetchBookings()
  }, [user, token, router])

  const fetchBookings = async () => {
    if (!token) {
      setLoading(false)
      return
    }

    try {
      setError(null)
      // เพิ่ม cache busting เพื่อให้แน่ใจว่าได้ข้อมูลล่าสุด
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
          // Token expired or invalid - logout and redirect to login
          logout()
          router.push('/login')
          return
        }

        // Try to get error message from response
        let errorMessage = `เกิดข้อผิดพลาดในการโหลดข้อมูล (HTTP ${response.status})`
        try {
          const contentType = response.headers.get('content-type')
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json()
            errorMessage = errorData.message || errorMessage
          } else {
            const text = await response.text()
            if (text && !text.startsWith('<!DOCTYPE')) {
              errorMessage = text.substring(0, 200)
            }
          }
        } catch (e) {
          // If we can't parse the error, use default message
        }

        // Check for database connection errors
        if (errorMessage.includes('No connection could be made') ||
          errorMessage.includes('Connection: mysql') ||
          errorMessage.includes('target machine actively refused')) {
          errorMessage = 'ไม่สามารถเชื่อมต่อกับฐานข้อมูลได้ กรุณาติดต่อผู้ดูแลระบบ'
        } else if (errorMessage.includes('SQLSTATE') || errorMessage.includes('SQL')) {
          errorMessage = 'เกิดข้อผิดพลาดในฐานข้อมูล กรุณาติดต่อผู้ดูแลระบบ'
        }

        setError(errorMessage)
        console.error('Error fetching bookings: HTTP', response.status, errorMessage)
        return
      }

      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        console.error('Non-JSON response:', text)
        setError('เซิร์ฟเวอร์ส่งข้อมูลกลับมาในรูปแบบที่ไม่ถูกต้อง')
        return
      }

      const data = await response.json()

      if (data.success) {
        setBookings(data.data || [])
        setError(null)
      } else {
        setError(data.message || 'ไม่สามารถโหลดข้อมูลการจองได้')
      }
    } catch (error) {
      console.error('Error fetching bookings:', error)
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้ง')
    } finally {
      setLoading(false)
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
    if (filter === 'upcoming') return booking.status === 'approved' && new Date(booking.start_time) > new Date()
    if (filter === 'pending') return booking.status === 'pending'
    if (filter === 'history') return booking.status === 'approved' && new Date(booking.start_time) < new Date()
    return true
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">กำลังโหลด...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                การจองของฉัน
              </h1>
              <p className="text-gray-600 text-lg">จัดการการจองห้องของคุณ</p>
            </div>
            <Link
              href="/rooms"
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              จองห้องใหม่
            </Link>
          </div>
        </div>

        {/* Filter Tabs  */}
        <div className="mb-8 bg-white rounded-xl shadow-lg border-2 border-gray-200 p-2">
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'all', label: 'ทั้งหมด', icon: '📋', count: bookings.length },
              { key: 'upcoming', label: 'การจองที่จะมาถึง', icon: '📅', count: bookings.filter(b => b.status === 'approved' && new Date(b.start_time) > new Date()).length },
              { key: 'pending', label: 'รออนุมัติ', icon: '⏳', count: bookings.filter(b => b.status === 'pending').length },
              { key: 'history', label: 'ประวัติการจอง', icon: '📚', count: bookings.filter(b => b.status === 'approved' && new Date(b.start_time) < new Date()).length }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`flex items-center px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${filter === tab.key
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
              >
                <span className="mr-2">{tab.icon}</span>
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${filter === tab.key
                    ? 'bg-white/20 text-white'
                    : 'bg-blue-100 text-blue-700'
                    }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
              <button
                onClick={fetchBookings}
                className="ml-4 text-sm font-medium text-red-600 hover:text-red-800 underline"
              >
                ลองใหม่
              </button>
            </div>
          </div>
        )}

        {/* Bookings List */}
        <div className="space-y-6">
          {filteredBookings.map((booking) => (
            <div key={booking.id} className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 hover:shadow-2xl transition-all duration-300 flex flex-col md:flex-row">
              {/* Left: Image & Room Info */}
              <div className="md:w-1/3 lg:w-1/4 bg-gray-100 relative min-h-[200px] md:min-h-0">
                {booking.room?.image ? (
                  <img
                    src={`http://127.0.0.1:8000/${booking.room.image}`}
                    alt={booking.room.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-100">
                    <svg className="w-16 h-16 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                )}
                <div className="absolute top-4 left-4">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold shadow-md bg-white/90 backdrop-blur-sm ${booking.status === 'approved' ? 'text-green-600' :
                    booking.status === 'pending' ? 'text-yellow-600' :
                      booking.status === 'rejected' ? 'text-red-600' : 'text-gray-600'
                    }`}>
                    {getStatusText(booking.status)}
                  </span>
                </div>
              </div>

              {/* Middle: Booking Details */}
              <div className="flex-1 p-6 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-2xl font-bold text-gray-900">{booking.room?.name}</h3>
                    <span className="text-xs font-mono text-gray-400 bg-gray-50 px-2 py-1 rounded">#{booking.id}</span>
                  </div>
                  <div className="flex items-center text-gray-600 mb-4 text-sm">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {booking.room?.location || 'ไม่ระบุสถานที่'}
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-blue-50/50 rounded-lg p-3 border border-blue-100">
                      <p className="text-xs text-blue-600 font-semibold mb-1">เวลาที่จอง</p>
                      <div className="flex flex-col">
                        <span className="text-gray-900 font-bold">
                          {formatDateTimeToThai(booking.start_time)}
                        </span>
                        <span className="text-xs text-gray-500 mt-1">
                          ถึง {formatDateTimeToThai(booking.end_time)}
                        </span>
                      </div>
                    </div>
                    <div className="bg-purple-50/50 rounded-lg p-3 border border-purple-100">
                      <p className="text-xs text-purple-600 font-semibold mb-1">ข้อมูลอื่นๆ</p>
                      <p className="text-sm text-gray-700 truncate"><span className="font-semibold">จองโดย:</span> {booking.user?.name || 'ไม่ระบุ'}</p>
                      <p className="text-sm text-gray-700 truncate"><span className="font-semibold">จุดประสงค์:</span> {booking.purpose}</p>
                      {booking.notes && <p className="text-sm text-gray-500 truncate mt-1">Note: {booking.notes}</p>}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                  {booking.status === 'pending' && (
                    <button
                      onClick={() => {
                        Swal.fire({
                          title: 'ยืนยันการยกเลิก?',
                          text: "คุณแน่ใจหรือไม่ที่จะยกเลิกการจองนี้?",
                          icon: 'warning',
                          showCancelButton: true,
                          confirmButtonColor: '#ef4444',
                          cancelButtonColor: '#3b82f6',
                          confirmButtonText: 'ยืนยัน',
                          cancelButtonText: 'ไม่'
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

                              if (!response.ok) {
                                const errorText = await response.text()
                                Swal.fire('เกิดข้อผิดพลาด', `ไม่สามารถยกเลิกการจองได้: ${errorText}`, 'error')
                                return
                              }

                              const data = await response.json()
                              if (data.success) {
                                Swal.fire('ยกเลิกสำเร็จ!', 'การจองของคุณถูกยกเลิกแล้ว', 'success')
                                fetchBookings()
                              }
                            } catch (error) {
                              Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้', 'error')
                            }
                          }
                        })
                      }}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      ยกเลิก
                    </button>
                  )}

                  {booking.status === 'approved' && new Date(booking.start_time) > new Date() && (
                    <>
                      <button
                        onClick={() => {
                          setSelectedBooking(booking)
                          setShowRescheduleModal(true)
                        }}
                        className="bg-orange-100 hover:bg-orange-200 text-orange-700 px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        เลื่อนจอง
                      </button>

                      <button
                        onClick={() => {
                          Swal.fire({
                            title: 'ยืนยันการยกเลิก?',
                            text: "คุณแน่ใจหรือไม่ที่จะยกเลิกการจองนี้?",
                            icon: 'warning',
                            showCancelButton: true,
                            confirmButtonColor: '#ef4444',
                            cancelButtonColor: '#3b82f6',
                            confirmButtonText: 'ยืนยัน',
                            cancelButtonText: 'ไม่'
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

                                if (!response.ok) {
                                  const errorText = await response.text()
                                  Swal.fire('เกิดข้อผิดพลาด', `ไม่สามารถยกเลิกการจองได้: ${errorText}`, 'error')
                                  return
                                }

                                const data = await response.json()
                                if (data.success) {
                                  Swal.fire('ยกเลิกสำเร็จ!', 'การจองของคุณถูกยกเลิกแล้ว', 'success')
                                  fetchBookings()
                                }
                              } catch (error) {
                                Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้', 'error')
                              }
                            }
                          })
                        }}
                        className="bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        ยกเลิก
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredBookings.length === 0 && (
          <div className="text-center py-16">
            <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-200 p-12 max-w-md mx-auto">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-12 h-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                {filter === 'all' ? 'ยังไม่มีการจอง' :
                  filter === 'upcoming' ? 'ไม่มีการจองที่จะมาถึง' :
                    filter === 'pending' ? 'ไม่มีการจองรออนุมัติ' :
                      'ไม่มีประวัติการจอง'}
              </h3>
              <p className="text-gray-600 mb-8 text-lg">
                {filter === 'all' ? 'เริ่มต้นการจองห้องของคุณเพื่อใช้งานระบบ' : 'ลองเปลี่ยนตัวกรองดูหรือจองห้องใหม่'}
              </p>
              <div className="space-y-4">
                {filter === 'all' && (
                  <Link
                    href="/rooms"
                    className="inline-flex items-center bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-3 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    ดูห้องทั้งหมด
                  </Link>
                )}
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <p className="text-sm text-blue-800 font-medium">
                    💡 เคล็ดลับ: คุณสามารถจองห้องได้หลายห้องพร้อมกัน
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

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
