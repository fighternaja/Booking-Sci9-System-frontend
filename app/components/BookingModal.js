'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Swal from 'sweetalert2'
import { useAuth } from '../contexts/AuthContext'
import { formatDateForBackend } from '../utils/dateUtils'
import { API_URL } from '../lib/api'

export default function BookingModal({ isOpen, onClose, selectedDate, room, onBookingSuccess }) {
  const [formData, setFormData] = useState({
    start_time: '',
    end_time: '',
    purpose: '',
    notes: ''
  })
  const [baseDate, setBaseDate] = useState('') // YYYY-MM-DD from selected day
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [availability, setAvailability] = useState(null)
  const [checkingAvailability, setCheckingAvailability] = useState(false)
  const [showCancelForm, setShowCancelForm] = useState(false)
  const [cancellationReason, setCancellationReason] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const [selectedEquipment, setSelectedEquipment] = useState([])

  // Recurring Bookings State
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurringData, setRecurringData] = useState({
    recurrence_type: 'weekly',
    interval: 1,
    days_of_week: [],
    day_of_month: 1,
    end_date: '',
    max_occurrences: ''
  })

  // Attendees State
  const [attendees, setAttendees] = useState([])
  const [attendeeEmail, setAttendeeEmail] = useState('')
  const [attendeeName, setAttendeeName] = useState('')

  const { user, token, isAdmin } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Reset cancel form when modal opens/closes
    if (!isOpen) {
      setShowCancelForm(false)
      setCancellationReason('')
      setBaseDate('')
      setFormData({
        start_time: '',
        end_time: '',
        purpose: '',
        notes: ''
      })
      setError('')
      setAvailability(null)
      setIsRecurring(false)
      setRecurringData({
        recurrence_type: 'weekly',
        interval: 1,
        days_of_week: [],
        day_of_month: 1,
        end_date: '',
        max_occurrences: ''
      })
      setAttendees([])
      setAttendeeEmail('')
      setAttendeeName('')
      setSelectedEquipment([])
    }
  }, [isOpen])

  useEffect(() => {
    if (selectedDate && isOpen && selectedDate.start) {
      const startTime = new Date(selectedDate.start)
      const endTime = new Date(selectedDate.end)
      const now = new Date()

      // ตรวจสอบว่า parse วันที่สำเร็จหรือไม่
      if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
        console.error('Invalid date format:', selectedDate)
        setError('รูปแบบวันที่ไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง')
        return
      }

      // ตรวจสอบว่าไม่ให้เลือกวันที่ในอดีต
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const selectedDay = new Date(startTime.getFullYear(), startTime.getMonth(), startTime.getDate())

      // ถ้าเป็นการจองใหม่
      if (!selectedDate.booking) {
        // ถ้าเลือกวันที่ในอดีต ให้ใช้วันนี้แทน
        if (selectedDay < today) {
          startTime.setFullYear(now.getFullYear(), now.getMonth(), now.getDate())
          endTime.setFullYear(now.getFullYear(), now.getMonth(), now.getDate())
        }

        // ตั้งเวลาเริ่มต้นเป็นชั่วโมงถัดไป (แต่ต้องไม่เป็นอดีต)
        let nextHour = Math.max(now.getHours() + 1, startTime.getHours() + 1)
        startTime.setHours(nextHour, 0, 0, 0)
        // ตั้งเวลาสิ้นสุดเป็น 1 ชั่วโมงหลังจากเวลาเริ่มต้น
        const endHour = nextHour + 1
        endTime.setHours(endHour, 0, 0, 0)

        // ตรวจสอบอีกครั้งว่าเวลาเริ่มต้นไม่เป็นอดีต
        if (startTime <= now) {
          // ถ้ายังเป็นอดีต ให้ตั้งเป็นชั่วโมงถัดไปจากปัจจุบัน
          const safeNextHour = now.getHours() + 1
          startTime.setHours(safeNextHour, 0, 0, 0)
          endTime.setHours(safeNextHour + 1, 0, 0, 0)
        }
      }

      // แยกวันที่และเวลา (เก็บวันที่ภายใน ไม่แสดงใน UI)
      // ใช้ toISOString() เพื่อให้ได้ format ที่ถูกต้อง
      // แยกวันที่และเวลา (เก็บวันที่ภายใน ไม่แสดงใน UI)
      // ใช้ local time components แทน toISOString() เพื่อป้องกันวันที่เปลี่ยนเมื่อแปลงเป็น UTC
      const year = startTime.getFullYear()
      const month = String(startTime.getMonth() + 1).padStart(2, '0')
      const day = String(startTime.getDate()).padStart(2, '0')
      const dateStr = `${year}-${month}-${day}`
      const startTimeStr = startTime.toTimeString().slice(0, 5)
      const endTimeStr = endTime.toTimeString().slice(0, 5)

      setFormData({
        start_time: startTimeStr,
        end_time: endTimeStr,
        purpose: selectedDate.booking?.purpose || '',
        notes: selectedDate.booking?.notes || ''
      })
      setBaseDate(dateStr)

      // ถ้าเป็นการจองใหม่ ให้ตรวจสอบความพร้อม
      if (!selectedDate.booking && room && room.id) {
        // สร้าง datetime และแปลงเป็น ISO 8601 string
        const start = new Date(`${dateStr}T${startTimeStr}:00`)
        const end = new Date(`${dateStr}T${endTimeStr}:00`)

        // ตรวจสอบว่า endTime มากกว่า startTime จริงๆ
        if (end > start) {
          checkAvailability(formatDateForBackend(start), formatDateForBackend(end))
        } else {
          console.warn('End time must be after start time')
        }
      }
    }
  }, [selectedDate, isOpen, room])

  const checkAvailability = async (startTime, endTime) => {
    if (!startTime || !endTime || !room || !room.id) {
      console.warn('Missing required data for availability check:', { startTime, endTime, room })
      return
    }

    // ตรวจสอบว่า endTime มากกว่า startTime
    const start = new Date(startTime)
    const end = new Date(endTime)
    if (end <= start) {
      console.warn('End time must be after start time')
      setAvailability({ is_available: false })
      return
    }

    setCheckingAvailability(true)
    try {
      // Formatted for Backend (Local Time) to ensure precise matching
      const startISO = formatDateForBackend(startTime)
      const endISO = formatDateForBackend(endTime)

      const response = await fetch(`${API_URL}/api/rooms/${room.id}/check-availability`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          start_time: startISO,
          end_time: endISO
        })
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
        console.error('Availability check failed:', errorMessage)
        setAvailability({ is_available: false })
        return
      }

      const data = await response.json()

      if (data.success) {
        setAvailability(data.data)
      } else {
        console.error('Availability check returned unsuccessful:', data.message)
        setAvailability({ is_available: false })
      }
    } catch (error) {
      console.error('Error checking availability:', error)
      // ไม่แสดง error ให้ผู้ใช้เห็น แต่ตั้งค่าเป็นไม่ว่างเพื่อความปลอดภัย
      setAvailability({ is_available: false })
    } finally {
      setCheckingAvailability(false)
    }
  }


  const handleChange = (e) => {
    const { name, value } = e.target

    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    setError('') // ล้าง error เมื่อกรอกข้อมูลใหม่

    // ตรวจสอบความพร้อมอัตโนมัติเมื่อกรอกข้อมูลครบ
    if (name === 'start_time' && baseDate && formData.end_time) {
      const start = new Date(`${baseDate}T${value}:00`)
      const end = new Date(`${baseDate}T${formData.end_time}:00`)
      // ตรวจสอบว่า endTime มากกว่า startTime
      if (end > start) {
        checkAvailability(formatDateForBackend(start), formatDateForBackend(end))
      }
    } else if (name === 'end_time' && baseDate && formData.start_time) {
      const start = new Date(`${baseDate}T${formData.start_time}:00`)
      const end = new Date(`${baseDate}T${value}:00`)
      // ตรวจสอบว่า endTime มากกว่า startTime
      if (end > start) {
        checkAvailability(formatDateForBackend(start), formatDateForBackend(end))
      }
    }
  }

  const handleAddAttendee = () => {
    if (!attendeeEmail.trim()) {
      setError('กรุณากรอกอีเมลผู้เข้าร่วม')
      return
    }

    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(attendeeEmail)) {
      setError('รูปแบบอีเมลไม่ถูกต้อง')
      return
    }

    // Check duplicate
    if (attendees.some(a => a.email === attendeeEmail)) {
      setError('อีเมลนี้ถูกเพิ่มแล้ว')
      return
    }

    setAttendees([...attendees, {
      email: attendeeEmail,
      name: attendeeName || attendeeEmail,
      is_required: false
    }])
    setAttendeeEmail('')
    setAttendeeName('')
    setError('')
  }

  const handleRemoveAttendee = (email) => {
    setAttendees(attendees.filter(a => a.email !== email))
  }

  const toggleDayOfWeek = (day) => {
    const days = recurringData.days_of_week
    if (days.includes(day)) {
      setRecurringData({
        ...recurringData,
        days_of_week: days.filter(d => d !== day)
      })
    } else {
      setRecurringData({
        ...recurringData,
        days_of_week: [...days, day]
      })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // ตรวจสอบข้อมูลก่อนส่ง
    const missingFields = []
    if (!baseDate) missingFields.push('วันที่')
    if (!formData.start_time) missingFields.push('เวลาเริ่มต้น')
    if (!formData.end_time) missingFields.push('เวลาสิ้นสุด')
    if (!formData.purpose || formData.purpose.trim() === '') missingFields.push('วัตถุประสงค์')

    if (missingFields.length > 0) {
      setError(`กรุณากรอกข้อมูลให้ครบถ้วน: ${missingFields.join(', ')}`)
      setLoading(false)
      return
    }

    // รวมวันที่และเวลา และแปลงเป็น ISO 8601 format
    const startTime = new Date(`${baseDate}T${formData.start_time}:00`)
    const endTime = new Date(`${baseDate}T${formData.end_time}:00`)

    // ตรวจสอบว่า parse วันที่สำเร็จหรือไม่
    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      setError('รูปแบบวันที่หรือเวลาไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง')
      setLoading(false)
      return
    }

    // Formatted for Backend (Local Time)
    const fullStartTime = formatDateForBackend(startTime)
    const fullEndTime = formatDateForBackend(endTime)

    if (startTime >= endTime) {
      setError('เวลาเริ่มต้นต้องน้อยกว่าเวลาสิ้นสุด')
      setLoading(false)
      return
    }

    // ตรวจสอบว่าเวลาเริ่มต้นไม่เป็นอดีต
    const now = new Date()

    // เปรียบเทียบวันที่ก่อน (ไม่รวมเวลา)
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const selectedDate = new Date(startTime.getFullYear(), startTime.getMonth(), startTime.getDate())

    // ถ้าเลือกวันที่ในอดีต
    if (selectedDate < today) {
      setError('ไม่สามารถจองวันที่ในอดีตได้ กรุณาเลือกวันที่ปัจจุบันหรืออนาคต')
      setLoading(false)
      return
    }

    // ถ้าเลือกวันนี้ แต่เวลาเริ่มต้นเป็นอดีต
    if (selectedDate.getTime() === today.getTime() && startTime <= now) {
      setError('เวลาเริ่มต้นต้องเป็นอนาคต กรุณาเลือกเวลาที่ยังไม่ผ่านไป')
      setLoading(false)
      return
    }

    try {
      if (!token) {
        setError('กรุณาเข้าสู่ระบบก่อน')
        setLoading(false)
        return
      }

      // Handle Recurring Booking
      if (isRecurring) {
        const recurringPayload = {
          room_id: room.id,
          start_time: formData.start_time,
          end_time: formData.end_time,
          purpose: formData.purpose,
          notes: formData.notes,
          recurrence_type: recurringData.recurrence_type,
          start_date: baseDate,
          interval: recurringData.interval
        }

        if (recurringData.end_date) {
          recurringPayload.end_date = recurringData.end_date
        }
        if (recurringData.max_occurrences) {
          recurringPayload.max_occurrences = parseInt(recurringData.max_occurrences)
        }
        if (recurringData.recurrence_type === 'weekly' && recurringData.days_of_week.length > 0) {
          recurringPayload.days_of_week = recurringData.days_of_week
        }
        if (recurringData.recurrence_type === 'monthly') {
          recurringPayload.day_of_month = recurringData.day_of_month
        }

        const response = await fetch(`${API_URL}/api/recurring-bookings`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(recurringPayload)
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          setError(errorData.message || 'เกิดข้อผิดพลาดในการสร้างการจองซ้ำ')
          setLoading(false)
          return
        }

        const data = await response.json()
        if (data.success) {
          onBookingSuccess()
          setTimeout(() => {
            Swal.fire({
              title: 'สำเร็จ!',
              text: data.message || 'สร้างการจองซ้ำสำเร็จ',
              icon: 'success',
              confirmButtonText: 'ตกลง',
              confirmButtonColor: '#3B82F6'
            }).then(() => {
              router.push('/my-bookings?tab=recurring')
            })
          }, 100)
        }
        return
      }

      // Regular Booking
      const response = await fetch(`${API_URL}/api/bookings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          room_id: room.id,
          start_time: fullStartTime,
          end_time: fullEndTime,
          purpose: formData.purpose,
          notes: formData.notes
        })
      })

      if (!response.ok) {
        const status = response.status
        const statusText = response.statusText
        let errorText = ''
        let errorData = null

        // อ่าน response body - อ่านครั้งเดียวและเก็บไว้
        try {
          // อ่าน response body เป็น text
          errorText = await response.text()

          // ถ้ามีข้อมูล ลอง parse เป็น JSON
          if (errorText && errorText.trim() !== '') {
            try {
              errorData = JSON.parse(errorText)
            } catch (parseError) {
              // ไม่สามารถ parse เป็น JSON ได้ ใช้เป็น text ธรรมดา
              errorData = null
            }
          }
        } catch (e) {
          console.error('Error reading response body:', e)
          errorText = ''
          errorData = null
        }

        // Debug log - แสดงข้อมูลทั้งหมด
        const debugInfo = {
          status: status,
          statusText: statusText,
          errorText: errorText || '(empty)',
          errorData: errorData !== null ? errorData : '(null)',
          hasBody: !!(errorText && errorText.trim() !== ''),
          contentType: response.headers.get('content-type') || '(not set)',
          url: response.url || '(unknown)'
        }

        // ไม่ต้องแสดง debug log ใน production (comment out หรือลบออกได้)
        // console.error('Booking error response:', JSON.stringify(debugInfo, null, 2))

        let errorMessage = `เกิดข้อผิดพลาด (HTTP ${status})`

        // ตรวจสอบ status code เฉพาะ
        if (status === 401) {
          errorMessage = 'กรุณาเข้าสู่ระบบใหม่'
          router.push('/login')
          setLoading(false)
          return
        } else if (status === 403) {
          errorMessage = 'คุณไม่มีสิทธิ์ในการจองห้องนี้'
        } else if (status === 422) {
          // Laravel validation error
          if (errorData) {
            if (errorData.message) {
              errorMessage = errorData.message
            } else if (errorData.errors) {
              const errorMessages = Object.values(errorData.errors).flat()
              errorMessage = errorMessages.join(', ')
            }
          } else if (errorText && errorText.trim() !== '') {
            errorMessage = errorText
          } else {
            errorMessage = 'ข้อมูลที่ส่งไปไม่ถูกต้อง กรุณาตรวจสอบข้อมูลอีกครั้ง'
          }
        } else if (status === 400) {
          // Bad request - ตรวจสอบ errorData ก่อน
          if (errorData && errorData.message) {
            errorMessage = errorData.message
          } else if (errorData && errorData.errors) {
            const errorMessages = Object.values(errorData.errors).flat()
            errorMessage = errorMessages.join(', ')
          } else if (errorText && errorText.trim() !== '') {
            // ลอง parse errorText เป็น JSON ถ้าเป็น JSON string
            try {
              const parsed = JSON.parse(errorText)
              if (parsed.message) {
                errorMessage = parsed.message
              } else {
                errorMessage = errorText
              }
            } catch (e) {
              errorMessage = errorText
            }
          } else {
            errorMessage = 'ข้อมูลที่ส่งไปไม่ถูกต้อง กรุณาตรวจสอบข้อมูลอีกครั้ง'
          }
        } else if (status >= 500) {
          errorMessage = 'เกิดข้อผิดพลาดจากเซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้ง'
        } else if (errorData && errorData.message) {
          errorMessage = errorData.message
        } else if (errorText && errorText.trim() !== '') {
          errorMessage = errorText
        }

        // แสดง error message ใน UI
        setError(errorMessage)
        setLoading(false)
        return
      }

      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        console.error('Non-JSON response:', text)
        setError('Server returned invalid response format')
        return
      }

      const data = await response.json()

      if (data.success) {
        const bookingId = data.data.id

        // Add attendees if any
        if (attendees.length > 0) {
          for (const attendee of attendees) {
            try {
              await fetch(`${API_URL}/api/bookings/${bookingId}/attendees`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                  'Accept': 'application/json'
                },
                body: JSON.stringify(attendee)
              })
            } catch (err) {
              console.error('Error adding attendee:', err)
            }
          }
        }

        // แสดงข้อความสำเร็จตาม status
        const message = data.message || (data.data.status === 'pending'
          ? 'ส่งคำขอจองห้องแล้ว กรุณารอการอนุมัติจากผู้ดูแลระบบ'
          : 'จองห้องสำเร็จ')

        // ใช้ onBookingSuccess callback เพื่อ refresh calendar
        onBookingSuccess()

        // แสดงข้อความสำเร็จและ redirect
        setTimeout(() => {
          Swal.fire({
            title: 'สำเร็จ!',
            text: message + (attendees.length > 0 ? ` และเพิ่มผู้เข้าร่วม ${attendees.length} คน` : ''),
            icon: 'success',
            confirmButtonText: 'ตกลง',
            confirmButtonColor: '#3B82F6' // matches blue-600
          }).then(() => {
            router.push('/my-bookings')
          })
        }, 100)
      } else {
        setError(data.message || 'เกิดข้อผิดพลาดในการจองห้อง')
      }
    } catch (error) {
      console.error('Booking error:', error)
      setError('เกิดข้อผิดพลาดในการจองห้อง')
    } finally {
      setLoading(false)
    }
  }

  const handleCancelBooking = async () => {
    if (!cancellationReason.trim()) {
      setError('กรุณาระบุเหตุผลในการยกเลิก')
      return
    }

    if (!selectedDate?.booking) return

    try {
      setCancelling(true)
      setError('')

      const response = await fetch(`${API_URL}/api/bookings/${selectedDate.booking.id}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          cancellation_reason: cancellationReason.trim()
        })
      })

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login')
          return
        }
        const errorText = await response.text()
        let errorMessage = `เกิดข้อผิดพลาด: ${errorText || `HTTP ${response.status}`}`
        try {
          const errorData = JSON.parse(errorText)
          errorMessage = errorData.message || errorMessage
        } catch (e) {
          // ใช้ errorMessage ที่ตั้งไว้แล้ว
        }
        setError(errorMessage)
        return
      }

      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        console.error('Non-JSON response:', text)
        setError('Server returned invalid response format')
        return
      }

      const data = await response.json()

      if (data.success) {
        Swal.fire({
          title: 'ยกเลิกสำเร็จ',
          text: 'ยกเลิกการจองเรียบร้อยแล้ว',
          icon: 'success',
          confirmButtonText: 'ตกลง',
          confirmButtonColor: '#3B82F6'
        }).then(() => {
          setShowCancelForm(false)
          setCancellationReason('')
          if (onBookingSuccess) {
            onBookingSuccess()
          }
          onClose()
        })
      } else {
        setError(data.message || 'ไม่สามารถยกเลิกการจองได้')
      }
    } catch (error) {
      console.error('Error cancelling booking:', error)
      setError('เกิดข้อผิดพลาดในการยกเลิกการจอง')
    } finally {
      setCancelling(false)
    }
  }

  const formatTime = (timeString) => {
    const date = new Date(timeString)
    const hour = String(date.getHours()).padStart(2, '0')
    const minute = String(date.getMinutes()).padStart(2, '0')
    return `${hour}:${minute} น.`
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const thaiMonths = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ]
    const day = date.getDate()
    const month = thaiMonths[date.getMonth()]
    const year = date.getFullYear() + 543 // แปลงเป็น พ.ศ.
    return `${day} ${month} ${year}`
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-white/10 backdrop-blur-md flex items-end md:items-center justify-center z-50 p-0 md:p-4 animate-fadeIn">
      <div className="bg-white rounded-t-2xl md:rounded-2xl shadow-2xl w-full md:max-w-2xl max-h-[90vh] md:max-h-[90vh] overflow-hidden flex flex-col animate-slideUp">
        {/* Header - Clean & Simple */}
        <div className="bg-white border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-blue-50 rounded-xl">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {selectedDate?.booking ? 'รายละเอียดการจอง' : 'จองห้อง'}
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {room?.name} • {formatDate(selectedDate?.start)}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-6 bg-gray-50">
          {/* Room Info - Clean Card */}
          <div className="bg-white rounded-xl p-5 mb-6 border border-gray-200 shadow-sm">
            <div className="flex items-center space-x-4">
              <div className="h-16 w-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                {room?.image ? (
                  <img
                    src={`${API_URL}/${room.image}`}
                    alt={room.name}
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900 text-base mb-1">{room?.name}</h3>
                <p className="text-sm text-gray-500 mb-2">{room?.description || 'ห้องประชุม'}</p>
                <div className="flex flex-wrap gap-3 text-sm">
                  <div className="flex items-center text-gray-700">
                    <svg className="w-4 h-4 text-blue-600 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="font-medium">{room?.location}</span>
                  </div>
                  <div className="flex items-center text-gray-700">
                    <svg className="w-4 h-4 text-indigo-600 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                    <span className="font-medium">ความจุ {room?.capacity} คน</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Existing Booking Info */}
          {selectedDate?.booking && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-5 mb-6 shadow-sm">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-blue-600 rounded-lg mr-3">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h4 className="font-bold text-blue-900 text-lg">ข้อมูลการจองปัจจุบัน</h4>
              </div>
              <div className="space-y-3">
                <div className="flex items-start justify-between p-3 bg-white/60 rounded-lg">
                  <span className="text-blue-700 font-medium flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    เวลา:
                  </span>
                  <span className="text-blue-900 font-semibold">
                    {formatTime(selectedDate.booking.start_time)} - {formatTime(selectedDate.booking.end_time)}
                  </span>
                </div>
                <div className="flex items-start justify-between p-3 bg-white/60 rounded-lg">
                  <span className="text-blue-700 font-medium flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    วัตถุประสงค์:
                  </span>
                  <span className="text-blue-900 font-semibold text-right">{selectedDate.booking.purpose}</span>
                </div>
                <div className="flex items-start justify-between p-3 bg-white/60 rounded-lg">
                  <span className="text-blue-700 font-medium flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    ผู้จอง:
                  </span>
                  <span className="text-blue-900 font-semibold">{selectedDate.booking.user?.name}</span>
                </div>
                {selectedDate.booking.notes && (
                  <div className="p-3 bg-white/60 rounded-lg">
                    <span className="text-blue-700 font-medium flex items-center mb-2">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                      </svg>
                      หมายเหตุ:
                    </span>
                    <p className="text-blue-900 font-medium">{selectedDate.booking.notes}</p>
                  </div>
                )}
              </div>

              {/* Cancel Booking Section */}
              {selectedDate?.booking &&
                selectedDate.booking.status !== 'cancelled' &&
                selectedDate.booking.status !== 'rejected' &&
                (isAdmin || (user && selectedDate.booking.user_id === user.id)) && (
                  <div className="mt-6 pt-6 border-t-2 border-gray-200">
                    {!showCancelForm ? (
                      <button
                        onClick={() => setShowCancelForm(true)}
                        className="w-full px-6 py-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white rounded-xl font-semibold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        ยกเลิกการจอง
                      </button>
                    ) : (
                      <div className="bg-red-50 border-2 border-red-200 rounded-xl p-5">
                        <h4 className="text-lg font-semibold text-red-900 mb-4 flex items-center gap-2">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          ยกเลิกการจอง
                        </h4>
                        <p className="text-sm text-red-700 mb-4">
                          คุณแน่ใจหรือไม่ว่าต้องการยกเลิกการจองนี้? กรุณาระบุเหตุผลในการยกเลิก
                        </p>

                        {error && (
                          <div className="mb-4 bg-red-100 border border-red-300 rounded-lg p-3">
                            <p className="text-sm text-red-800">{error}</p>
                          </div>
                        )}

                        <div className="mb-4">
                          <label htmlFor="cancellation_reason" className="block text-sm font-medium text-gray-700 mb-2">
                            เหตุผลในการยกเลิก <span className="text-red-500">*</span>
                          </label>
                          <textarea
                            id="cancellation_reason"
                            value={cancellationReason}
                            onChange={(e) => {
                              setCancellationReason(e.target.value)
                              setError('') // Clear error when user types
                            }}
                            rows={4}
                            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                            placeholder="ระบุเหตุผลในการยกเลิกการจอง เช่น: เปลี่ยนแผน, ไม่สามารถเข้าร่วมได้, ฯลฯ"
                            required
                            maxLength={500}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            {cancellationReason.length}/500 ตัวอักษร
                          </p>
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={handleCancelBooking}
                            disabled={!cancellationReason.trim() || cancelling}
                            className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                          >
                            {cancelling ? (
                              <>
                                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                กำลังยกเลิก...
                              </>
                            ) : (
                              <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                ยืนยันยกเลิก
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => {
                              setShowCancelForm(false)
                              setCancellationReason('')
                              setError('')
                            }}
                            disabled={cancelling}
                            className="px-6 py-3 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed text-gray-700 rounded-lg font-semibold transition-all"
                          >
                            ยกเลิก
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
            </div>
          )}

          {/* Booking Form */}
          {!selectedDate?.booking && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="start_time" className="flex items-center text-sm font-semibold text-gray-900">
                    <svg className="w-4 h-4 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    เวลาเริ่มต้น
                  </label>
                  <p className="text-xs text-gray-500 ml-6">ตัวอย่าง 09:00, 13:30</p>
                  <input
                    type="time"
                    id="start_time"
                    name="start_time"
                    value={formData.start_time}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white hover:border-gray-300"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="end_time" className="flex items-center text-sm font-semibold text-gray-900">
                    <svg className="w-4 h-4 text-indigo-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    เวลาสิ้นสุด
                  </label>
                  <p className="text-xs text-gray-500 ml-6">ต้องมากกว่าเวลาเริ่มต้น</p>
                  <input
                    type="time"
                    id="end_time"
                    name="end_time"
                    value={formData.end_time}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white hover:border-gray-300"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="purpose" className="flex items-center text-sm font-semibold text-gray-900">
                  <svg className="w-4 h-4 text-purple-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  วัตถุประสงค์
                </label>
                <p className="text-xs text-gray-500 ml-6">เช่น คาบสอน, ประชุมกลุ่มย่อย, สอบสัมภาษณ์</p>
                <input
                  type="text"
                  id="purpose"
                  name="purpose"
                  required
                  value={formData.purpose}
                  onChange={handleChange}
                  placeholder="กรอกวัตถุประสงค์การจอง"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-white hover:border-gray-300"
                />
              </div>

              {/* Equipment Selection */}
              {room?.amenities?.equipment && room.amenities.equipment.length > 0 && (
                <div className="space-y-2">
                  <label className="flex items-center text-sm font-semibold text-gray-900">
                    <svg className="w-4 h-4 text-purple-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    🛠️ อุปกรณ์ที่ต้องการใช้
                  </label>
                  <p className="text-xs text-gray-500 ml-6">เลือกอุปกรณ์ที่ต้องการใช้งาน (ไม่บังคับ)</p>
                  <div className="grid grid-cols-2 gap-2 ml-6">
                    {room.amenities.equipment.map((eq, index) => {
                      const equipmentId = `${eq.name}-${index}`
                      const isSelected = selectedEquipment.some(item => item.name === eq.name)

                      return (
                        <label
                          key={index}
                          className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 cursor-pointer transition-all ${isSelected
                            ? 'bg-white/70 border-gray-400 text-gray-900'
                            : 'bg-white/50 border-gray-200 text-gray-700 hover:border-gray-300'
                            }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedEquipment([...selectedEquipment, { name: eq.name, quantity: 1 }])
                              } else {
                                setSelectedEquipment(selectedEquipment.filter(item => item.name !== eq.name))
                              }
                            }}
                            className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                          />
                          <div className="flex-1">
                            <span className="text-sm font-medium">{eq.name}</span>
                            {eq.quantity && <span className="text-xs text-gray-500 ml-1">({eq.quantity} ชิ้น)</span>}
                          </div>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="notes" className="flex items-center text-sm font-semibold text-gray-900">
                  <svg className="w-4 h-4 text-gray-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                  หมายเหตุ (ไม่บังคับ)
                </label>
                <p className="text-xs text-gray-500 ml-6">ข้อมูลเพิ่มเติม เช่น จำนวนนักศึกษา, อุปกรณ์ที่ต้องใช้</p>
                <textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="ระบุรายละเอียดเพิ่มเติม"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-all duration-200 bg-white hover:border-gray-300 resize-none"
                />
              </div>

              {/* Recurring Booking Section */}
              <div className="space-y-4 p-5 bg-white/50 backdrop-blur-sm rounded-xl border-2 border-gray-200">
                <div className="flex items-center justify-between">
                  <label className="flex items-center text-sm font-semibold text-gray-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isRecurring}
                      onChange={(e) => setIsRecurring(e.target.checked)}
                      className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500 mr-3"
                    />
                    <svg className="w-5 h-5 text-purple-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    จองซ้ำ (Recurring Booking)
                  </label>
                </div>

                {isRecurring && (
                  <div className="space-y-4 mt-4 animate-fadeIn">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">รูปแบบการจอง</label>
                        <select
                          value={recurringData.recurrence_type}
                          onChange={(e) => setRecurringData({ ...recurringData, recurrence_type: e.target.value })}
                          className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        >
                          <option value="daily">ทุกวัน (Daily)</option>
                          <option value="weekly">ทุกสัปดาห์ (Weekly)</option>
                          <option value="monthly">ทุกเดือน (Monthly)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">ทุกๆ</label>
                        <input
                          type="number"
                          min="1"
                          max="12"
                          value={recurringData.interval}
                          onChange={(e) => setRecurringData({ ...recurringData, interval: parseInt(e.target.value) || 1 })}
                          className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                          placeholder="1"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {recurringData.recurrence_type === 'daily' && 'วัน'}
                          {recurringData.recurrence_type === 'weekly' && 'สัปดาห์'}
                          {recurringData.recurrence_type === 'monthly' && 'เดือน'}
                        </p>
                      </div>
                    </div>

                    {recurringData.recurrence_type === 'weekly' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">เลือกวัน</label>
                        <div className="grid grid-cols-7 gap-2">
                          {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((day, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => toggleDayOfWeek(index)}
                              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${recurringData.days_of_week.includes(index)
                                ? 'bg-purple-600 text-white shadow-md'
                                : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-purple-300'
                                }`}
                            >
                              {day}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {recurringData.recurrence_type === 'monthly' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">วันที่ของเดือน</label>
                        <input
                          type="number"
                          min="1"
                          max="31"
                          value={recurringData.day_of_month}
                          onChange={(e) => setRecurringData({ ...recurringData, day_of_month: parseInt(e.target.value) || 1 })}
                          className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        />
                      </div>
                    )}

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">สิ้นสุดวันที่ (ไม่บังคับ)</label>
                        <input
                          type="date"
                          value={recurringData.end_date}
                          onChange={(e) => setRecurringData({ ...recurringData, end_date: e.target.value })}
                          min={baseDate}
                          className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">จำนวนครั้ง (ไม่บังคับ)</label>
                        <input
                          type="number"
                          min="1"
                          max="365"
                          value={recurringData.max_occurrences}
                          onChange={(e) => setRecurringData({ ...recurringData, max_occurrences: e.target.value })}
                          className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                          placeholder="ไม่จำกัด"
                        />
                      </div>
                    </div>

                    <div className="bg-purple-100 border border-purple-300 rounded-lg p-3">
                      <p className="text-xs text-purple-800">
                        <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        การจองซ้ำจะสร้างการจองหลายครั้งตามรูปแบบที่เลือก แต่ละครั้งจะต้องได้รับการอนุมัติแยกกัน
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Attendees Section */}
              <div className="space-y-4 p-5 bg-white/50 backdrop-blur-sm rounded-xl border-2 border-gray-200">
                <div className="flex items-center mb-3">
                  <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <label className="text-sm font-semibold text-gray-900">ผู้เข้าร่วม (Attendees)</label>
                </div>

                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <input
                      type="email"
                      value={attendeeEmail}
                      onChange={(e) => setAttendeeEmail(e.target.value)}
                      placeholder="อีเมลผู้เข้าร่วม"
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddAttendee())}
                    />
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={attendeeName}
                      onChange={(e) => setAttendeeName(e.target.value)}
                      placeholder="ชื่อ (ไม่บังคับ)"
                      className="flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddAttendee())}
                    />
                    <button
                      type="button"
                      onClick={handleAddAttendee}
                      className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      เพิ่ม
                    </button>
                  </div>
                </div>

                {attendees.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs font-medium text-gray-600">รายชื่อผู้เข้าร่วม ({attendees.length})</p>
                    {attendees.map((attendee, index) => (
                      <div key={index} className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{attendee.name}</p>
                          <p className="text-xs text-gray-500">{attendee.email}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveAttendee(attendee.email)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <p className="text-xs text-blue-700 mt-2">
                  <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  ผู้เข้าร่วมจะได้รับอีเมลเชิญเข้าร่วมการจอง
                </p>
              </div>

              {/* Availability Status */}
              {availability !== null && (
                <div className={`p-4 rounded-xl border-2 ${availability.is_available
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
                  }`}>
                  {availability.is_available ? (
                    <div className="flex items-center text-green-700">
                      <div className="p-2 bg-green-100 rounded-lg mr-3">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <span className="font-bold text-lg block">ห้องว่าง</span>
                        <span className="text-sm">สามารถจองได้</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center text-red-700">
                      <div className="p-2 bg-red-100 rounded-lg mr-3">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <span className="font-bold text-lg block">ห้องไม่ว่าง</span>
                        <span className="text-sm">กรุณาเลือกช่วงเวลาอื่น</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {checkingAvailability && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200">
                  <div className="flex items-center text-blue-700">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent mr-3"></div>
                    <span className="font-medium">กำลังตรวจสอบความพร้อม...</span>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 animate-fadeIn">
                  <div className="flex items-start">
                    <div className="p-1 bg-red-100 rounded-lg mr-3">
                      <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-red-700 flex-1">{error}</p>
                  </div>
                </div>
              )}

              {/* แจ้งเตือนสำหรับ user ปกติ */}
              {!isAdmin() && (
                <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-200 rounded-xl p-4">
                  <div className="flex items-start">
                    <div className="p-2 bg-yellow-100 rounded-lg mr-3">
                      <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-yellow-900">หมายเหตุ</p>
                      <p className="text-sm text-yellow-800 mt-1">
                        การจองของคุณจะต้องรอการอนุมัติจากผู้ดูแลระบบก่อนจึงจะสามารถใช้งานห้องได้
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex space-x-4 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={loading || !formData.start_time || !formData.end_time || !formData.purpose || (availability && !availability.is_available)}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl disabled:shadow-sm flex items-center justify-center"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                      กำลังจอง...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      ยืนยันการจอง
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Close button for viewing existing booking */}
          {selectedDate?.booking && (
            <div className="pt-6 border-t border-gray-200">
              <button
                onClick={onClose}
                className="w-full px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl font-semibold hover:from-gray-700 hover:to-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                ปิด
              </button>
            </div>
          )}
        </div>
      </div>
    </div >
  )
}

