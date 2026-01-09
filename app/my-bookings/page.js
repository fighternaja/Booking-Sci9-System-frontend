'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import RescheduleModal from '../components/RescheduleModal'
import { useAuth } from '../contexts/AuthContext'
import { formatDateTimeToThai } from '../utils/dateUtils'

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [showRescheduleModal, setShowRescheduleModal] = useState(false)
  const { user, token } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }
    fetchBookings()
  }, [user, router])

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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">การจองของฉัน</h1>
          <p className="text-gray-600">จัดการการจองห้องของคุณ</p>
        </div>

        {/* Filter Tabs  */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { key: 'all', label: 'ทั้งหมด' },
                { key: 'upcoming', label: 'การจองที่จะมาถึง' },
                { key: 'pending', label: 'รออนุมัติ' },
                { key: 'history', label: 'ประวัติการจอง' }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    filter === tab.key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Bookings List */}
        <div className="space-y-6">
          {filteredBookings.map((booking) => (
            <div key={booking.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-6">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-xl font-semibold text-gray-900">{booking.room.name}</h3>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(booking.status)}`}>
                      {getStatusText(booking.status)}
                    </span>
                  </div>
                  <p className="text-gray-600 flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {booking.room.location}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">หมายเลขการจอง</p>
                  <p className="font-mono text-sm text-gray-700">#{booking.id.toString().padStart(6, '0')}</p>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-6 mb-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-sm font-medium text-gray-700">วันที่เริ่มต้น</p>
                  </div>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatDateTimeToThai(booking.start_time)}
                  </p>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-sm font-medium text-gray-700">วันที่สิ้นสุด</p>
                  </div>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatDateTimeToThai(booking.end_time)}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <svg className="w-5 h-5 text-purple-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm font-medium text-gray-700">ระยะเวลา</p>
                  </div>
                  <p className="text-lg font-semibold text-gray-900">
                    {booking.duration || Math.ceil((new Date(booking.end_time) - new Date(booking.start_time)) / (1000 * 60 * 60))} ชั่วโมง
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div>
                  <div className="flex items-center mb-2">
                    <svg className="w-5 h-5 text-orange-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm font-medium text-gray-700">วัตถุประสงค์</p>
                  </div>
                  <p className="text-gray-900 font-medium">{booking.purpose}</p>
                </div>
                
                <div>
                  <div className="flex items-center mb-2">
                    <svg className="w-5 h-5 text-indigo-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm font-medium text-gray-700">จองเมื่อ</p>
                  </div>
                  <p className="text-gray-900 font-medium">{formatDateTimeToThai(booking.created_at)}</p>
                </div>
              </div>

              {booking.notes && (
                <div className="bg-blue-50 rounded-lg p-4 mb-6">
                  <div className="flex items-center mb-2">
                    <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <p className="text-sm font-medium text-gray-700">หมายเหตุ</p>
                  </div>
                  <p className="text-gray-800">{booking.notes}</p>
                </div>
              )}

              <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center text-sm text-gray-500">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    จองโดย: {booking.user?.name || user?.name}
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  {booking.status === 'pending' && (
                    <button 
                      onClick={async () => {
                        if (!confirm('คุณแน่ใจหรือไม่ที่จะยกเลิกการจองนี้?')) return
                        try {
                          const response = await fetch(`http://127.0.0.1:8000/api/bookings/${booking.id}`, {
                            method: 'PUT',
                            headers: {
                              'Authorization': `Bearer ${token}`,
                              'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ status: 'cancelled' })
                          })
                          const data = await response.json()
                          if (data.success) {
                            fetchBookings()
                          }
                        } catch (error) {
                          console.error('Error cancelling booking:', error)
                        }
                      }}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      ยกเลิกการจอง
                    </button>
                  )}
                  {booking.status === 'approved' && new Date(booking.start_time) > new Date() && (
                    <>
                      <button 
                        onClick={() => {
                          setSelectedBooking(booking)
                          setShowRescheduleModal(true)
                        }}
                        className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        เลื่อนจอง
                      </button>
                      <button 
                        onClick={async () => {
                          if (!confirm('คุณแน่ใจหรือไม่ที่จะยกเลิกการจองนี้?')) return
                          try {
                            const response = await fetch(`http://127.0.0.1:8000/api/bookings/${booking.id}`, {
                              method: 'PUT',
                              headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                              },
                              body: JSON.stringify({ status: 'cancelled' })
                            })
                            const data = await response.json()
                            if (data.success) {
                              fetchBookings()
                            }
                          } catch (error) {
                            console.error('Error cancelling booking:', error)
                          }
                        }}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        ยกเลิกการจอง
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
            <div className="bg-white rounded-lg shadow-md p-8 max-w-md mx-auto">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {filter === 'all' ? 'ยังไม่มีการจอง' :
                  filter === 'upcoming' ? 'ไม่มีการจองที่จะมาถึง' :
                  filter === 'pending' ? 'ไม่มีการจองรออนุมัติ' :
                  'ไม่มีประวัติการจอง'}
              </h3>
              <p className="text-gray-600 mb-6">
                {filter === 'all' ? 'เริ่มต้นการจองห้องของคุณเพื่อใช้งานระบบ' : 'ลองเปลี่ยนตัวกรองดูหรือจองห้องใหม่'}
              </p>
              <div className="space-y-3">
                {filter === 'all' && (
                  <Link
                    href="/rooms"
                    className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    ดูห้องทั้งหมด
                  </Link>
                )}
                <div className="text-sm text-gray-500">
                  <p> เคล็ดลับ: คุณสามารถจองห้องได้หลายห้องพร้อมกัน </p>
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
