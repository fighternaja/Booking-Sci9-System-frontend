'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import BookingCalendar from '../../../components/BookingCalendar'
import { useAuth } from '../../../contexts/AuthContext'

export default function BookRoomPage() {
  const [room, setRoom] = useState(null)
  const [loading, setLoading] = useState(true)
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

  const fetchRoom = async () => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/rooms/${params.id}`)
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">จองห้อง</h1>
          <p className="text-gray-600">เลือกวันที่และเวลาที่ต้องการจองจากปฏิทิน</p>
        </div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Room Info */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-8">
              <div className="text-center mb-6">
                <div className="h-32 bg-gray-100 rounded-lg mb-4 flex items-center justify-center">
                  {room.image ? (
                    <img
                      src={`http://127.0.0.1:8000/${room.image}`}
                      alt={room.name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <div className="text-gray-400">
                      <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                  )}
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{room.name}</h3>
                <p className="text-sm text-gray-600 mt-1">{room.description}</p>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center text-sm">
                  <svg className="w-4 h-4 text-gray-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-gray-700">{room.location}</span>
                </div>
                
                <div className="flex items-center text-sm">
                  <svg className="w-4 h-4 text-gray-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                  <span className="text-gray-700">ความจุ {room.capacity} คน</span>
                </div>
              </div>

              {/* Instructions วิธีการใช้งาน*/}
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">วิธีใช้งาน</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• คลิกที่ช่องว่างในปฏิทินเพื่อจอง</li>
                  <li>• คลิกที่การจองเพื่อดูรายละเอียด</li>
                  <li>• ใช้ปุ่มนำทางเพื่อเปลี่ยนเดือน</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Calendar */}
          <div className="lg:col-span-3">
            <BookingCalendar roomId={room.id} room={room} />
          </div>
        </div>
      </div>
    </div>
  )
}
