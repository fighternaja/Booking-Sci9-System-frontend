'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function RoomsPage() {
  const [rooms, setRooms] = useState([])
  const [roomTypes, setRoomTypes] = useState({})
  const [statuses, setStatuses] = useState({})
  const [loading, setLoading] = useState(true)
  const [selectedType, setSelectedType] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [roomBookings, setRoomBookings] = useState({}) // เก็บข้อมูลการจองของแต่ละห้อง
  const { user } = useAuth()

  useEffect(() => {
    fetchRooms()
    fetchRoomTypes()
    fetchStatuses()
  }, [])

  useEffect(() => {
    // ดึงข้อมูลการจองของแต่ละห้องเมื่อ rooms โหลดเสร็จ
    if (rooms.length > 0) {
      rooms.forEach(room => {
        fetchRoomBookings(room.id)
      })
    }
  }, [rooms])

  // ฟังก์ชันคำนวณ week number ของปี
  const getWeekNumber = (date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    const dayNum = d.getUTCDay() || 7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
  }

  // ฟังก์ชันดึงข้อมูลการจองของห้อง
  const fetchRoomBookings = async (roomId) => {
    try {
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

      const response = await fetch(
        `http://127.0.0.1:8000/api/rooms/${roomId}/bookings?start_date=${startOfMonth.toISOString().split('T')[0]}&end_date=${endOfMonth.toISOString().split('T')[0]}`,
        {
          headers: {
            'Accept': 'application/json',
          }
        }
      )

      if (!response.ok) {
        return
      }

      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        return
      }

      const data = await response.json()

      if (data.success && data.data) {
        // คำนวณ week numbers ที่มีการจอง
        const bookedWeeks = new Set()
        data.data.forEach(booking => {
          const startDate = new Date(booking.start_time)
          const weekNum = getWeekNumber(startDate)
          bookedWeeks.add(weekNum)
        })

        setRoomBookings(prev => ({
          ...prev,
          [roomId]: Array.from(bookedWeeks).sort((a, b) => a - b)
        }))
      }
    } catch (error) {
      console.error('Error fetching room bookings:', error)
    }
  }

  const fetchRooms = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/rooms', {
        headers: {
          'Accept': 'application/json',
        }
      })

      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP Error: ${response.status}`
        try {
          const errorData = JSON.parse(errorText)
          errorMessage = errorData.message || errorMessage
        } catch (e) {
          errorMessage = errorText || errorMessage
        }
        console.error('Error fetching rooms:', errorMessage)
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
        setRooms(data.data || [])
      } else {
        console.error('API returned unsuccessful response:', data.message || 'Unknown error')
      }
    } catch (error) {
      console.error('Error fetching rooms:', error.message || error)
    } finally {
      setLoading(false)
    }
  }

  const fetchRoomTypes = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/rooms/types', {
        headers: {
          'Accept': 'application/json',
        }
      })

      if (!response.ok) {
        console.error('HTTP Error:', response.status)
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
        setRoomTypes(data.data)
      }
    } catch (error) {
      console.error('Error fetching room types:', error)
    }
  }

  const fetchStatuses = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/rooms/statuses', {
        headers: {
          'Accept': 'application/json',
        }
      })

      if (!response.ok) {
        console.error('HTTP Error:', response.status)
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
        setStatuses(data.data)
      }
    } catch (error) {
      console.error('Error fetching statuses:', error)
    }
  }


  const filteredRooms = rooms.filter(room => {
    // Filter by room type
    const typeMatch = selectedType === 'all' || room.room_type === selectedType

    // Filter by status
    const statusMatch = selectedStatus === 'all' || room.status === selectedStatus

    // Filter by search query
    const searchMatch = searchQuery === '' ||
      room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      room.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      room.location?.toLowerCase().includes(searchQuery.toLowerCase())

    return typeMatch && statusMatch && searchMatch
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-12">
        <div className="mb-8">
          <div className="mb-6">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent mb-2">
              ห้องทั้งหมด
            </h1>
            <p className="text-gray-600 text-lg">เลือกห้องที่เหมาะกับความต้องการของคุณ</p>
          </div>

          {/* Search and Filter Bar */}
          <div className="mt-6 bg-gradient-to-r from-white to-gray-50 rounded-xl shadow-lg border-2 border-gray-200 p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search Bar */}
              <div className="flex-1">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="ค้นหาห้องประชุม..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="block w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder-gray-400 transition-all"
                  />
                </div>
              </div>

              {/* Room Type Filter */}
              <div className="lg:w-56">
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="block w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white text-gray-900 font-medium transition-all"
                >
                  <option value="all">ประเภทห้อง</option>
                  {Object.entries(roomTypes).map(([key, value]) => (
                    <option key={key} value={key}>{value}</option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div className="lg:w-56">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="block w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900 font-medium transition-all"
                >
                  <option value="all">ทุกสถานะ</option>
                  {Object.entries(statuses).map(([key, value]) => (
                    <option key={key} value={key}>{value}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {!user && (
          <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-2 border-blue-200 rounded-xl p-5 mb-8 shadow-md">
            <div className="flex items-center">
              <div className="p-2 bg-blue-500 rounded-full mr-3">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-blue-800 font-medium">
                <Link href="/register" className="font-bold text-blue-600 hover:text-blue-800 underline decoration-2">สมัครสมาชิก</Link> เพื่อจองห้อง
              </p>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRooms.map((room) => (
            <div key={room.id} className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 relative border-2 border-gray-100">
              <div className="h-56 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center overflow-hidden relative">
                {room.image ? (
                  <img
                    src={`http://127.0.0.1:8000/${room.image}`}
                    alt={room.name}
                    className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                  />
                ) : (
                  <div className="text-gray-400 text-center">
                    <div className="w-20 h-20 mx-auto mb-3 bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center">
                      <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium">ไม่มีรูปภาพ</p>
                  </div>
                )}
              </div>

              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xl font-bold text-gray-900">{room.name}</h3>
                  <span className="bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full border border-blue-200">
                    {roomTypes[room.room_type] || room.room_type}
                  </span>
                </div>
                <p className="text-gray-600 mb-4 line-clamp-2 min-h-[2.5rem]">{room.description || 'ไม่มีคำอธิบาย'}</p>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
                    <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="font-medium">{room.location}{room.floor && ` • ชั้น ${room.floor}`}</span>
                  </div>

                  <div className="flex items-center text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
                    <svg className="w-5 h-5 mr-2 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                    <span className="font-medium">ความจุ {room.capacity} คน</span>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                  <div className="text-sm">
                    <span className={`font-bold ${room.status === 'available' ? 'text-green-600' :
                      room.status === 'maintenance' ? 'text-red-600' :
                        room.status === 'occupied' ? 'text-orange-600' :
                          'text-blue-600'
                      }`}>
                      {room.status === 'occupied' ? 'ห้องนี้ถูกจองแล้ว' :
                        room.status === 'available' ? 'ว่าง' :
                          room.status === 'weekly' ? 'เป็นรายอาทิตย์' :
                            statuses[room.status] || room.status}
                    </span>
                  </div>

                  {user ? (
                    room.status === 'available' ? (
                      <Link
                        href={`/rooms/${room.id}/book`}
                        className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-5 py-2.5 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg transform hover:scale-105"
                      >
                        จองห้อง
                      </Link>
                    ) : (
                      <span className="bg-gray-300 text-gray-600 px-5 py-2.5 rounded-lg font-semibold cursor-not-allowed">
                        ไม่สามารถจองได้
                      </span>
                    )
                  ) : (
                    <Link
                      href="/register"
                      className="bg-gradient-to-r from-gray-400 to-gray-500 hover:from-gray-500 hover:to-gray-600 text-white px-5 py-2.5 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
                    >
                      สมัครสมาชิก
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredRooms.length === 0 && (
          <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border-2 border-gray-200">
            <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              {selectedType === 'all' ? 'ไม่มีห้องให้เลือก' : `ไม่มีห้องประเภท ${roomTypes[selectedType] || selectedType}`}
            </h3>
            <p className="text-gray-600 mb-6">
              {selectedType === 'all'
                ? 'กรุณาติดต่อผู้ดูแลระบบ'
                : 'ลองเลือกประเภทอื่นหรือดูห้องทั้งหมด'
              }
            </p>
            {selectedType !== 'all' && (
              <button
                onClick={() => setSelectedType('all')}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg transform hover:scale-105"
              >
                ดูห้องทั้งหมด
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
