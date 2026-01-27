'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import Swal from 'sweetalert2'
import { useAuth } from '../../contexts/AuthContext'
import { formatDateToThaiShort, parseDate, formatDateTimeToThai } from '../../utils/dateUtils'
import AdminHeader from '../components/AdminHeader'
import AdminCard from '../components/AdminCard'
import AdminButton from '../components/AdminButton'
import { API_URL } from '../../lib/api'

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
  const { token, logout, loading: authLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (authLoading) return
    if (!token) {
      router.push('/login')
      return
    }
    fetchData()
  }, [selectedDate, token, authLoading])

  useEffect(() => {
    if (authLoading) return
    if (!token) {
      router.push('/login')
      return
    }
    fetchRooms()
  }, [token, authLoading])

  const fetchRooms = async () => {
    if (!token) {
      setRoomsLoading(false)
      return
    }

    setRoomsLoading(true)
    try {
      const response = await fetch(`${API_URL}/api/rooms`, {
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

      setRooms([])
      setApiError(true)
      setErrorMessage('ไม่สามารถเชื่อมต่อกับ API ได้')

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
      const current = new Date(selectedDate)
      const day = current.getDay() === 0 ? 7 : current.getDay()
      const monday = new Date(current)
      monday.setDate(current.getDate() - (day - 1))
      monday.setHours(0, 0, 0, 0) // Start of week

      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)
      sunday.setHours(23, 59, 59, 999) // End of week

      const startStr = monday.toISOString().slice(0, 19).replace('T', ' ')
      const endStr = sunday.toISOString().slice(0, 19).replace('T', ' ')

      const response = await fetch(`${API_URL}/api/bookings?start_date=${startStr}&end_date=${endStr}`, {
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
          setBookings([])
        }
      } else {
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
  function handleFileUpload(event) {
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
    let headersFound = false

    headers.forEach((header, index) => {
      Object.keys(expectedHeaders).forEach(key => {
        if (typeof header === 'string' && expectedHeaders[key].some(h => header.toLowerCase().includes(h.toLowerCase()))) {
          columnIndices[key] = index
          headersFound = true
        }
      })
    })

    if (!headersFound || Object.keys(columnIndices).length < 2) {
      columnIndices['room_name'] = 0
      columnIndices['user_name'] = 1
      columnIndices['start_time'] = 2
      columnIndices['end_time'] = 3
      columnIndices['purpose'] = 4
      columnIndices['notes'] = 5
    }

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

      const displayPurpose = purpose || 'การจอง'
      const displaySection = section || 'ไม่ระบุ'
      const displayLocation = location || 'ไม่ระบุ'

      const item = {
        id: `import_${index + 1}`,
        room_name: rawRoom || 'ห้องระบุไม่ได้',
        user_name: row[columnIndices.user_name] || 'ไม่ระบุ',
        start_time: startIso || new Date().toISOString(),
        end_time: endIso || new Date().toISOString(),
        purpose: displayPurpose,
        section: displaySection,
        location: displayLocation,
        notes: row[columnIndices.notes] || '',
        status: 'pending',
        is_imported: true,
        room_id: matchedRoom?.id || null
      }
      return item
    }).filter(item => item.start_time && item.end_time)

    return processedData
  }

  const handleImportConfirm = async () => {
    if (importedData.length === 0) {
      Swal.fire({
        title: 'ไม่พบข้อมูล',
        text: 'กรุณาเลือกไฟล์ Excel ที่มีข้อมูลถูกต้อง',
        icon: 'warning',
        confirmButtonColor: '#3B82F6',
        confirmButtonText: 'ตกลง'
      })
      return
    }

    const validData = importedData

    setImportLoading(true)
    setImportError('')

    try {
      const payload = {
        bookings: validData.map(item => ({
          room_id: item.room_id,
          room_name: item.room_name,
          start_time: item.start_time,
          end_time: item.end_time,
          purpose: item.purpose,
          user_name: item.user_name,
          notes: item.notes
        }))
      }

      const response = await fetch(`${API_URL}/api/admin/bookings/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (response.ok && data.success) {
        await fetchData()
        setShowImportModal(false)
        setImportedData([])

        let message = `นำเข้าสำเร็จ ${data.data.imported_count} รายการ`
        if (data.data.errors && data.data.errors.length > 0) {
          message += `<br><br><small class="text-red-500">พบข้อผิดพลาดบางรายการ:</small><br><div class="text-left text-xs bg-gray-50 p-2 rounded mt-2 max-h-32 overflow-y-auto">${data.data.errors.map(e => `• ${e}`).join('<br>')}</div>`
        }

        Swal.fire({
          title: 'นำเข้าข้อมูลสำเร็จ',
          html: message,
          icon: 'success',
          confirmButtonColor: '#3B82F6',
          confirmButtonText: 'ตกลง'
        })
      } else {
        setImportError(data.message || 'เกิดข้อผิดพลาดในการนำเข้าข้อมูล')
        Swal.fire({
          title: 'เกิดข้อผิดพลาด',
          text: data.message || 'เกิดข้อผิดพลาดในการนำเข้าข้อมูล',
          icon: 'error',
          confirmButtonColor: '#3B82F6',
          confirmButtonText: 'ตกลง'
        })
      }
    } catch (error) {
      console.error('Error importing data:', error)
      setImportError('เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์')
      Swal.fire({
        title: 'เกิดข้อผิดพลาด',
        text: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้',
        icon: 'error',
        confirmButtonColor: '#3B82F6',
        confirmButtonText: 'ตกลง'
      })
    } finally {
      setImportLoading(false)
    }
  }

  // Helper functions
  const getWeekStart = (date) => {
    const d = parseDate(date) || new Date()
    const day = d.getDay() === 0 ? 7 : d.getDay()
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

  const getThaiDayAbbr = (day) => {
    const dayNames = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']
    return dayNames[day.getDay()]
  }

  const isSameDay = (a, b) => {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  }

  const buildDayCells = (day, roomId) => {
    const slots = generateTimeSlots()
    const dayBookings = bookings
      .filter(b => {
        if (roomId && b.room_id && Number(roomId) !== b.room_id) return false
        const bs = parseDate(b.start_time)
        return isSameDay(bs, day)
      })
      .sort((a, b) => parseDate(a.start_time) - parseDate(b.start_time))

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
        const bs = parseDate(b.start_time)
        const be = parseDate(b.end_time)
        return (bs < slotEnd && be > slotStart)
      })

      if (!booking) {
        cells.push({ type: 'empty', span: 1 })
        slotIndex += 1
        continue
      }

      const bookingStart = parseDate(booking.start_time)
      const bookingEnd = parseDate(booking.end_time)

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

  const parseExcelDateTime = (value) => {
    if (!value) return ''
    if (typeof value === 'number') {
      const d = XLSX.SSF.parse_date_code(value)
      if (!d) return ''
      const date = new Date(Date.UTC(d.y, d.m - 1, d.d, d.H || 0, d.M || 0, d.S || 0))
      return date.toISOString()
    }
    if (value instanceof Date) {
      return new Date(value).toISOString()
    }
    const str = String(value).trim()
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

  const handleTermChange = (year, semester) => {
    setAcademicYear(year)
    setSelectedSemester(semester)

    // Calculate start date based on Year/Semester
    // Thai Academic Year 2568 = 2025 AD
    const baseYear = parseInt(year) - 543
    let targetDate = new Date()

    if (semester === 1) {
      targetDate = new Date(baseYear, 5, 1) // June 1st
    } else if (semester === 2) {
      targetDate = new Date(baseYear, 10, 1) // Nov 1st
    } else if (semester === 3) {
      targetDate = new Date(baseYear + 1, 3, 1) // April 1st (Next Year)
    }

    // Adjust to Monday of that week
    const day = targetDate.getDay() === 0 ? 7 : targetDate.getDay()
    const monday = new Date(targetDate)
    monday.setDate(targetDate.getDate() - (day - 1))

    setSelectedDate(monday.toISOString().split('T')[0])
  }

  if (loading || roomsLoading) {
    return (
      <div className="space-y-6">
        <div className="h-20 bg-gray-200 rounded-2xl animate-pulse"></div>
        <div className="h-40 bg-gray-200 rounded-2xl animate-pulse"></div>
        <div className="h-96 bg-gray-200 rounded-2xl animate-pulse"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {apiError && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3 text-red-700 animate-fadeIn">
          <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <div>
            <h3 className="font-bold">เกิดข้อผิดพลาด</h3>
            <p className="text-sm">{errorMessage}</p>
          </div>
        </div>
      )}

      <AdminHeader
        title="ตารางการใช้ห้อง"
        subtitle="ตรวจสอบตารางการใช้งานห้องเรียนและห้องปฏิบัติการคอมพิวเตอร์"
        actions={
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
            />
            <AdminButton
              onClick={() => fileInputRef.current?.click()}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              }
            >
              นำเข้า Excel
            </AdminButton>
          </div>
        }
      />

      <AdminCard>
        <div className="flex flex-col lg:flex-row gap-6 justify-between items-end lg:items-center">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full lg:w-auto flex-1">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">เลือกห้อง</label>
              <div className="relative">
                <select
                  value={selectedRoom}
                  onChange={(e) => setSelectedRoom(e.target.value)}
                  className="w-full pl-4 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none transition-shadow"
                >
                  <option value="">ทั้งหมด</option>
                  {rooms.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-gray-500">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-700 mb-2">ปีการศึกษา</label>
                <div className="relative">
                  <select
                    value={academicYear}
                    onChange={(e) => handleTermChange(e.target.value, selectedSemester)}
                    className="w-full pl-4 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none transition-shadow"
                  >
                    <option value="2567">2567</option>
                    <option value="2568">2568</option>
                    <option value="2569">2569</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-gray-500">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-700 mb-2">เทอม</label>
                <div className="flex bg-gray-100 p-1 rounded-xl h-[42px]">
                  {[1, 2, 3].map(sem => (
                    <button
                      key={sem}
                      onClick={() => handleTermChange(academicYear, sem)}
                      className={`flex-1 rounded-lg text-sm font-bold transition-all ${selectedSemester === sem
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-500 hover:text-gray-900'
                        }`}
                    >
                      {sem}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-gray-50 p-2 rounded-2xl w-full lg:w-auto justify-between lg:justify-start">
            <button
              onClick={() => {
                const currentDate = new Date(selectedDate)
                const prevWeek = new Date(currentDate)
                prevWeek.setDate(currentDate.getDate() - 7)
                setSelectedDate(prevWeek.toISOString().split('T')[0])
              }}
              className="p-2 hover:bg-white hover:shadow-sm rounded-xl text-gray-600 transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>

            <div className="text-center min-w-[200px]">
              <div className="text-sm text-gray-500 mb-0.5 font-medium">สัปดาห์ที่เลือก</div>
              <div className="text-sm font-bold text-gray-900 bg-white border border-gray-200 px-3 py-1 rounded-lg shadow-sm">
                {formatDateToThaiShort(weekStart)} - {formatDateToThaiShort(new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000))}
              </div>
              <button
                onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline mt-1"
              >
                กลับไปสัปดาห์นี้
              </button>
            </div>

            <button
              onClick={() => {
                const currentDate = new Date(selectedDate)
                const nextWeek = new Date(currentDate)
                nextWeek.setDate(currentDate.getDate() + 7)
                setSelectedDate(nextWeek.toISOString().split('T')[0])
              }}
              className="p-2 hover:bg-white hover:shadow-sm rounded-xl text-gray-600 transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>
      </AdminCard>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {rooms.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">ไม่พบข้อมูลห้อง</h3>
            <p className="text-gray-500">กรุณาตรวจสอบการเชื่อมต่อ API หรือลองรีเฟรชหน้า</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-gray-50/95 backdrop-blur text-gray-700 px-4 py-3 text-center text-xs font-bold uppercase tracking-wider border-b border-r border-gray-200 min-w-[100px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                    วัน/เวลา
                  </th>
                  {generateTimeSlots().map((slot, idx) => (
                    <th key={idx} className="bg-gray-50 text-gray-600 px-2 py-3 text-center text-xs font-bold uppercase tracking-wider border-b border-r border-gray-200 min-w-[80px]">
                      {slot.start}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white">
                {getWeekDays().map((day, dayIdx) => {
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6
                  const isToday = isSameDay(day, new Date())
                  return (
                    <tr key={dayIdx} className={isWeekend ? 'bg-gray-50/50' : ''}>
                      <td className={`sticky left-0 z-10 px-4 py-3 text-center border-b border-r border-gray-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] ${isToday ? 'bg-blue-50/90 text-blue-700 font-bold' : 'bg-white text-gray-900 font-medium'
                        }`}>
                        <div className="flex flex-col">
                          <span className="text-sm">{getThaiDayAbbr(day)}</span>
                          <span className="text-xs opacity-75">{day.getDate()}</span>
                        </div>
                      </td>
                      {buildDayCells(day, selectedRoom).map((cell, cellIdx) => {
                        if (cell.type === 'empty') {
                          return <td key={cellIdx} className="border-b border-r border-gray-100/50 p-1 h-14" />
                        }
                        const b = cell.booking
                        const statusColors = {
                          pending: 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200',
                          approved: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200',
                          rejected: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200',
                          cancelled: 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200'
                        }
                        return (
                          <td
                            key={cellIdx}
                            colSpan={cell.span}
                            className="p-1 h-14 border-b border-r border-gray-100/50 relative group"
                          >
                            <div className={`w-full h-full rounded-lg text-xs p-1.5 border overflow-hidden cursor-help transition-all shadow-sm ${statusColors[b.status] || 'bg-gray-100'}`}>
                              <div className="font-bold truncate">{b.purpose || 'จอง'}</div>
                              <div className="truncate opacity-75">{b.user_name}</div>

                              <div className="absolute z-50 left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-64 bg-gray-900 text-white p-3 rounded-xl shadow-xl text-xs text-left animate-fadeIn">
                                <div className="font-bold text-sm mb-1 text-white border-b border-gray-700 pb-1">{b.purpose}</div>
                                <div className="space-y-1 text-gray-300">
                                  <p>👤 {b.user_name}</p>
                                  <p>🕒 {formatDateTimeToThai(b.start_time)} - {formatDateTimeToThai(b.end_time).split(' ')[1]}</p>
                                  <p>📍 {b.room_name}</p>
                                  <p>📝 {b.notes || '-'}</p>
                                </div>
                                <div className="absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-gray-900"></div>
                              </div>
                            </div>
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

      {showImportModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-scaleIn">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-2xl">
              <div>
                <h3 className="text-xl font-bold text-gray-900">ยืนยันการนำเข้าข้อมูล</h3>
                <p className="text-sm text-gray-500 mt-1">พบข้อมูล {importedData.length} รายการจากไฟล์ Excel</p>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-6">
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">ห้อง</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">ผู้จอง</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">วัน/เวลา</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">วิชา/รายละเอียด</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {importedData.slice(0, 100).map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {item.room_name}
                          {!item.room_id && <span className="ml-2 text-xs text-red-500 bg-red-50 px-1.5 py-0.5 rounded">ไม่พบในระบบ</span>}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{item.user_name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          <div>{formatDateToThaiShort(new Date(item.start_time))}</div>
                          <div className="text-xs text-gray-500">
                            {new Date(item.start_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} -
                            {new Date(item.end_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          <div className="font-medium">{item.purpose}</div>
                          <div className="text-xs text-gray-500">{item.section !== 'ไม่ระบุ' && `Sec: ${item.section}`}</div>
                        </td>
                      </tr>
                    ))}
                    {importedData.length > 100 && (
                      <tr>
                        <td colSpan="4" className="px-4 py-3 text-center text-sm text-gray-500 italic bg-gray-50">
                          ... และอีก {importedData.length - 100} รายการ
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end gap-3">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-6 py-2.5 border border-gray-300 rounded-xl text-gray-700 font-bold hover:bg-white transition-all shadow-sm"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleImportConfirm}
                disabled={importLoading}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center gap-2"
              >
                {importLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    กำลังนำเข้า...
                  </>
                ) : (
                  'ยืนยันนำเข้าข้อมูล'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
