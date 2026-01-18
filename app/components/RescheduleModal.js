'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import Swal from 'sweetalert2'

export default function RescheduleModal({ isOpen, onClose, booking, onRescheduleSuccess }) {
  const [formData, setFormData] = useState({
    start_time: '',
    end_time: '',
    date: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [availability, setAvailability] = useState(null)
  const [checkingAvailability, setCheckingAvailability] = useState(false)
  const { token } = useAuth()

  useEffect(() => {
    if (booking && isOpen) {
      const startTime = new Date(booking.start_time)
      const endTime = new Date(booking.end_time)

      // ใช้ local time components โดยตรงเพื่อหลีกเลี่ยงปัญหา timezone
      // getFullYear(), getMonth(), getDate() จะได้ค่าใน local timezone
      const year = startTime.getFullYear()
      const month = String(startTime.getMonth() + 1).padStart(2, '0')
      const day = String(startTime.getDate()).padStart(2, '0')
      const dateStr = `${year}-${month}-${day}`

      // ใช้ getHours() และ getMinutes() เพื่อได้เวลาใน local timezone
      const startHour = String(startTime.getHours()).padStart(2, '0')
      const startMinute = String(startTime.getMinutes()).padStart(2, '0')
      const startTimeStr = `${startHour}:${startMinute}`

      const endHour = String(endTime.getHours()).padStart(2, '0')
      const endMinute = String(endTime.getMinutes()).padStart(2, '0')
      const endTimeStr = `${endHour}:${endMinute}`

      setFormData({
        date: dateStr,
        start_time: startTimeStr,
        end_time: endTimeStr
      })

      // ตรวจสอบความพร้อม - สร้าง Date object จาก local time components
      const startDateTime = new Date(year, startTime.getMonth(), startTime.getDate(), startTime.getHours(), startTime.getMinutes(), 0)
      const endDateTime = new Date(endTime.getFullYear(), endTime.getMonth(), endTime.getDate(), endTime.getHours(), endTime.getMinutes(), 0)
      checkAvailability(startDateTime.toISOString(), endDateTime.toISOString())
    }
  }, [booking, isOpen])

  const checkAvailability = async (startTime, endTime) => {
    if (!startTime || !endTime || !booking || !booking.room_id) {
      console.warn('Missing required data for availability check:', { startTime, endTime, booking })
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
      // แปลงเป็น ISO 8601 format สำหรับ Laravel
      const startISO = new Date(startTime).toISOString()
      const endISO = new Date(endTime).toISOString()

      const response = await fetch(`http://127.0.0.1:8000/api/rooms/${booking.room_id}/check-availability`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          start_time: startISO,
          end_time: endISO,
          exclude_booking_id: booking.id
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

      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        console.error('Non-JSON response:', text)
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
      setAvailability({ is_available: false })
    } finally {
      setCheckingAvailability(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target

    // ตรวจสอบเวลาทำการ (8:00 - 18:00)
    if (name === 'start_time' || name === 'end_time') {
      const [hour, minute] = value.split(':').map(Number)
      if (hour < 8 || hour >= 18) {
        setError('เวลาทำการคือ 8:00 - 18:00 น. กรุณาเลือกเวลาในช่วงเวลาทำการ')
        return
      }
      if (hour === 18 && minute > 0) {
        setError('เวลาทำการคือ 8:00 - 18:00 น. กรุณาเลือกเวลาในช่วงเวลาทำการ')
        return
      }
    }

    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    setError('') // ล้าง error เมื่อกรอกข้อมูลใหม่

    // ตรวจสอบความพร้อมอัตโนมัติเมื่อกรอกข้อมูลครบ
    if (name === 'start_time' && formData.date && formData.end_time) {
      const startTimeStr = `${formData.date} ${value}:00`
      const endTimeStr = `${formData.date} ${formData.end_time}:00`
      // สร้าง Date object สำหรับแปลงเป็น ISO string สำหรับ API
      const startTime = new Date(`${formData.date}T${value}:00`)
      const endTime = new Date(`${formData.date}T${formData.end_time}:00`)
      checkAvailability(startTime.toISOString(), endTime.toISOString())
    } else if (name === 'end_time' && formData.date && formData.start_time) {
      const startTime = new Date(`${formData.date}T${formData.start_time}:00`)
      const endTime = new Date(`${formData.date}T${value}:00`)
      checkAvailability(startTime.toISOString(), endTime.toISOString())
    } else if (name === 'date' && formData.start_time && formData.end_time) {
      const startTime = new Date(`${value}T${formData.start_time}:00`)
      const endTime = new Date(`${value}T${formData.end_time}:00`)
      checkAvailability(startTime.toISOString(), endTime.toISOString())
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // ตรวจสอบข้อมูลก่อนส่ง
    if (!formData.date || !formData.start_time || !formData.end_time) {
      setError('กรุณากรอกข้อมูลให้ครบถ้วน')
      setLoading(false)
      return
    }

    // สร้าง Date object จาก local time components เพื่อใช้ในการตรวจสอบ
    const [year, month, day] = formData.date.split('-').map(Number)
    const [startHour, startMinute] = formData.start_time.split(':').map(Number)
    const [endHour, endMinute] = formData.end_time.split(':').map(Number)

    // ตรวจสอบเวลาทำการ (8:00 - 18:00)
    if (startHour < 8 || startHour >= 18) {
      setError('เวลาทำการคือ 8:00 - 18:00 น. กรุณาเลือกเวลาเริ่มต้นในช่วงเวลาทำการ')
      setLoading(false)
      return
    }
    if (startHour === 18 && startMinute > 0) {
      setError('เวลาทำการคือ 8:00 - 18:00 น. กรุณาเลือกเวลาเริ่มต้นในช่วงเวลาทำการ')
      setLoading(false)
      return
    }
    if (endHour < 8 || endHour > 18) {
      setError('เวลาทำการคือ 8:00 - 18:00 น. กรุณาเลือกเวลาสิ้นสุดในช่วงเวลาทำการ')
      setLoading(false)
      return
    }
    if (endHour === 18 && endMinute > 0) {
      setError('เวลาทำการคือ 8:00 - 18:00 น. กรุณาเลือกเวลาสิ้นสุดในช่วงเวลาทำการ')
      setLoading(false)
      return
    }

    // สร้าง Date object จาก local time components (ไม่ระบุ timezone = local time)
    const startTime = new Date(year, month - 1, day, startHour, startMinute, 0)
    const endTime = new Date(year, month - 1, day, endHour, endMinute, 0)

    // ใช้ toISOString() เพื่อแปลงเป็น ISO 8601 string ที่มี timezone offset
    // toISOString() จะแปลงเป็น UTC แต่เราต้องการส่ง local time
    // ดังนั้นให้สร้าง datetime string ที่ระบุ timezone offset ของ local time
    const timezoneOffset = -startTime.getTimezoneOffset() // นาที (UTC+7 = -420)
    const offsetHours = Math.floor(Math.abs(timezoneOffset) / 60)
    const offsetMinutes = Math.abs(timezoneOffset) % 60
    const offsetSign = timezoneOffset >= 0 ? '+' : '-'
    const offsetString = `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMinutes).padStart(2, '0')}`

    // สร้าง ISO 8601 string ที่ระบุ local timezone โดยตรง
    // ใช้ format: YYYY-MM-DDTHH:mm:ss+HH:mm
    const fullStartTime = `${formData.date}T${formData.start_time}:00${offsetString}`
    const fullEndTime = `${formData.date}T${formData.end_time}:00${offsetString}`

    // Debug: ตรวจสอบ datetime string ที่สร้าง
    console.log('Created datetime strings:', {
      date: formData.date,
      start_time: formData.start_time,
      end_time: formData.end_time,
      timezoneOffset: timezoneOffset,
      offsetString: offsetString,
      fullStartTime: fullStartTime,
      fullEndTime: fullEndTime,
      startTimeLocal: startTime.toLocaleString('th-TH'),
      endTimeLocal: endTime.toLocaleString('th-TH')
    })

    if (startTime >= endTime) {
      setError('เวลาเริ่มต้นต้องน้อยกว่าเวลาสิ้นสุด')
      setLoading(false)
      return
    }

    // ตรวจสอบว่าเวลาเริ่มต้นไม่เป็นอดีต
    const now = new Date()
    if (startTime <= now) {
      setError('เวลาเริ่มต้นต้องเป็นอนาคต')
      setLoading(false)
      return
    }

    try {
      // Debug: แสดงข้อมูลที่ส่งไป
      console.log('Sending reschedule request:', {
        start_time: fullStartTime,
        end_time: fullEndTime,
        booking_id: booking.id
      })

      const response = await fetch(`http://127.0.0.1:8000/api/bookings/${booking.id}/reschedule`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          start_time: fullStartTime,
          end_time: fullEndTime
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

      // Debug: แสดงข้อมูลที่ได้รับกลับมา
      console.log('Reschedule response:', data)
      if (data.data) {
        console.log('Updated booking data:', {
          start_time: data.data.start_time,
          end_time: data.data.end_time,
          start_time_parsed: new Date(data.data.start_time).toLocaleString('th-TH'),
          end_time_parsed: new Date(data.data.end_time).toLocaleString('th-TH')
        })
      }

      if (data.success) {
        // เรียก callback เพื่อ refresh ข้อมูลการจอง
        // ใช้ setTimeout เพื่อให้ backend มีเวลา update ข้อมูลก่อน
        setTimeout(() => {
          Swal.fire({
            title: 'เลื่อนจองสำเร็จ',
            text: 'เลื่อนการจองเรียบร้อยแล้ว',
            icon: 'success',
            confirmButtonText: 'ตกลง',
            confirmButtonColor: '#3B82F6'
          }).then(() => {
            if (onRescheduleSuccess) {
              onRescheduleSuccess()
            }
            onClose()
          })
        }, 300)
      } else {
        setError(data.message || 'เกิดข้อผิดพลาดในการเลื่อนจอง')
      }
    } catch (error) {
      console.error('Reschedule error:', error)
      setError('เกิดข้อผิดพลาดในการเลื่อนจอง')
    } finally {
      setLoading(false)
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

  if (!isOpen || !booking) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">เลื่อนจองห้อง</h2>
              <p className="text-gray-600 mt-1">
                {booking.room?.name || 'ห้อง'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Current Booking Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h4 className="font-semibold text-blue-900 mb-2">ข้อมูลการจองปัจจุบัน</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-blue-700">วันที่:</span>
                <span className="text-blue-900">{formatDate(booking.start_time)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700">เวลา:</span>
                <span className="text-blue-900">
                  {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700">วัตถุประสงค์:</span>
                <span className="text-blue-900">{booking.purpose}</span>
              </div>
            </div>
          </div>

          {/* Reschedule Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-900 mb-1">วันที่</label>
              <input
                type="date"
                id="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="start_time" className="block text-sm font-medium text-gray-900 mb-1">เวลาเริ่มต้น</label>
                <input
                  type="time"
                  id="start_time"
                  name="start_time"
                  value={formData.start_time}
                  onChange={handleChange}
                  min="08:00"
                  max="17:59"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="end_time" className="block text-sm font-medium text-gray-900 mb-1">เวลาสิ้นสุด</label>
                <input
                  type="time"
                  id="end_time"
                  name="end_time"
                  value={formData.end_time}
                  onChange={handleChange}
                  min="08:00"
                  max="18:00"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>

            {/* Availability Status */}
            {availability !== null && (
              <div className="p-4 rounded-lg border">
                {availability.is_available ? (
                  <div className="flex items-center text-green-700">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="font-medium">ห้องว่าง สามารถเลื่อนจองได้</span>
                  </div>
                ) : (
                  <div className="flex items-center text-red-700">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span className="font-medium">ห้องไม่ว่างในช่วงเวลานี้</span>
                  </div>
                )}
              </div>
            )}

            {checkingAvailability && (
              <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                <div className="flex items-center text-blue-700">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                  <span className="text-sm">กำลังตรวจสอบความพร้อม...</span>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="flex space-x-4 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={loading || !formData.start_time || !formData.end_time || !formData.date || (availability && !availability.is_available)}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'กำลังเลื่อนจอง...' : 'ยืนยันการเลื่อนจอง'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

