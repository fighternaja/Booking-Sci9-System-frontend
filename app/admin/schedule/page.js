'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { useAuth } from '../../contexts/AuthContext'
import { formatDateToThaiShort } from '../../utils/dateUtils'

export default function AdminSchedulePage() {
  const [rooms, setRooms] = useState([])
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedRoom, setSelectedRoom] = useState('')
  const [academicYear, setAcademicYear] = useState('2568')
  const [selectedSemester, setSelectedSemester] = useState(1)
  const [apiError, setApiError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [roomsLoading, setRoomsLoading] = useState(true)
  const [showImportModal, setShowImportModal] = useState(false)
  const [importedData, setImportedData] = useState([])
  const [importLoading, setImportLoading] = useState(false)
  const [importError, setImportError] = useState('')
  const dateInputRef = useRef(null)
  const fileInputRef = useRef(null)
  const { token, logout } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!token) {
      router.push('/login')
      return
    }
    fetchData()
  }, [selectedDate, token])

  useEffect(() => {
    if (!token) {
      router.push('/login')
      return
    }
    fetchRooms()
  }, [token])

  const fetchRooms = async () => {
    if (!token) {
      setRoomsLoading(false)
      return
    }

    setRoomsLoading(true)
    try {
      const response = await fetch('http://127.0.0.1:8000/api/rooms', {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.status === 401) {
        logout()
        router.push('/login')
        return
      }

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

      // Mock data fallback
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
    if (!token) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const response = await fetch('http://127.0.0.1:8000/api/bookings', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.status === 401) {
        logout()
        router.push('/login')
        return
      }

      if (response.ok) {
        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json()
          if (data.success) {
            setBookings(data.data)
          } else {
            setBookings([])
          }
        } else {
          const text = await response.text()
          console.error('Non-JSON response:', text)
          setBookings([])
        }
      } else {
        // Mock data for development
        setBookings([])
      }
    } catch (error) {
      console.error('Error in fetchData:', error)
      setBookings([])
    } finally {
      setLoading(false)
    }
  }

  // Excel Import Functions
  const handleFileUpload = (event) => {
    const file = event.target.files[0]
    if (!file) return

    if (!file.name.match(/\.(xlsx|xls)$/)) {
      setImportError('กรุณาเลือกไฟล์ Excel (.xlsx หรือ .xls)')
      return
    }

    setImportLoading(true)
    setImportError('')

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

        const processedData = processExcelData(jsonData)
        setImportedData(processedData)
        setShowImportModal(true)
      } catch (error) {
        console.error('Error processing Excel file:', error)
        setImportError('เกิดข้อผิดพลาดในการประมวลผลไฟล์ Excel')
      } finally {
        setImportLoading(false)
      }
    }

    reader.readAsArrayBuffer(file)
  }

  const processExcelData = (data) => {
    if (data.length < 2) {
      setImportError('ไฟล์ Excel ต้องมีข้อมูลอย่างน้อย 2 แถว (หัวข้อและข้อมูล)')
      return []
    }

    const headers = data[0]
    const rows = data.slice(1)

    const expectedHeaders = {
      'room_name': ['ชื่อห้อง', 'Room Name', 'ห้อง', 'room'],
      'user_name': ['ชื่อผู้จอง', 'User Name', 'ผู้จอง', 'user', 'ผู้ใช้'],
      'start_time': ['วันที่เริ่มต้น', 'Start Time', 'เริ่มต้น', 'start', 'เวลาเริ่ม'],
      'end_time': ['วันที่สิ้นสุด', 'End Time', 'สิ้นสุด', 'end', 'เวลาสิ้นสุด'],
      'purpose': ['วัตถุประสงค์', 'Purpose', 'จุดประสงค์', 'course', 'วิชา', 'รหัสวิชา'],
      'section': ['กลุ่ม', 'Section', 'sec', 'หมายเลข'],
      'location': ['ห้อง', 'Location', 'loc', 'สถานที่'],
      'notes': ['หมายเหตุ', 'Notes', 'รายละเอียด', 'note']
    }

    const columnIndices = {}
    headers.forEach((header, index) => {
      Object.keys(expectedHeaders).forEach(key => {
        if (expectedHeaders[key].some(h => header.toLowerCase().includes(h.toLowerCase()))) {
          columnIndices[key] = index
        }
      })
    })

    const roomLookup = new Map(
      rooms.map(r => [normalizeRoomName(r.name), r])
    )

    const processedData = rows.map((row, index) => {
      const rawRoom = row[columnIndices.room_name] || ''
      const normalized = normalizeRoomName(rawRoom)
      const matchedRoom = roomLookup.get(normalized) || null

      const startIso = parseExcelDateTime(row[columnIndices.start_time])
      const endIso = parseExcelDateTime(row[columnIndices.end_time])

      const section = row[columnIndices.section] || ''
      const location = row[columnIndices.location] || ''
      const purpose = row[columnIndices.purpose] || ''

      // Create display text like "COM 2602" for purpose, "51" for section, "L201" for location
      const displayPurpose = purpose || 'การจอง'
      const displaySection = section || 'ไม่ระบุ'
      const displayLocation = location || 'ไม่ระบุ'

      const item = {
        id: `import_${index + 1}`,
        room_name: rawRoom || '',
        user_name: row[columnIndices.user_name] || '',
        start_time: startIso,
        end_time: endIso,
        purpose: displayPurpose,
        section: displaySection,
        location: displayLocation,
        notes: row[columnIndices.notes] || '',
        status: 'pending',
        is_imported: true,
        room_id: matchedRoom?.id || null
      }
      return item
    }).filter(item => item.room_name && item.user_name && item.start_time && item.end_time)

    return processedData
  }

  const handleImportConfirm = async () => {
    if (importedData.length === 0) return

    setImportLoading(true)
    try {
      const newBookings = importedData.map(item => ({
        ...item,
        id: Date.now() + Math.random(),
        room: { name: item.room_name, location: '' },
        user: { name: item.user_name, email: '' }
      }))

      setBookings(prev => [...prev, ...newBookings])
      setShowImportModal(false)
      setImportedData([])
    } catch (error) {
      console.error('Error importing data:', error)
      setImportError('เกิดข้อผิดพลาดในการนำเข้าข้อมูล')
    } finally {
      setImportLoading(false)
    }
  }

  const getBookingsForRoom = (roomId) => {
    return bookings.filter(booking => booking.room_id === roomId)
  }

  const getBookingsForDate = (date) => {
    return bookings.filter(booking => {
      const bookingDate = new Date(booking.start_time).toISOString().split('T')[0]
      return bookingDate === date
    })
  }

  const getBookingsForRoomAndDate = (roomId, date) => {
    return bookings.filter(booking => {
      const bookingDate = new Date(booking.start_time).toISOString().split('T')[0]
      return booking.room_id === roomId && bookingDate === date
    })
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

  // Weekly timetable helpers
  const getWeekStart = (date) => {
    const d = new Date(date)
    const day = d.getDay() === 0 ? 7 : d.getDay() // Monday=1..Sunday=7
    const monday = new Date(d)
    monday.setDate(d.getDate() - (day - 1))
    monday.setHours(0, 0, 0, 0)
    return monday
  }

  const weekStart = getWeekStart(selectedDate)
  const getWeekDays = () => {
    return Array.from({ length: 7 }).map((_, i) => {
      const day = new Date(weekStart)
      day.setDate(weekStart.getDate() + i)
      return day
    })
  }

  const generateTimeSlots = () => {
    const startHour = 7
    const endHour = 20
    const slots = []
    for (let h = startHour; h < endHour; h++) {
      const start = `${String(h).padStart(2, '0')}:00`
      const end = `${String(h + 1).padStart(2, '0')}:00`
      slots.push({ start, end })
    }
    return slots
  }

  const formatThaiDate = (d) => {
    const thaiDays = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']
    const thaiMonthsShort = [
      'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
    ]
    const dayName = thaiDays[d.getDay()]
    const day = String(d.getDate()).padStart(2, '0')
    const month = thaiMonthsShort[d.getMonth()]
    return `${dayName} ${day} ${month}`
  }

  const getThaiDayAbbr = (day) => {
    const dayNames = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']
    return dayNames[day.getDay()]
  }

  const isSameDay = (a, b) => {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  }

  const findBookingInSlot = (roomId, day, slot) => {
    const [sh, sm] = slot.start.split(':').map(Number)
    const [eh, em] = slot.end.split(':').map(Number)

    const slotStart = new Date(day)
    slotStart.setHours(sh, sm, 0, 0)
    const slotEnd = new Date(day)
    slotEnd.setHours(eh, em, 0, 0)

    return bookings.find(b => {
      if (roomId && b.room_id && b.room_id !== Number(roomId)) return false
      const bs = new Date(b.start_time)
      const be = new Date(b.end_time)
      return (bs < slotEnd && be > slotStart) && isSameDay(bs, day)
    })
  }

  // Build row cells with merged spans per booking
  const buildDayCells = (day, roomId) => {
    const slots = generateTimeSlots()
    const dayBookings = bookings
      .filter(b => {
        if (roomId && b.room_id && Number(roomId) !== b.room_id) return false
        const bs = new Date(b.start_time)
        return isSameDay(bs, day)
      })
      .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))

    let slotIndex = 0
    const cells = []

    while (slotIndex < slots.length) {
      const slot = slots[slotIndex]
      const [sh, sm] = slot.start.split(':').map(Number)
      const slotStart = new Date(day)
      slotStart.setHours(sh, sm, 0, 0)
      const [eh, em] = slot.end.split(':').map(Number)
      const slotEnd = new Date(day)
      slotEnd.setHours(eh, em, 0, 0)

      const booking = dayBookings.find(b => {
        const bs = new Date(b.start_time)
        const be = new Date(b.end_time)
        return (bs < slotEnd && be > slotStart)
      })

      if (!booking) {
        cells.push({ type: 'empty', span: 1 })
        slotIndex += 1
        continue
      }

      // Calculate how many slots the booking spans
      const bookingStart = new Date(booking.start_time)
      const bookingEnd = new Date(booking.end_time)

      // Clamp to day bounds
      const dayStart = new Date(day)
      dayStart.setHours(7, 0, 0, 0)
      const dayEnd = new Date(day)
      dayEnd.setHours(20, 0, 0, 0)

      const visibleStart = bookingStart < dayStart ? dayStart : bookingStart
      const visibleEnd = bookingEnd > dayEnd ? dayEnd : bookingEnd

      const startHour = Math.max(7, visibleStart.getHours() + (visibleStart.getMinutes() > 0 ? 1 : 0))
      const endHour = Math.min(20, visibleEnd.getMinutes() > 0 ? visibleEnd.getHours() + 1 : visibleEnd.getHours())
      const span = Math.max(1, endHour - startHour)

      cells.push({ type: 'booking', span, booking })
      slotIndex += span
    }

    return cells
  }

  // Excel helpers
  const parseExcelDateTime = (value) => {
    if (!value) return ''
    if (typeof value === 'number') {
      // Excel serial date
      const d = XLSX.SSF.parse_date_code(value)
      if (!d) return ''
      const date = new Date(Date.UTC(d.y, d.m - 1, d.d, d.H || 0, d.M || 0, d.S || 0))
      return date.toISOString()
    }
    if (value instanceof Date) {
      return new Date(value).toISOString()
    }
    // Try to parse common string formats (including Buddhist year)
    const str = String(value).trim()
    // If contains Buddhist year, convert to Gregorian
    const buddhistMatch = str.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{2}))?/)
    if (buddhistMatch) {
      const day = Number(buddhistMatch[1])
      const month = Number(buddhistMatch[2]) - 1
      let year = Number(buddhistMatch[3])
      if (year > 2400) year -= 543
      const hh = Number(buddhistMatch[4] || 0)
      const mm = Number(buddhistMatch[5] || 0)
      return new Date(year, month, day, hh, mm, 0, 0).toISOString()
    }
    const parsed = new Date(str)
    return isNaN(parsed.getTime()) ? '' : parsed.toISOString()
  }

  const normalizeRoomName = (name) => String(name || '').toLowerCase().replace(/\s+/g, '')

  if (loading || roomsLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="h-12 bg-gray-200"></div>
            <div className="space-y-2 p-4">
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <div key={i} className="h-8 bg-gray-200 rounded"></div>
              ))}
            </div>
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
                <p className="mt-1">กำลังใช้ข้อมูลจำลอง กรุณาตรวจสอบการเชื่อมต่อ API</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">ตารางการใช้ห้อง</h1>
        <p className="text-gray-600 mb-6">ศูนย์/สถานศึกษา แม่ริม อาคารคอมพิวเตอร์</p>

        {/* Controls Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-6 gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ห้อง</label>
                <select
                  value={selectedRoom}
                  onChange={(e) => setSelectedRoom(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 min-w-[200px]"
                >
                  <option value="">ทั้งหมด</option>
                  {rooms.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name} : {r.description} ความจุ : {r.capacity}
                    </option>
                  ))}
                </select>
              </div>

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
                  </div>

                  <div className="flex space-x-1">
                    <button
                      onClick={() => setSelectedSemester(1)}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-all shadow-sm ${selectedSemester === 1
                          ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md transform scale-105'
                          : 'bg-blue-50 text-blue-700 hover:bg-blue-100 hover:shadow'
                        }`}
                    >
                      1
                    </button>
                    <button
                      onClick={() => setSelectedSemester(2)}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-all shadow-sm ${selectedSemester === 2
                          ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md transform scale-105'
                          : 'bg-blue-50 text-blue-700 hover:bg-blue-100 hover:shadow'
                        }`}
                    >
                      2
                    </button>
                    <button
                      onClick={() => setSelectedSemester(3)}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-all shadow-sm ${selectedSemester === 3
                          ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md transform scale-105'
                          : 'bg-blue-50 text-blue-700 hover:bg-blue-100 hover:shadow'
                        }`}
                    >
                      3
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    const currentDate = new Date(selectedDate)
                    const prevWeek = new Date(currentDate)
                    prevWeek.setDate(currentDate.getDate() - 7)
                    const newDate = prevWeek.toISOString().split('T')[0]
                    console.log('Moving to previous week:', newDate)
                    setSelectedDate(newDate)
                  }}
                  className="p-2.5 bg-gradient-to-r from-purple-100 to-pink-100 hover:from-purple-200 hover:to-pink-200 text-purple-700 hover:text-purple-800 rounded-lg transition-all shadow-sm hover:shadow-md"
                  title="สัปดาห์ก่อนหน้า"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                <div className="text-center">
                  <div className="text-sm font-medium text-gray-900">
                    ระหว่าง {formatDateToThaiShort(weekStart)} - {formatDateToThaiShort(new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000))}
                  </div>
                  <button
                    onClick={() => {
                      const today = new Date()
                      setSelectedDate(today.toISOString().split('T')[0])
                    }}
                    className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded transition-colors mt-1"
                  >
                    กลับไปสัปดาห์นี้
                  </button>
                </div>

                <button
                  onClick={() => {
                    const currentDate = new Date(selectedDate)
                    const nextWeek = new Date(currentDate)
                    nextWeek.setDate(currentDate.getDate() + 7)
                    const newDate = nextWeek.toISOString().split('T')[0]
                    console.log('Moving to next week:', newDate)
                    setSelectedDate(newDate)
                  }}
                  className="p-2.5 bg-gradient-to-r from-purple-100 to-pink-100 hover:from-purple-200 hover:to-pink-200 text-purple-700 hover:text-purple-800 rounded-lg transition-all shadow-sm hover:shadow-md"
                  title="สัปดาห์ถัดไป"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center px-5 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-lg text-sm font-medium transition-all shadow-md hover:shadow-lg transform hover:scale-105"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                นำเข้า Excel
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </div>
        </div>

        {/* Weekly timetable */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {rooms.length === 0 ? (
            <div className="p-8 text-center">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">ไม่พบข้อมูลห้อง</h3>
              <p className="text-gray-600">กรุณาตรวจสอบการเชื่อมต่อ API หรือลองรีเฟรชหน้า</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse border border-gray-300">
                <thead>
                  <tr>
                    <th className="bg-gray-700 text-white px-4 py-3 text-center text-sm font-medium border border-gray-400">
                      วัน/เวลา
                    </th>
                    {generateTimeSlots().map((slot, idx) => (
                      <th key={idx} className="bg-gray-700 text-white px-2 py-3 text-center text-xs font-medium border border-gray-400">
                        {slot.start}-{slot.end}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {getWeekDays().map((day, dayIdx) => {
                    const isWeekend = day.getDay() === 0 || day.getDay() === 6
                    const isToday = isSameDay(day, new Date())
                    return (
                      <tr key={dayIdx} className={isWeekend ? 'bg-red-50' : isToday ? 'bg-blue-50' : 'bg-white'}>
                        <td className={`px-4 py-3 text-sm font-medium text-center border border-gray-300 ${isWeekend ? 'bg-red-100 text-red-800' : isToday ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                          <div className="flex flex-col items-center">
                            <span>{getThaiDayAbbr(day)}</span>
                            <span className="text-xs font-normal">
                              {String(day.getDate()).padStart(2, '0')}/{String(day.getMonth() + 1).padStart(2, '0')}
                            </span>
                            {isToday && <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded mt-1">วันนี้</span>}
                          </div>
                        </td>
                        {buildDayCells(day, selectedRoom || null).map((cell, idx) => {
                          const bookingStatus = cell.booking?.status || 'approved'
                          const statusColors = {
                            approved: 'bg-green-100 border-green-300 text-green-900',
                            pending: 'bg-yellow-100 border-yellow-300 text-yellow-900',
                            rejected: 'bg-red-100 border-red-300 text-red-900',
                            cancelled: 'bg-gray-100 border-gray-300 text-gray-700'
                          }
                          return (
                            <td
                              key={idx}
                              colSpan={cell.span}
                              className={`px-1 py-1 align-top border border-gray-300 ${isWeekend ? 'bg-red-50' : isToday ? 'bg-blue-50' : 'bg-white'}`}
                            >
                              {cell.type === 'booking' ? (
                                <div className={`${statusColors[bookingStatus] || statusColors.approved} border rounded p-1.5 text-xs h-full min-h-[48px] flex flex-col justify-center items-center text-center`}>
                                  <div className="font-semibold mb-0.5 truncate w-full">{cell.booking.purpose || 'การจอง'}</div>
                                  <div className="text-xs truncate w-full">{cell.booking.section || cell.booking.user?.name || 'ไม่ระบุ'}</div>
                                  <div className="text-xs truncate w-full mt-0.5 opacity-80">{cell.booking.location || cell.booking.room?.name || rooms.find(r => r.id === cell.booking.room_id)?.name || 'ไม่ระบุ'}</div>
                                </div>
                              ) : (
                                <div className={`h-12 ${isWeekend ? 'bg-red-50' : isToday ? 'bg-blue-50' : 'bg-white'}`}></div>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">ตรวจสอบข้อมูลที่นำเข้า</h3>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {importError && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <p className="text-red-800">{importError}</p>
                  </div>
                </div>
              )}

              {importedData.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-3">
                    พบข้อมูล {importedData.length} รายการที่สามารถนำเข้าได้
                  </p>

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ห้อง</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ผู้จอง</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">วันที่เริ่มต้น</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">วันที่สิ้นสุด</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">วัตถุประสงค์</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {importedData.slice(0, 10).map((item, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-3 py-2 text-sm text-gray-900">{item.room_name}</td>
                            <td className="px-3 py-2 text-sm text-gray-900">{item.user_name}</td>
                            <td className="px-3 py-2 text-sm text-gray-900">{item.start_time}</td>
                            <td className="px-3 py-2 text-sm text-gray-900">{item.end_time}</td>
                            <td className="px-3 py-2 text-sm text-gray-900">{item.purpose}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {importedData.length > 10 && (
                    <p className="text-sm text-gray-500 mt-2">
                      และอีก {importedData.length - 10} รายการ...
                    </p>
                  )}
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-blue-600 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h4 className="text-sm font-medium text-blue-800">รูปแบบไฟล์ Excel ที่รองรับ</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      ไฟล์ต้องมีคอลัมน์: ชื่อห้อง, ชื่อผู้จอง, วันที่เริ่มต้น, วันที่สิ้นสุด, วัตถุประสงค์, หมายเหตุ
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleImportConfirm}
                disabled={importLoading || importedData.length === 0}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {importLoading ? 'กำลังนำเข้า...' : 'ยืนยันการนำเข้า'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
