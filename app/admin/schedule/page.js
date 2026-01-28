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
import { API_URL, getStorageUrl } from '../../lib/api'

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
  const [importMode, setImportMode] = useState('daily') // 'daily' or 'weekly'
  const [importRange, setImportRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date(new Date().setMonth(new Date().getMonth() + 4)).toISOString().split('T')[0]
  })
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

        let processedData = []

        // Auto-detect format
        // Check if header row contains time slots (e.g. "08:00 - 09:00")
        const headerRow = jsonData[0]
        let isMatrixFormat = false
        if (headerRow && headerRow.length > 0) {
          // Check for time patterns in header (e.g. "08:00", "8:00", "08.00")
          const timePattern = /\d{1,2}[:.]\d{2}/
          const matches = headerRow.filter(cell => cell && timePattern.test(String(cell)))
          if (matches.length >= 2) { // Allow at least 2 time slots to confirm
            isMatrixFormat = true
          }
        }

        // If user explicitly selected 'weekly' (though we rely on detection now) or detected matrix
        if (isMatrixFormat || importMode === 'weekly') {
          setImportMode('weekly') // Sync state
          processedData = processWeeklyExcelData(jsonData)
        } else {
          setImportMode('daily')
          processedData = processExcelData(jsonData)
        }

        setImportedData(processedData)
        setShowImportModal(true)
      } catch (error) {
        console.error('Error processing Excel file:', error)
        setImportError('เกิดข้อผิดพลาดในการประมวลผลไฟล์ Excel: ' + error.message)
      } finally {
        setImportLoading(false)
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }
    }

    reader.readAsArrayBuffer(file)
  }

  const getDayNumber = (dayStr) => {
    // Remove dots and trim
    const normalize = String(dayStr).toLowerCase().replace(/\./g, '').trim()

    const days = {
      'ho': 0, 'sun': 0, 'sunday': 0, 'อา': 0, 'อาทิตย์': 0, '1': 0,
      'mo': 1, 'mon': 1, 'monday': 1, 'จ': 1, 'จันทร์': 1, '2': 1,
      'tu': 2, 'tue': 2, 'tuesday': 2, 'อ': 2, 'อังคาร': 2, '3': 2,
      'we': 3, 'wed': 3, 'wednesday': 3, 'พ': 3, 'พุธ': 3, '4': 3,
      'th': 4, 'thu': 4, 'thursday': 4, 'พฤ': 4, 'พฤหัส': 4, 'พฤหัสบดี': 4, '5': 4,
      'fr': 5, 'fri': 5, 'friday': 5, 'ศ': 5, 'ศุกร์': 5, '6': 5,
      'sa': 6, 'sat': 6, 'saturday': 6, 'ส': 6, 'เสาร์': 6, '7': 6
    }

    return days[normalize] !== undefined ? days[normalize] : -1
  }

  const parseTimeStr = (timeStr) => {
    if (typeof timeStr === 'number') {
      // Create date from Excel fractional day
      const totalSeconds = Math.floor(timeStr * 86400)
      const hours = Math.floor(totalSeconds / 3600)
      const minutes = Math.floor((totalSeconds % 3600) / 60)
      return { hours, minutes }
    }

    if (!timeStr) return null
    const str = String(timeStr).trim().replace('.', ':')

    // Match HH:mm
    let match = str.match(/(\d{1,2})[:](\d{2})/)
    if (match) {
      return { hours: parseInt(match[1]), minutes: parseInt(match[2]) }
    }

    // Match simple integer (e.g., "9", "13") -> HH:00
    if (/^\d{1,2}$/.test(str)) {
      return { hours: parseInt(str), minutes: 0 }
    }

    return null
  }

  // Format date to local YYYY-MM-DD HH:mm:ss to match backend expectation
  const formatDateLocal = (date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  }

  const handleClearSchedule = async () => {
    const result = await Swal.fire({
      title: 'ล้างข้อมูลตารางเรียน',
      html: `
        <div class="text-left">
          <p class="mb-2 text-sm text-gray-600">เลือกช่วงเวลาที่ต้องการลบข้อมูลการจองทั้งหมด</p>
          <label class="block text-xs font-bold mb-1">เริ่มต้น</label>
          <input type="date" id="swal-start-date" class="w-full border rounded p-2 mb-3" value="${importRange.start}">
          <label class="block text-xs font-bold mb-1">สิ้นสุด</label>
          <input type="date" id="swal-end-date" class="w-full border rounded p-2" value="${importRange.end}">
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'ยืนยันการลบ',
      cancelButtonText: 'ยกเลิก',
      preConfirm: () => {
        return {
          start_date: document.getElementById('swal-start-date').value,
          end_date: document.getElementById('swal-end-date').value
        }
      }
    })

    if (result.isConfirmed) {
      try {
        setImportLoading(true)
        const response = await fetch(`${API_URL}/api/admin/bookings/clear`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(result.value)
        })

        const data = await response.json()

        if (response.ok) {
          await Swal.fire('สำเร็จ', data.message, 'success')
          fetchData() // Refresh data
        } else {
          throw new Error(data.message || 'Failed to clear schedule')
        }
      } catch (error) {
        console.error('Error clearing schedule:', error)
        await Swal.fire('ข้อผิดพลาด', 'ไม่สามารถล้างข้อมูลได้: ' + error.message, 'error')
      } finally {
        setImportLoading(false)
      }
    }
  }

  const processWeeklyExcelData = (data) => {
    if (data.length < 2) {
      throw new Error('ไฟล์ Excel ต้องมีข้อมูลอย่างน้อย 2 แถว')
    }

    // Matrix Format Parsing (Based on Image 2)
    // Row 0: Header ["วัน / เวลา", "08:00 - 09:00", "09:00 - 10:00", ...]
    // Col 0: Day ["จันทร์", "อังคาร", ...]

    const headerRow = data[0]
    const timeSlots = [] // [{ start: {h, m}, end: {h, m}, colIndex: 1 }]

    // 1. Parse Header for Time Slots
    for (let i = 1; i < headerRow.length; i++) {
      const val = headerRow[i]
      if (!val) continue

      // Clean "08:00 - 09:00" -> "08:00-09:00"
      const timeStr = String(val).replace(/\s/g, '').replace(/\./g, ':')
      const parts = timeStr.split('-')
      if (parts.length === 2) {
        const start = parseTimeStr(parts[0])
        const end = parseTimeStr(parts[1])
        if (start && end) {
          timeSlots.push({ start, end, colIndex: i })
        }
      }
    }

    if (timeSlots.length === 0) {
      throw new Error('ไม่พบข้อมูลช่วงเวลาในแถวแรก (ตัวอย่าง: 08:00 - 09:00)')
    }

    const expandedBookings = []
    const startDate = new Date(importRange.start)
    const endDate = new Date(importRange.end)
    startDate.setHours(0, 0, 0, 0)
    endDate.setHours(23, 59, 59, 999)
    let targetRoomName = 'ห้องระบุไม่ได้'
    let targetRoomId = null

    if (selectedRoom) { // selectedRoom is an ID from the filter
      const r = rooms.find(room => String(room.id) === String(selectedRoom))
      if (r) {
        targetRoomName = r.name
        targetRoomId = r.id
      }
    }

    // 2. Iterate Rows (Days)
    for (let r = 1; r < data.length; r++) {
      const row = data[r]
      if (!row || row.length === 0) continue

      const dayStr = row[0]
      const targetDay = getDayNumber(dayStr) // 0-6 or -1

      // Filter: Only Mon-Fri
      if (targetDay === -1 || targetDay === 0 || targetDay === 6) continue

      // 3. Iterate Time Columns
      let currentBooking = null

      for (let i = 0; i < timeSlots.length; i++) {
        const slot = timeSlots[i]
        const cellContent = row[slot.colIndex]

        // Check if cell has content
        const hasContent = cellContent && String(cellContent).trim().length > 0

        if (hasContent) {
          const contentStr = String(cellContent).trim()

          // Check if matches previous booking to continue/merge
          if (currentBooking && currentBooking.content === contentStr) {
            // Extend end time
            currentBooking.end = slot.end
          } else {
            // Finalize previous if exists
            if (currentBooking) {
              addBookingsFromMatrix(currentBooking, targetDay, startDate, endDate, expandedBookings, targetRoomName, targetRoomId, dayStr)
            }
            // Start new booking
            currentBooking = {
              start: slot.start,
              end: slot.end,
              content: contentStr
            }
          }
        } else {
          // Empty cell, finalize previous if exists
          if (currentBooking) {
            addBookingsFromMatrix(currentBooking, targetDay, startDate, endDate, expandedBookings, targetRoomName, targetRoomId, dayStr)
            currentBooking = null
          }
        }
      }
      // End of row, finalize last
      if (currentBooking) {
        addBookingsFromMatrix(currentBooking, targetDay, startDate, endDate, expandedBookings, targetRoomName, targetRoomId, dayStr)
      }
    }

    return expandedBookings
  }

  // Helper to push bookings
  const addBookingsFromMatrix = (bookingData, dayOfWeek, rangeStart, rangeEnd, results, roomName, roomId, dayDisplay) => {

    // Parse Subject and Section "Subject (Section)"
    // e.g. "COM 2602 (51)" -> Subject: COM 2602, Section: 51
    let subject = bookingData.content
    let section = 'ไม่ระบุ'

    const match = bookingData.content.match(/^(.*?)\s*\((.*?)\)$/)
    if (match) {
      subject = match[1]
      section = match[2]
    }

    let current = new Date(rangeStart)
    while (current <= rangeEnd) {
      if (current.getDay() === dayOfWeek) {
        const bStart = new Date(current)
        bStart.setHours(bookingData.start.hours, bookingData.start.minutes, 0, 0)

        const bEnd = new Date(current)
        bEnd.setHours(bookingData.end.hours, bookingData.end.minutes, 0, 0)

        results.push({
          id: `matrix_${results.length}`,
          room_name: roomName,
          user_name: 'Admin Import',
          start_time: formatDateLocal(bStart),
          end_time: formatDateLocal(bEnd),
          purpose: subject,
          section: section,
          location: 'ไม่ระบุ',
          notes: '',
          status: 'pending',
          is_imported: true,
          room_id: roomId,
          original_day: dayDisplay
        })
      }
      current.setDate(current.getDate() + 1)
    }
  }

  /* original processExcelData logic for daily import */
  const processExcelData = (data) => {
    if (data.length < 2) {
      throw new Error('ไฟล์ Excel ต้องมีข้อมูลอย่างน้อย 2 แถว')
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
      const start = `${h}:00`
      const end = `${h + 1}:00`
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
        title="ตารางเรียน"
        subtitle="ตรวจสอบตารางเรียนในแต่ละเทอม"
        actions={
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            {importMode === 'weekly' && (
              <div className="flex gap-2 items-center bg-white p-1 rounded-lg border border-gray-200 shadow-sm animate-fadeIn">
                <input
                  type="date"
                  value={importRange.start}
                  onChange={(e) => setImportRange(prev => ({ ...prev, start: e.target.value }))}
                  className="px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-gray-400">→</span>
                <input
                  type="date"
                  value={importRange.end}
                  onChange={(e) => setImportRange(prev => ({ ...prev, end: e.target.value }))}
                  className="px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
            <div className="flex bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setImportMode('daily')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${importMode === 'daily' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                  }`}
              >
                รายวัน
              </button>
              <button
                onClick={() => setImportMode('weekly')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${importMode === 'weekly' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                  }`}
              >
                รายสัปดาห์
              </button>
            </div>
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
            <button
              onClick={handleClearSchedule}
              className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors flex items-center gap-2 border border-red-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              ล้างข้อมูล
            </button>
          </div>
        }
      />

      <AdminCard>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-4">
          {/* Filters and Navigation Row */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-sm">
            {/* Left Side: Room & Year/Sem */}
            <div className="space-y-3 w-full md:w-auto">
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-700 min-w-[40px]">ห้อง:</span>
                <select
                  value={selectedRoom}
                  onChange={(e) => setSelectedRoom(e.target.value)}
                  className="border border-gray-300 rounded px-2 py-1 min-w-[300px] focus:outline-none focus:border-blue-500"
                >
                  <option value="">-- เลือกห้อง --</option>
                  {rooms.map(room => (
                    <option key={room.id} value={room.id}>
                      {room.name} {room.capacity ? `: ความจุ ${room.capacity}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-700 min-w-[40px]">ปีการศึกษา:</span>
                <select
                  value={academicYear}
                  onChange={(e) => handleTermChange(e.target.value, selectedSemester)}
                  className="border border-gray-300 rounded px-2 py-1 w-24 focus:outline-none focus:border-blue-500"
                >
                  {[2567, 2568, 2569, 2570].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <div className="flex items-center gap-1 ml-2">
                  <span className="text-gray-500">/</span>
                  {[1, 2, 3].map(sem => (
                    <button
                      key={sem}
                      onClick={() => handleTermChange(academicYear, sem)}
                      className={`px-2 py-0.5 rounded ${selectedSemester === sem ? 'text-blue-600 font-bold underline' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      {sem}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Side: Date Navigator */}
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-700">ระหว่าง:</span>
              <div className="flex items-center text-blue-800 font-medium">
                <button
                  onClick={() => {
                    const currentDate = new Date(selectedDate)
                    const prevWeek = new Date(currentDate)
                    prevWeek.setDate(currentDate.getDate() - 7)
                    setSelectedDate(prevWeek.toISOString().split('T')[0])
                  }}
                  className="px-2 text-gray-400 hover:text-blue-600"
                >
                  ◀
                </button>
                <span>
                  {formatDateToThaiShort(new Date(selectedDate))} - {(() => {
                    const d = new Date(selectedDate)
                    d.setDate(d.getDate() + 6)
                    return formatDateToThaiShort(d)
                  })()}
                </span>
                <button
                  onClick={() => {
                    const currentDate = new Date(selectedDate)
                    const nextWeek = new Date(currentDate)
                    nextWeek.setDate(currentDate.getDate() + 7)
                    setSelectedDate(nextWeek.toISOString().split('T')[0])
                  }}
                  className="px-2 text-gray-400 hover:text-blue-600"
                >
                  ▶
                </button>
              </div>
            </div>
          </div>
        </div>

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
              <table className="min-w-full border-collapse border border-gray-400">
                <thead>
                  <tr className="bg-[#444] text-white">
                    <th className="sticky left-0 z-10 bg-[#444] px-2 py-3 text-center text-sm font-bold border border-gray-500 w-[80px]">
                      Day/Time
                    </th>
                    {generateTimeSlots().map((slot, idx) => (
                      <th key={idx} className="bg-[#444] px-1 py-3 text-center text-xs font-medium border border-gray-500 min-w-[100px]">
                        {slot.start}-{slot.end}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {[0, 1, 2, 3, 4, 5, 6].map((offset) => {
                    // Calculate Monday of the selected week
                    const current = new Date(selectedDate)
                    const day = current.getDay()
                    const diff = current.getDate() - day + (day === 0 ? -6 : 1) // Adjust when day is Sunday
                    const monday = new Date(current.setDate(diff))

                    const currentDay = new Date(monday)
                    currentDay.setDate(monday.getDate() + offset)

                    // Determine colors based on actual day of week
                    // 0=Sun, 6=Sat in JS getDay()
                    const dayOfWeek = currentDay.getDay()

                    let dayColor = 'bg-[#999]' // Default Gray
                    let textColor = 'text-white'

                    if (dayOfWeek === 6) dayColor = 'bg-[#d9534f]' // Saturday Red
                    if (dayOfWeek === 0) dayColor = 'bg-[#d9534f]' // Sunday Red

                    const cells = buildDayCells(currentDay, selectedRoom)

                    return (
                      <tr key={offset} className="border-b border-gray-400 h-16">
                        <td className={`sticky left-0 z-10 text-center border border-gray-400 ${dayColor} ${textColor}`}>
                          <div className="flex flex-col items-center justify-center font-bold">
                            <span>{getThaiDayAbbr(currentDay)}</span>
                          </div>
                        </td>
                        {buildDayCells(currentDay, selectedRoom).map((cell, cellIdx) => {
                          if (cell.type === 'empty') {
                            return <td key={cellIdx} className="border border-gray-300 h-full bg-white" />
                          }
                          const b = cell.booking
                          return (
                            <td
                              key={cellIdx}
                              colSpan={cell.span}
                              className="p-0 border border-black h-full relative"
                            >
                              <div className="w-full h-full bg-[#bfdbfe] text-blue-900 text-[11px] p-1 flex flex-col items-center justify-center text-center overflow-hidden leading-tight">
                                {/* Top: Section/Code */}
                                <div className="font-bold underline">{b.purpose}</div>
                                {/* Middle: Section */}
                                <div>{b.section && `Sec ${b.section}`}</div>
                                {/* Bottom: Room */}
                                <div>{b.room_name}</div>

                                <div className="hidden group-hover:block absolute z-50 bg-black text-white p-2 text-xs rounded shadow-lg top-full left-0 whitespace-nowrap min-w-[150px]">
                                  {b.room?.image && (
                                    <div className="mb-2 w-full h-24 bg-gray-700 rounded overflow-hidden">
                                      <img
                                        src={getStorageUrl(b.room.image)}
                                        alt={b.room.name || b.room_name}
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                  )}
                                  <div className="font-bold mb-1">{b.room?.name || b.room_name}</div>
                                  <div>{b.user_name || b.user?.name} - {b.purpose}</div>
                                  <div className="text-gray-300">({b.start_time.split(' ')[1]?.slice(0, 5)}-{b.end_time.split(' ')[1]?.slice(0, 5)})</div>
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
                  <p className="text-sm text-gray-500 mt-1">
                    {importMode === 'weekly'
                      ? `พบข้อมูล ${importedData.length} รายการ (สร้างจากตารางเรียนแบบรายสัปดาห์)`
                      : `พบข้อมูล ${importedData.length} รายการจากไฟล์ Excel`
                    }
                  </p>
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
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">วัน</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">ห้อง</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">วัน/เวลา</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">วิชา/รายละเอียด</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {importedData.slice(0, 100).map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-bold text-gray-800">
                            {item.original_day || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {item.room_name}
                            {!item.room_id && <span className="ml-2 text-xs text-red-500 bg-red-50 px-1.5 py-0.5 rounded">ไม่พบในระบบ</span>}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            <div>{formatDateToThaiShort(new Date(item.start_time))}</div>
                            <div className="text-xs text-gray-500">
                              {new Date(item.start_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} -
                              {new Date(item.end_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            <div className="font-medium">{item.purpose}</div>
                            <div className="text-xs text-gray-500">{item.user_name} (Sec: {item.section !== 'ไม่ระบุ' ? item.section : '-'})</div>
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

      </AdminCard >
    </div >
  )
}
