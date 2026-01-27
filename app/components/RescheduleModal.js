'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import Swal from 'sweetalert2'
import { API_URL } from '../lib/api'

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

  // Helper: แยกส่วนประกอบวันที่และเวลาจาก String
  const parseDateTimeString = (dateStr) => {
    if (!dateStr) return { date: '', time: '' }
    const cleanStr = dateStr.replace('T', ' ').split('.')[0]
    const parts = cleanStr.split(' ')
    if (parts.length >= 2) {
      return { date: parts[0], time: parts[1].substring(0, 5) }
    }
    return { date: '', time: '' }
  }

  useEffect(() => {
    if (booking && isOpen) {
      const { date, time } = parseDateTimeString(booking.start_time)
      const endTimeParts = parseDateTimeString(booking.end_time)

      setFormData({
        date: date,
        start_time: time,
        end_time: endTimeParts.time
      })

      // เช็คห้องว่างตอนเปิด Modal
      if (date && time && endTimeParts.time) {
        // ส่งแบบมี Timezone +07:00 เพื่อความชัวร์
        const fullStartTime = `${date}T${time}:00+07:00`
        const fullEndTime = `${date}T${endTimeParts.time}:00+07:00`
        checkAvailability(fullStartTime, fullEndTime)
      }
    }
  }, [booking, isOpen])

  const checkAvailability = async (startTimeStr, endTimeStr) => {
    if (!startTimeStr || !endTimeStr || !booking || !booking.room_id) return

    // Validation (Client-side)
    const start = new Date(startTimeStr)
    const end = new Date(endTimeStr)
    if (end <= start) {
      setAvailability({ is_available: false })
      return
    }

    setCheckingAvailability(true)
    try {
      const response = await fetch(`${API_URL}/api/rooms/${booking.room_id}/check-availability`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          start_time: startTimeStr,
          end_time: endTimeStr,
          exclude_booking_id: booking.id
        })
      })

      if (!response.ok) {
        setAvailability({ is_available: false })
        return
      }

      const data = await response.json()
      if (data.success) {
        setAvailability(data.data)
      } else {
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

    if (name === 'start_time' || name === 'end_time') {
      const [hour, minute] = value.split(':').map(Number)
      if (hour < 8 || hour >= 18 || (hour === 18 && minute > 0)) {
        setError('เวลาทำการคือ 8:00 - 18:00 น.')
      } else {
        setError('')
      }
    }

    setFormData(prev => {
      const newData = { ...prev, [name]: value }
      if (newData.date && newData.start_time && newData.end_time) {
        const newStartTimeStr = `${newData.date}T${newData.start_time}:00+07:00`
        const newEndTimeStr = `${newData.date}T${newData.end_time}:00+07:00`
        checkAvailability(newStartTimeStr, newEndTimeStr)
      }
      return newData
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // --- จุดเปลี่ยนสำคัญ (FIXED) ---
    // ส่งรูปแบบ ISO 8601 ที่ระบุ Timezone +07:00 ชัดเจน
    // รูปแบบจะเป็น: "2026-01-31T08:30:00+07:00"
    // Server จะรู้ทันทีว่านี่คือ 8:30 ของไทย และจะไม่หักลบเวลาซ้ำซ้อน
    const fullStartTime = `${formData.date}T${formData.start_time}:00+07:00`
    const fullEndTime = `${formData.date}T${formData.end_time}:00+07:00`

    // Debug: เปิด Console (F12) ดูค่าที่ส่งไป
    console.log('Sending Payload with Timezone:', {
      start_time: fullStartTime,
      end_time: fullEndTime
    })

    // Validation
    const startDateObj = new Date(fullStartTime)
    const endDateObj = new Date(fullEndTime)
    const now = new Date()

    if (startDateObj >= endDateObj) {
      setError('เวลาเริ่มต้นต้องน้อยกว่าเวลาสิ้นสุด')
      setLoading(false)
      return
    }
    if (startDateObj <= now) {
      setError('เวลาเริ่มต้นต้องเป็นอนาคต')
      setLoading(false)
      return
    }

    try {
      const response = await fetch(`${API_URL}/api/bookings/${booking.id}/reschedule`, {
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
          const json = JSON.parse(errorText)
          errorMessage = json.message || errorMessage
        } catch (e) { }
        setError(errorMessage)
        return
      }

      const data = await response.json()

      if (data.success) {
        Swal.fire({
          title: 'เลื่อนจองสำเร็จ',
          text: 'เลื่อนการจองเรียบร้อยแล้ว',
          icon: 'success',
          confirmButtonText: 'ตกลง',
          confirmButtonColor: '#3B82F6'
        }).then(() => {
          if (onRescheduleSuccess) onRescheduleSuccess()
          onClose()
        })
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

  // Display Helper
  const formatTimeDisplay = (timeString) => {
    if (!timeString) return ''
    const { time } = parseDateTimeString(timeString)
    return `${time} น.`
  }

  const formatDateDisplay = (dateString) => {
    if (!dateString) return ''
    const { date } = parseDateTimeString(dateString)
    const [y, m, d] = date.split('-').map(Number)
    if (!y || !m || !d) return dateString
    const thaiMonths = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ]
    return `${d} ${thaiMonths[m - 1]} ${y + 543}`
  }

  if (!isOpen || !booking) return null

  return (
    <div className="fixed inset-0 bg-white/10 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all duration-300">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 transform transition-all scale-100">
        <div className="p-8">
          <div className="text-center mb-8 relative">
            <button
              onClick={onClose}
              className="absolute top-0 right-0 p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">เลื่อนจองห้อง</h2>
            <p className="text-gray-500 text-sm">
              {booking.room?.name || 'Sci9 204(COM)'}
            </p>
          </div>

          <div className="bg-blue-50/50 rounded-2xl p-5 mb-8">
            <h4 className="font-semibold text-blue-900 text-sm mb-3">ข้อมูลการจองปัจจุบัน</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-blue-600/80">วันที่:</span>
                <span className="text-blue-900 font-medium">{formatDateDisplay(booking.start_time)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-blue-600/80">เวลา:</span>
                <span className="text-blue-900 font-medium">
                  {formatTimeDisplay(booking.start_time)} - {formatTimeDisplay(booking.end_time)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-blue-600/80">วัตถุประสงค์:</span>
                <span className="text-blue-900 font-medium">{booking.purpose}</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="date" className="block text-sm font-semibold text-gray-700 mb-2">วันที่</label>
              <div className="relative">
                <input
                  type="date"
                  id="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  // แก้ไข min date ให้อ้างอิงเวลา Local จริงๆ
                  min={new Date().toLocaleDateString('en-CA')}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-700"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="start_time" className="block text-sm font-semibold text-gray-700 mb-2">เวลาเริ่มต้น</label>
                <input
                  type="time"
                  id="start_time"
                  name="start_time"
                  value={formData.start_time}
                  onChange={handleChange}
                  min="08:00"
                  max="18:00"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-700"
                  required
                />
              </div>

              <div>
                <label htmlFor="end_time" className="block text-sm font-semibold text-gray-700 mb-2">เวลาสิ้นสุด</label>
                <input
                  type="time"
                  id="end_time"
                  name="end_time"
                  value={formData.end_time}
                  onChange={handleChange}
                  min="08:00"
                  max="18:00"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-700"
                  required
                />
              </div>
            </div>

            {availability !== null && availability.is_available && (
              <div className="p-4 rounded-xl border border-green-100 bg-green-50/50 flex items-center text-green-700 animate-fade-in-up">
                <div className="w-5 h-5 mr-3 flex items-center justify-center bg-green-100 rounded-full">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="font-medium text-sm">ห้องว่าง สามารถเลื่อนจองได้</span>
              </div>
            )}

            {availability !== null && !availability.is_available && (
              <div className="p-4 rounded-xl border border-red-100 bg-red-50/50 flex items-center text-red-700 animate-fade-in-up">
                <div className="w-5 h-5 mr-3 flex items-center justify-center bg-red-100 rounded-full">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <span className="font-medium text-sm">ห้องไม่ว่างในช่วงเวลานี้</span>
              </div>
            )}

            {checkingAvailability && (
              <div className="p-4 rounded-xl bg-gray-50 flex items-center text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-blue-600 mr-3"></div>
                <span className="text-sm">กำลังตรวจสอบ...</span>
              </div>
            )}

            {error && (
              <div className="p-4 rounded-xl bg-red-50 text-red-600 text-sm flex items-start">
                <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            <div className="flex gap-4 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3.5 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-all duration-200"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={loading || !formData.start_time || !formData.end_time || !formData.date || (availability && !availability.is_available)}
                className="flex-1 px-6 py-3.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 shadow-lg shadow-blue-200 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed transition-all duration-200"
              >
                {loading ? 'กำลังบันทึก...' : 'ยืนยันการเลื่อนจอง'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}