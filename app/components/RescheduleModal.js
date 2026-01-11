'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

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
      
      const dateStr = startTime.toISOString().slice(0, 10)
      const startTimeStr = startTime.toTimeString().slice(0, 5)
      const endTimeStr = endTime.toTimeString().slice(0, 5)
      
      setFormData({
        date: dateStr,
        start_time: startTimeStr,
        end_time: endTimeStr
      })
      
      // ตรวจสอบความพร้อม
      const fullStartTime = `${dateStr}T${startTimeStr}:00`
      const fullEndTime = `${dateStr}T${endTimeStr}:00`
      checkAvailability(fullStartTime, fullEndTime)
    }
  }, [booking, isOpen])

  const checkAvailability = async (startTime, endTime) => {
    if (!startTime || !endTime || !booking) return

    setCheckingAvailability(true)
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/rooms/${booking.room_id}/check-availability`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          start_time: startTime,
          end_time: endTime,
          exclude_booking_id: booking.id
        })
      })
      
      if (!response.ok) {
        console.error('Error checking availability: HTTP', response.status)
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
      }
    } catch (error) {
      console.error('Error checking availability:', error)
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
    
    // ตรวจสอบความพร้อมอัตโนมัติเมื่อกรอกข้อมูลครบ
    if (name === 'start_time' && formData.date && formData.end_time) {
      const fullStartTime = `${formData.date}T${value}:00`
      const fullEndTime = `${formData.date}T${formData.end_time}:00`
      checkAvailability(fullStartTime, fullEndTime)
    } else if (name === 'end_time' && formData.date && formData.start_time) {
      const fullStartTime = `${formData.date}T${formData.start_time}:00`
      const fullEndTime = `${formData.date}T${value}:00`
      checkAvailability(fullStartTime, fullEndTime)
    } else if (name === 'date' && formData.start_time && formData.end_time) {
      const fullStartTime = `${value}T${formData.start_time}:00`
      const fullEndTime = `${value}T${formData.end_time}:00`
      checkAvailability(fullStartTime, fullEndTime)
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

    // รวมวันที่และเวลา
    const fullStartTime = `${formData.date}T${formData.start_time}:00`
    const fullEndTime = `${formData.date}T${formData.end_time}:00`

    // ตรวจสอบว่าเวลาเริ่มต้นไม่เกินเวลาสิ้นสุด
    const startTime = new Date(fullStartTime)
    const endTime = new Date(fullEndTime)
    
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

      if (data.success) {
        onRescheduleSuccess()
        onClose()
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
    return date.toLocaleTimeString('th-TH', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">เลือกช่วงเวลาอย่างรวดเร็ว</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (!formData.start_time || !formData.date) return
                      const [h, m] = formData.start_time.split(':').map(Number)
                      const d = new Date(2000, 0, 1, h, m)
                      d.setMinutes(d.getMinutes() + 30)
                      const end = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
                      setFormData(prev => ({ ...prev, end_time: end }))
                      checkAvailability(`${formData.date}T${formData.start_time}:00`, `${formData.date}T${end}:00`)
                    }}
                    className="px-3 py-1 text-xs rounded-md border border-gray-300 hover:bg-gray-100"
                  >30 นาที</button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!formData.start_time || !formData.date) return
                      const [h, m] = formData.start_time.split(':').map(Number)
                      const d = new Date(2000, 0, 1, h, m)
                      d.setMinutes(d.getMinutes() + 60)
                      const end = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
                      setFormData(prev => ({ ...prev, end_time: end }))
                      checkAvailability(`${formData.date}T${formData.start_time}:00`, `${formData.date}T${end}:00`)
                    }}
                    className="px-3 py-1 text-xs rounded-md border border-gray-300 hover:bg-gray-100"
                  >1 ชม.</button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!formData.start_time || !formData.date) return
                      const [h, m] = formData.start_time.split(':').map(Number)
                      const d = new Date(2000, 0, 1, h, m)
                      d.setMinutes(d.getMinutes() + 120)
                      const end = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
                      setFormData(prev => ({ ...prev, end_time: end }))
                      checkAvailability(`${formData.date}T${formData.start_time}:00`, `${formData.date}T${end}:00`)
                    }}
                    className="px-3 py-1 text-xs rounded-md border border-gray-300 hover:bg-gray-100"
                  >2 ชม.</button>
                </div>
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

