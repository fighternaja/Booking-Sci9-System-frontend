'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import BookingCalendar from '../../../components/BookingCalendar'
import { useAuth } from '../../../contexts/AuthContext'

export default function BookRoomPage() {
  const [room, setRoom] = useState(null)
  const [loading, setLoading] = useState(true)
  const [todayBookings, setTodayBookings] = useState([])
  const { user } = useAuth()
  const params = useParams()
  const router = useRouter()

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }
    fetchRoom()
  }, [user, router])

  useEffect(() => {
    if (room) {
      fetchTodayBookings()
    }
  }, [room])

  const fetchRoom = async () => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/rooms/${params.id}`, {
        headers: {
          'Accept': 'application/json',
        }
      })

      if (!response.ok) {
        console.error('Error fetching room: HTTP', response.status)
        return
      }

      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        console.error('Non-JSON response:', text)
        return
      }

      const data = await response.json()

      if (data.success) {
        setRoom(data.data)
      }
    } catch (error) {
      console.error('Error fetching room:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchTodayBookings = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const response = await fetch(
        `http://127.0.0.1:8000/api/rooms/${params.id}/bookings?date=${today}`,
        {
          headers: {
            'Accept': 'application/json',
          }
        }
      )

      if (!response.ok) {
        console.error('Error fetching today bookings: HTTP', response.status)
        return
      }

      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        console.error('Non-JSON response:', text)
        return
      }

      const data = await response.json()

      if (data.success) {
        // กรองการจองที่ยกเลิกแล้วและปฏิเสธแล้วออก
        const filteredBookings = (data.data || []).filter(
          booking => booking.status !== 'cancelled' && booking.status !== 'rejected'
        )
        setTodayBookings(filteredBookings)
      }
    } catch (error) {
      console.error('Error fetching today bookings:', error)
    }
  }


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

  if (!room) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">ไม่พบห้อง</h1>
          <p className="text-gray-600">ห้องที่คุณกำลังมองหาไม่มีอยู่</p>
        </div>
      </div>
    )
  }

  const formatTime = (timeString) => {
    const date = new Date(timeString)
    const hour = String(date.getHours()).padStart(2, '0')
    const minute = String(date.getMinutes()).padStart(2, '0')
    return `${hour}:${minute} น.`
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-8">
        <div className="flex flex-col gap-8">
          {/* Top Section - Room Details & Image */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="flex flex-col md:flex-row">
              {/* Room Image - Left Side */}
              <div className="md:w-1/2 lg:w-2/5 relative h-64 md:h-auto min-h-[300px] bg-gray-200">
                {room.image ? (
                  <img
                    src={`http://127.0.0.1:8000/${room.image}`}
                    alt={room.name}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                    <svg className="w-24 h-24 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Details - Right Side */}
              <div className="md:w-1/2 lg:w-3/5 p-6 md:p-8 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-3xl font-bold text-gray-900 mb-2">{room.name}</h2>
                      <div className="flex gap-2 flex-wrap">
                        {room.floor && (
                          <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                            ชั้น {room.floor}
                          </span>
                        )}
                        {room.location && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {room.location}
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Capacity Badge */}
                    <div className="flex items-center bg-gray-100 px-4 py-2 rounded-lg">
                      <svg className="w-5 h-5 text-gray-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <span className="font-semibold text-gray-800">{room.capacity} คน</span>
                    </div>
                  </div>

                  {room.description && (
                    <p className="text-gray-600 text-lg mb-6 leading-relaxed">{room.description}</p>
                  )}

                  {/* Equipment Section */}
                  {room.amenities?.equipment && room.amenities.equipment.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                        🛠️ อุปกรณ์ในห้อง
                      </h3>
                      <div className="grid grid-cols-2 gap-2">
                        {room.amenities.equipment.map((eq, index) => (
                          <div key={index} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-purple-50 text-purple-900 border border-purple-200">
                            <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span>{eq.name}</span>
                            {eq.quantity && <span className="text-purple-600">({eq.quantity})</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Facilities Section */}
                  {room.amenities?.facilities && room.amenities.facilities.length > 0 && (
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        🏢 สิ่งอำนวยความสะดวก
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {room.amenities.facilities.map((facility, index) => (
                          <span key={index} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-50 text-blue-900 border border-blue-200">
                            <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            {facility}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Legacy amenities support (if still using old format) */}
                  {room.amenities && Array.isArray(room.amenities) && room.amenities.length > 0 && (
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">สิ่งอำนวยความสะดวก</h3>
                      <div className="flex flex-wrap gap-2">
                        {room.amenities.map((amenity, index) => (
                          <span key={index} className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-50 text-gray-700 border border-gray-200">
                            {amenity}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Today's bookings summary */}
                {todayBookings.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-gray-100">
                    <p className="text-sm text-gray-500 font-medium mb-2">การจองวันนี้ ({todayBookings.length})</p>
                    <div className="flex -space-x-2 overflow-hidden">
                      {todayBookings.slice(0, 5).map((booking, i) => (
                        <div key={i} className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-blue-100 flex items-center justify-center text-xs text-blue-600 font-bold" title={`${formatTime(booking.start_time)} - ${formatTime(booking.end_time)}`}>
                          {booking.user?.name?.charAt(0) || '?'}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Section - Calendar */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 md:p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <span className="bg-blue-100 text-blue-600 p-2 rounded-lg mr-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </span>
              ปฏิทินการจองห้อง
            </h3>
            <div className="w-full">
              <BookingCalendar roomId={room.id} room={room} onBookingSuccess={fetchTodayBookings} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
