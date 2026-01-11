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
        setTodayBookings(data.data || [])
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
    return date.toLocaleTimeString('th-TH', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Section - Room Details */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden sticky top-8">
              {/* Room Image */}
              <div className="h-64 bg-gray-200 overflow-hidden">
                {room.image ? (
                  <img
                    src={`http://127.0.0.1:8000/${room.image}`}
                    alt={room.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                    <svg className="w-24 h-24 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                )}
              </div>

              <div className="p-6">
                {/* Room Name and Floor */}
                <h2 className="text-2xl font-bold text-gray-900 mb-1">{room.name}</h2>
                {room.floor && (
                  <p className="text-gray-600 mb-6">ชั้น {room.floor}</p>
                )}

                {/* Amenities Section */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">สิ่งอำนวยความสะดวก</h3>
                  <div className="space-y-3">
                    {/* Capacity - Always show */}
                    <div className="flex items-center p-2 bg-gray-50 rounded-lg">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                        </svg>
                      </div>
                      <span className="text-gray-700">รองรับ {room.capacity} คน</span>
                    </div>

                    {/* Amenities from room.amenities array */}
                    {room.amenities && Array.isArray(room.amenities) && room.amenities.map((amenity, index) => {
                      // Map amenity names to icons and colors
                      const getAmenityIcon = (name) => {
                        const lowerName = name.toLowerCase()
                        
                        if (lowerName.includes('wi-fi') || lowerName.includes('wifi') || lowerName.includes('wi-fi')) {
                          return {
                            icon: (
                              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                              </svg>
                            ),
                            bgColor: 'bg-green-100'
                          }
                        }
                        if (lowerName.includes('โปรเจคเตอร์') || lowerName.includes('projector')) {
                          return {
                            icon: (
                              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                            ),
                            bgColor: 'bg-purple-100'
                          }
                        }
                        if (lowerName.includes('ระบบเสียง') || lowerName.includes('sound') || lowerName.includes('audio')) {
                          return {
                            icon: (
                              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                              </svg>
                            ),
                            bgColor: 'bg-indigo-100'
                          }
                        }
                        if (lowerName.includes('เครื่องปรับอากาศ') || lowerName.includes('air') || lowerName.includes('ac')) {
                          return {
                            icon: (
                              <svg className="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                              </svg>
                            ),
                            bgColor: 'bg-cyan-100'
                          }
                        }
                        if (lowerName.includes('กระดาน') || lowerName.includes('whiteboard') || lowerName.includes('ไวท์บอร์ด')) {
                          return {
                            icon: (
                              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            ),
                            bgColor: 'bg-gray-100'
                          }
                        }
                        if (lowerName.includes('คอมพิวเตอร์') || lowerName.includes('computer')) {
                          return {
                            icon: (
                              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                              </svg>
                            ),
                            bgColor: 'bg-blue-100'
                          }
                        }
                        if (lowerName.includes('โต๊ะ') || lowerName.includes('table') || lowerName.includes('desk')) {
                          return {
                            icon: (
                              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                              </svg>
                            ),
                            bgColor: 'bg-amber-100'
                          }
                        }
                        if (lowerName.includes('เก้าอี้') || lowerName.includes('chair')) {
                          return {
                            icon: (
                              <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                              </svg>
                            ),
                            bgColor: 'bg-orange-100'
                          }
                        }
                        // Default icon
                        return {
                          icon: (
                            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ),
                          bgColor: 'bg-gray-100'
                        }
                      }

                      const { icon, bgColor } = getAmenityIcon(amenity)

                      return (
                        <div key={index} className="flex items-center p-2 bg-gray-50 rounded-lg">
                          <div className={`w-10 h-10 ${bgColor} rounded-lg flex items-center justify-center mr-3 flex-shrink-0`}>
                            {icon}
                          </div>
                          <span className="text-gray-700">{amenity}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Today's Bookings Section */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">ตารางการจองวันนี้</h3>
                  {todayBookings.length === 0 ? (
                    <p className="text-gray-500 text-sm">ไม่มีการจองในวันนี้</p>
                  ) : (
                    <div className="space-y-3">
                      {todayBookings.map((booking) => (
                        <div key={booking.id} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-blue-900">{booking.purpose}</span>
                            <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                              {booking.status === 'approved' ? 'อนุมัติ' : 'รออนุมัติ'}
                            </span>
                          </div>
                          <div className="text-xs text-blue-700">
                            {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                          </div>
                          {booking.user && (
                            <div className="text-xs text-blue-600 mt-1">
                              โดย {booking.user.name}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Section - Calendar */}
          <div className="lg:col-span-2">
            <BookingCalendar roomId={room.id} room={room} onBookingSuccess={fetchTodayBookings} />
          </div>
        </div>
      </div>
    </div>
  )
}
