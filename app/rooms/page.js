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
  const { user } = useAuth()

  useEffect(() => {
    fetchRooms()
    fetchRoomTypes()
    fetchStatuses()
  }, [])

  const fetchRooms = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/rooms', {
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
        setRooms(data.data)
      }
    } catch (error) {
      console.error('Error fetching rooms:', error)
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">ห้องทั้งหมด</h1>
          <p className="text-gray-600">เลือกห้องที่เหมาะกับความต้องการของคุณ</p>
          
          {/* Search and Filter Bar */}
          <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search Bar */}
              <div className="flex-1">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="ค้นหาห้องประชุม..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              {/* Room Type Filter */}
              <div className="lg:w-48">
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">ประเภทห้อง</option>
                  {Object.entries(roomTypes).map(([key, value]) => (
                    <option key={key} value={key}>{value}</option>
                  ))}
                </select>
              </div>
              
              {/* Status Filter */}
              <div className="lg:w-48">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">ทุกสถานะ</option>
                  {Object.entries(statuses).map(([key, value]) => (
                    <option key={key} value={key}>{value}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          
          
          {/* Status Legend */}
          <div className="mt-4 flex items-center space-x-6 text-sm">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
              <span className="text-gray-600">ว่าง</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-orange-500 rounded-full mr-2"></div>
              <span className="text-gray-600">มีการจอง</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
              <span className="text-gray-600">ซ่อมบำรุง</span>
            </div>
          </div>
        </div>
        
        {!user && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-blue-800">
                <Link href="/register" className="font-semibold underline">สมัครสมาชิก</Link> เพื่อจองห้อง
              </p>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRooms.map((room) => (
            <div key={room.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow relative">
              {/* Status Badge */}
              <div className="absolute top-4 right-4 z-10">
                {room.status === 'available' ? (
                  <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                    ว่าง
                  </span>
                ) : room.status === 'maintenance' ? (
                  <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                    ซ่อมบำรุง
                  </span>
                ) : room.status === 'occupied' ? (
                  <span className="bg-orange-100 text-orange-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                    ถูกใช้งาน
                  </span>
                ) : (
                  <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                    จองแล้ว
                  </span>
                )}
              </div>
              
              <div className="h-48 bg-gray-200 flex items-center justify-center">
                {room.image ? (
                  <img
                    src={`http://127.0.0.1:8000/${room.image}`}
                    alt={room.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-gray-400 text-center">
                    <svg className="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <p>ไม่มีรูปภาพ</p>
                  </div>
                )}
              </div>
              
              <div className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-semibold text-gray-900">{room.name}</h3>
                  <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                    {roomTypes[room.room_type] || room.room_type}
                  </span>
                </div>
                <p className="text-gray-600 mb-4 line-clamp-2">{room.description}</p>
                
                <div className="flex items-center text-sm text-gray-500 mb-2">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {room.location}
                  {room.floor && ` ชั้น ${room.floor}`}
                </div>
                
                <div className="flex items-center text-sm text-gray-500 mb-4">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                  ความจุ {room.capacity} คน
                </div>

                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-500">
                    <span className={`font-medium ${
                      room.status === 'available' ? 'text-green-600' :
                      room.status === 'maintenance' ? 'text-red-600' :
                      room.status === 'occupied' ? 'text-orange-600' :
                      'text-blue-600'
                    }`}>
                      {statuses[room.status] || room.status}
                    </span>
                  </div>
                  
                  {user ? (
                    room.status === 'available' ? (
                      <Link
                        href={`/rooms/${room.id}/book`}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                      >
                        จองห้อง
                      </Link>
                    ) : (
                      <span className="bg-gray-400 text-white px-4 py-2 rounded-lg font-semibold cursor-not-allowed">
                        ไม่สามารถจองได้
                      </span>
                    )
                  ) : (
                    <Link
                      href="/register"
                      className="bg-gray-400 text-white px-4 py-2 rounded-lg font-semibold cursor-not-allowed"
                    >
                      ต้องสมัครสมาชิก
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredRooms.length === 0 && (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {selectedType === 'all' ? 'ไม่มีห้องให้เลือก' : `ไม่มีห้องประเภท ${roomTypes[selectedType] || selectedType}`}
            </h3>
            <p className="text-gray-600">
              {selectedType === 'all' 
                ? 'กรุณาติดต่อผู้ดูแลระบบ' 
                : 'ลองเลือกประเภทอื่นหรือดูห้องทั้งหมด'
              }
            </p>
            {selectedType !== 'all' && (
              <button
                onClick={() => setSelectedType('all')}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
