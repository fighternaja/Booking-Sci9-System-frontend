'use client'

import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { convertDDMMYYYYToISO } from '../../utils/dateUtils'

export default function AdminSchedulePage() {
  const [rooms, setRooms] = useState([])
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedRoom, setSelectedRoom] = useState('')
  const [academicYear, setAcademicYear] = useState('2568')
  const [selectedSemester, setSelectedSemester] = useState(1)
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [apiError, setApiError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [roomsLoading, setRoomsLoading] = useState(true)
  const dateInputRef = useRef(null)
  const { token } = useAuth()


  useEffect(() => {
    fetchData()
  }, [selectedDate])

  // Fetch rooms when component mounts
  useEffect(() => {
    fetchRooms()
  }, [])

  const fetchRooms = async () => {
    setRoomsLoading(true)
    try {
      const response = await fetch('http://127.0.0.1:8000/api/rooms', {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json()
          if (data.success) {
            setRooms(data.data)
            setApiError(false)
            setErrorMessage('')
            setRoomsLoading(false)
            return
          }
        }
      }
      
      // If API fails, use mock data
      const mockRooms = [
        { id: 1, name: 'Sci9 201(COM)', description: 'ห้องคอมพิวเตอร์', capacity: 50, location: 'ชั้น 2 ห้อง 1' },
        { id: 2, name: 'Sci9 203(HardWare)', description: 'ห้องคอมพิวเตอร์', capacity: 50, location: 'ชั้น 2 ห้อง 3' },
        { id: 3, name: 'Sci9 204(COM)', description: '', capacity: 10, location: 'ชั้น 2 ห้อง 4' },
        { id: 4, name: 'Sci9 205(COM)', description: 'ห้องคอมพิวเตอร์', capacity: 24, location: 'ชั้น 4 อาคาร B' },
        { id: 5, name: 'Sci9 301(COM)', description: 'ห้องคอมพิวเตอร์', capacity: 49, location: 'ชั้น 3 ห้อง 1' },
        { id: 6, name: 'Sci9 302(SmB)', description: 'ห้องเรียน', capacity: 50, location: 'ชั้น 3 ห้อง 2' },
        { id: 7, name: 'Sci9 303(Com)', description: 'ห้องคอมพิวเตอร์', capacity: 48, location: 'ชั้น 3 ห้อง 3' },
        { id: 8, name: 'Sci9 304(Com)', description: 'ห้องคอมพิวเตอร์', capacity: 40, location: 'ชั้น 3 ห้อง 4' },
        { id: 9, name: 'Sci9 306(Com)', description: 'ห้องคอมพิวเตอร์', capacity: 50, location: 'ชั้น 3 ห้อง 5' },
        { id: 10, name: 'Sci9 402)', description: 'ห้องประชุม', capacity: 40, location: 'ชั้น 4 ห้อง 2' },
        { id: 11, name: 'Sci9 403(Com)', description: 'ห้องคอมพิวเตอร์', capacity: 24, location: 'ชั้น 4 ห้อง 3' },
        { id: 12, name: 'Sci9 405', description: 'ห้องเรียน', capacity: 48, location: 'ชั้น 4 ห้อง 5' }
      ]
      setRooms(mockRooms)
      setApiError(true)
      setErrorMessage('ไม่สามารถเชื่อมต่อกับ API ได้ กำลังใช้ข้อมูลจำลอง')
      
    } catch (error) {
      console.error('Error fetching rooms:', error)
      setApiError(true)
      setErrorMessage('เกิดข้อผิดพลาดในการโหลดข้อมูลห้อง')
    } finally {
      setRoomsLoading(false)
    }
  }

  const fetchData = async () => {
    try {
      // Mock rooms data for fallback (based on RoomSeeder)
      const mockRooms = [
        { id: 1, name: 'Sci9 201(COM)', description: 'ห้องคอมพิวเตอร์', capacity: 50, location: 'ชั้น 2 ห้อง 1' },
        { id: 2, name: 'Sci9 203(HardWare)', description: 'ห้องคอมพิวเตอร์', capacity: 50, location: 'ชั้น 2 ห้อง 3' },
        { id: 3, name: 'Sci9 204(COM)', description: '', capacity: 10, location: 'ชั้น 2 ห้อง 4' },
        { id: 4, name: 'Sci9 205(COM)', description: 'ห้องคอมพิวเตอร์', capacity: 24, location: 'ชั้น 4 อาคาร B' },
        { id: 5, name: 'Sci9 301(COM)', description: 'ห้องคอมพิวเตอร์', capacity: 49, location: 'ชั้น 3 ห้อง 1' },
        { id: 6, name: 'Sci9 302(SmB)', description: 'ห้องเรียน', capacity: 50, location: 'ชั้น 3 ห้อง 2' },
        { id: 7, name: 'Sci9 303(Com)', description: 'ห้องคอมพิวเตอร์', capacity: 48, location: 'ชั้น 3 ห้อง 3' },
        { id: 8, name: 'Sci9 304(Com)', description: 'ห้องคอมพิวเตอร์', capacity: 40, location: 'ชั้น 3 ห้อง 4' },
        { id: 9, name: 'Sci9 306(Com)', description: 'ห้องคอมพิวเตอร์', capacity: 50, location: 'ชั้น 3 ห้อง 5' },
        { id: 10, name: 'Sci9 402)', description: 'ห้องประชุม', capacity: 40, location: 'ชั้น 4 ห้อง 2' },
        { id: 11, name: 'Sci9 403(Com)', description: 'ห้องคอมพิวเตอร์', capacity: 24, location: 'ชั้น 4 ห้อง 3' },
        { id: 12, name: 'Sci9 405', description: 'ห้องเรียน', capacity: 48, location: 'ชั้น 4 ห้อง 5' }
      ]

      // Try to fetch rooms from API
      try {
        const roomsResponse = await fetch('http://127.0.0.1:8000/api/rooms', {
          headers: {
            'Accept': 'application/json'
          }
        })
        
        if (roomsResponse.ok) {
          const contentType = roomsResponse.headers.get('content-type')
          if (contentType && contentType.includes('application/json')) {
            const roomsData = await roomsResponse.json()
            if (roomsData.success) {
              setRooms(roomsData.data)
            } else {
              setRooms(mockRooms)
            }
          } else {
            console.warn('API returned non-JSON response, using mock data')
            setRooms(mockRooms)
          }
        } else {
          console.warn('API request failed, using mock data')
          setRooms(mockRooms)
        }
      } catch (apiError) {
        console.warn('API connection failed, using mock data:', apiError.message)
        setRooms(mockRooms)
        setApiError(true)
        setErrorMessage('ไม่สามารถเชื่อมต่อกับ API ได้ กำลังใช้ข้อมูลจำลอง')
      }

      // Try to fetch bookings for selected date
      if (token) {
        try {
          const bookingsResponse = await fetch(`http://127.0.0.1:8000/api/bookings?date=${selectedDate}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json'
            }
          })
          
          if (bookingsResponse.ok) {
            const contentType = bookingsResponse.headers.get('content-type')
            if (contentType && contentType.includes('application/json')) {
              const bookingsData = await bookingsResponse.json()
              if (bookingsData.success) {
                setBookings(bookingsData.data)
              }
            }
          }
        } catch (bookingError) {
          console.warn('Failed to fetch bookings:', bookingError.message)
          setBookings([])
        }
      }
    } catch (error) {
      console.error('Error in fetchData:', error)
    } finally {
      setLoading(false)
    }
  }

  const getBookingsForRoom = (roomId) => {
    return bookings.filter(booking => booking.room_id === roomId)
  }

  const formatTime = (timeString) => {
    return new Date(timeString).toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'approved':
        return 'อนุมัติแล้ว'
      case 'pending':
        return 'รออนุมัติ'
      case 'rejected':
        return 'ปฏิเสธ'
      default:
        return 'ไม่ทราบสถานะ'
    }
  }

  const handleDisplayDateChange = (e) => {
    const value = e.target.value
    if (value.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      const isoDate = convertDDMMYYYYToISO(value)
      setSelectedDate(isoDate)
    }
  }

  // Get week start and end dates
  const getWeekDates = (date) => {
    const start = new Date(date)
    const day = start.getDay()
    const diff = start.getDate() - day + (day === 0 ? -6 : 1) // Monday as first day
    start.setDate(diff)
    
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    
    return { start, end }
  }

  // Format date for display (DD/MM/YYYY)
  const formatDate = (date) => {
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  }

  // Navigate to previous/next week
  const navigateWeek = (direction) => {
    const newWeek = new Date(currentWeek)
    newWeek.setDate(newWeek.getDate() + (direction * 7))
    setCurrentWeek(newWeek)
  }

  // Get week range display
  const weekRange = getWeekDates(currentWeek)
  const weekRangeText = `${formatDate(weekRange.start)} - ${formatDate(weekRange.end)}`

  // Handle semester selection
  const handleSemesterChange = (semester) => {
    setSelectedSemester(semester)
    // You can add logic here to filter data by semester
    console.log(`Selected semester: ${semester}`)
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Error Alert */}
      {apiError && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">แจ้งเตือน</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>{errorMessage}</p>
                <p className="mt-1">กรุณาตรวจสอบว่า Laravel backend กำลังทำงานอยู่ที่ http://127.0.0.1:8000</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-orange-600 mb-4">ตารางการใช้ห้อง</h1>
        
        {/* Controls Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Academic Year and Week Navigation Combined */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">คุณลักษณะ</label>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">ปีการศึกษา</span>
                  <select 
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="2567">2567</option>
                    <option value="2568">2568</option>
                    <option value="2569">2569</option>
                  </select>
                  <div className="flex space-x-1">
                    <button 
                      onClick={() => handleSemesterChange(1)}
                      className={`px-3 py-1 text-sm rounded transition-colors ${
                        selectedSemester === 1 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      }`}
                    >
                      1
                    </button>
                    <button 
                      onClick={() => handleSemesterChange(2)}
                      className={`px-3 py-1 text-sm rounded transition-colors ${
                        selectedSemester === 2 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      }`}
                    >
                      2
                    </button>
                    <button 
                      onClick={() => handleSemesterChange(3)}
                      className={`px-3 py-1 text-sm rounded transition-colors ${
                        selectedSemester === 3 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      }`}
                    >
                      3
                    </button>
                  </div>
                </div>
                
                {/* Week Navigation - Now inline with Academic Year */}
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium text-gray-700">ระหว่าง</span>
                  <button 
                    onClick={() => navigateWeek(-1)}
                    className="p-1 hover:bg-gray-100 rounded text-gray-600 hover:text-gray-800"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <span className="text-sm font-medium text-gray-900 px-2">
                    {weekRangeText}
                  </span>
                  <button 
                    onClick={() => navigateWeek(1)}
                    className="p-1 hover:bg-gray-100 rounded text-gray-600 hover:text-gray-800"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Room Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">เลือกห้อง</label>
              <div className="flex space-x-2">
                <select 
                  value={selectedRoom}
                  onChange={(e) => setSelectedRoom(e.target.value)}
                  disabled={roomsLoading}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {roomsLoading ? 'กำลังโหลดข้อมูลห้อง...' : 'เลือกห้อง'}
                  </option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name} - {room.description || 'ไม่มีคำอธิบาย'} (ความจุ: {room.capacity} คน) - {room.location}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    setApiError(false)
                    setErrorMessage('')
                    fetchRooms()
                  }}
                  disabled={roomsLoading}
                  className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  title="รีเฟรชข้อมูลห้อง"
                >
                  {roomsLoading ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Schedule Grid */}
      {selectedRoom && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-4 bg-orange-500 text-white">
            <h2 className="text-xl font-bold">ตารางการใช้ห้อง</h2>
            <p className="text-orange-100">
              ศูนย์/สถานศึกษา แม่ริม อาคารคอมพิวเตอร์
            </p>
            <p className="text-orange-100">
              {rooms.find(r => r.id == selectedRoom)?.name} : {rooms.find(r => r.id == selectedRoom)?.description || 'ไม่มีคำอธิบาย'} 
              ความจุ : {rooms.find(r => r.id == selectedRoom)?.capacity} คน
            </p>
            <p className="text-orange-100 text-sm">
              ที่ตั้ง : {rooms.find(r => r.id == selectedRoom)?.location}
            </p>
            <p className="text-orange-100 text-sm">
              ปีการศึกษา : {academicYear} | เทอม : {selectedSemester}
            </p>
          </div>
          {/* Schedule Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr>
                  <th className="w-16 bg-gray-200 border border-gray-300 p-2 text-center font-medium">วัน/เวลา</th>
                  {Array.from({ length: 13 }, (_, i) => {
                    const hour = 7 + i;
                    const nextHour = hour + 1;
                    return (
                      <th key={hour} className="w-20 bg-gray-600 text-white border border-gray-300 p-2 text-center text-xs font-medium">
                        {hour}:00-{nextHour}:00
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.'].map((day, dayIndex) => {
                  const isWeekend = dayIndex >= 5;
                  
                  
                  return (
                    <tr key={day}>
                      <td className={`border border-gray-300 p-2 text-center font-medium ${
                        isWeekend ? 'bg-red-200 text-red-800' : 'bg-gray-100'
                      }`}>
                        {day}
                      </td>
                      {Array.from({ length: 13 }, (_, hourIndex) => {
                        const hour = 7 + hourIndex;
                        
                        // Check for real bookings only
                        const roomBookings = getBookingsForRoom(selectedRoom);
                        const dayBookings = roomBookings.filter(booking => {
                          const bookingDate = new Date(booking.start_time);
                          const bookingDay = bookingDate.getDay();
                          const dayMapping = [0, 1, 2, 3, 4, 5, 6]; // Sunday=0, Monday=1, etc.
                          return dayMapping[dayIndex] === bookingDay;
                        });
                        
                        const hourBooking = dayBookings.find(booking => {
                          const startHour = new Date(booking.start_time).getHours();
                          return startHour === hour;
                        });

                        const hasBooking = hourBooking;

                        return (
                          <td key={hour} className={`border border-gray-300 p-1 text-center text-xs ${
                            hasBooking ? 'bg-blue-100' : 'bg-gray-50'
                          }`}>
                            {hasBooking ? (
                              <div className="space-y-1">
                                <div className="font-medium text-blue-800">{hourBooking.purpose}</div>
                                <div className="text-blue-600">{hourBooking.user?.name || 'ไม่ระบุ'}</div>
                                <div className="text-blue-500">
                                  {formatTime(hourBooking.start_time)}-{formatTime(hourBooking.end_time)}
                                </div>
                              </div>
                            ) : (
                              <div className="text-gray-400">-</div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!selectedRoom && (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">เลือกห้องเพื่อดูตาราง</h3>
          <p className="text-gray-600">กรุณาเลือกห้องจากรายการด้านบนเพื่อดูตารางการจอง</p>
        </div>
      )}

      {rooms.length === 0 && (
        <div className="text-center py-12">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">ไม่มีห้องในระบบ</h3>
          <p className="text-gray-600">กรุณาเพิ่มห้องก่อนดูตารางการจอง</p>
        </div>
      )}
    </div>
  )
}
