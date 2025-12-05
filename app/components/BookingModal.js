'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

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
  const { user, token } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (selectedDate && isOpen) {
      const startTime = new Date(selectedDate.start)
      const endTime = new Date(selectedDate.end)
      
      // ถ้าเป็นการจองใหม่ ให้ตั้งเวลาเริ่มต้นเป็นชั่วโมงถัดไป
      if (!selectedDate.booking) {
        startTime.setHours(startTime.getHours() + 1, 0, 0, 0)
        endTime.setHours(startTime.getHours() + 2, 0, 0, 0)
      }
      
      // แยกวันที่และเวลา (เก็บวันที่ภายใน ไม่แสดงใน UI)
      const dateStr = startTime.toISOString().slice(0, 10)
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
      if (!selectedDate.booking) {
        const fullStartTime = `${dateStr}T${startTimeStr}:00`
        const fullEndTime = `${dateStr}T${endTimeStr}:00`
        checkAvailability(fullStartTime, fullEndTime)
      }
    }
  }, [selectedDate, isOpen])

  const checkAvailability = async (startTime, endTime) => {
    if (!startTime || !endTime) return

    setCheckingAvailability(true)
    try {
        const response = await fetch('http://127.0.0.1:8000/api/rooms/${room.id}/check-availability', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          start_time: startTime,
          end_time: endTime
        })
      })
      
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
    if (name === 'start_time' && baseDate && formData.end_time) {
      const fullStartTime = '${baseDate}T${value}:00'
      const fullEndTime = '${baseDate}T${formData.end_time}:00'
      checkAvailability(fullStartTime, fullEndTime)
    } else if (name === 'end_time' && baseDate && formData.start_time) {
      const fullStartTime = '${baseDate}T${formData.start_time}:00'
      const fullEndTime = '${baseDate}T${value}:00'
      checkAvailability(fullStartTime, fullEndTime)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // ตรวจสอบข้อมูลก่อนส่ง
    if (!baseDate || !formData.start_time || !formData.end_time || !formData.purpose) {
      setError('กรุณากรอกข้อมูลให้ครบถ้วน')
      setLoading(false)
      return
    }

    // รวมวันที่และเวลา
    const fullStartTime = '${baseDate}T${formData.start_time}:00'
    const fullEndTime = '${baseDate}T${formData.end_time}:00'

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
      const response = await fetch('http://127.0.0.1:8000/api/bookings', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ${token}',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          room_id: room.id,
          start_time: fullStartTime,
          end_time: fullEndTime,
          purpose: formData.purpose,
          notes: formData.notes
        })
      })

      const data = await response.json()

      if (data.success) {
        onBookingSuccess()
        router.push('/my-bookings')
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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {selectedDate?.booking ? 'รายละเอียดการจอง' : 'จองห้อง'}
              </h2>
              <p className="text-gray-600 mt-1">
                {room?.name} - {formatDate(selectedDate?.start)}
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

          {/* Room Info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-4">
              <div className="h-16 w-16 bg-gray-200 rounded-lg flex items-center justify-center">
                {room?.image ? (
                  <img
                    src={'http://127.0.0.1:8000/${room.image}'}
                    alt={room.name}
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{room?.name}</h3>
                <p className="text-sm text-gray-600">{room?.description}</p>
                <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                  <span>📍 {room?.location}</span>
                  <span>👥 ความจุ {room?.capacity} คน</span>
                </div>
              </div>
            </div>
          </div>

          {/* Existing Booking Info */}
          {selectedDate?.booking && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h4 className="font-semibold text-blue-900 mb-2">ข้อมูลการจองปัจจุบัน</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-blue-700">เวลา:</span>
                  <span className="text-blue-900">
                    {formatTime(selectedDate.booking.start_time)} - {formatTime(selectedDate.booking.end_time)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">วัตถุประสงค์:</span>
                  <span className="text-blue-900">{selectedDate.booking.purpose}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">ผู้จอง:</span>
                  <span className="text-blue-900">{selectedDate.booking.user?.name}</span>
                </div>
                {selectedDate.booking.notes && (
                  <div className="flex justify-between">
                    <span className="text-blue-700">หมายเหตุ:</span>
                    <span className="text-blue-900">{selectedDate.booking.notes}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Booking Form */}
          {!selectedDate?.booking && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="start_time" className="block text-sm font-medium text-gray-900 mb-1">เวลาเริ่มต้น</label>
                  <p className="text-xs text-gray-500 mb-2">ตัวอย่าง 09:00, 13:30</p>
                  <input
                    type="time"
                    id="start_time"
                    name="start_time"
                    value={formData.start_time}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="end_time" className="block text-sm font-medium text-gray-900 mb-1">เวลาสิ้นสุด</label>
                  <p className="text-xs text-gray-500 mb-2">ต้องมากกว่าเวลาเริ่มต้น</p>
                  <input
                    type="time"
                    id="end_time"
                    name="end_time"
                    value={formData.end_time}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                        if (!formData.start_time || !baseDate) return
                        const [h, m] = formData.start_time.split(':').map(Number)
                        const d = new Date(2000, 0, 1, h, m)
                        d.setMinutes(d.getMinutes() + 30)
                        const end = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
                        setFormData(prev => ({ ...prev, end_time: end }))
                        checkAvailability(`${baseDate}T${formData.start_time}:00`, `${baseDate}T${end}:00`)
                      }}
                      className="px-3 py-1 text-xs rounded-md border border-gray-300 hover:bg-gray-100"
                    >30 นาที</button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!formData.start_time || !baseDate) return
                        const [h, m] = formData.start_time.split(':').map(Number)
                        const d = new Date(2000, 0, 1, h, m)
                        d.setMinutes(d.getMinutes() + 60)
                        const end = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
                        setFormData(prev => ({ ...prev, end_time: end }))
                        checkAvailability('${baseDate}T${formData.start_time}:00', '${baseDate}T${end}:00')
                      }}
                      className="px-3 py-1 text-xs rounded-md border border-gray-300 hover:bg-gray-100"
                    >1 ชม.</button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!formData.start_time || !baseDate) return
                        const [h, m] = formData.start_time.split(':').map(Number)
                        const d = new Date(2000, 0, 1, h, m)
                        d.setMinutes(d.getMinutes() + 120)
                        const end = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
                        setFormData(prev => ({ ...prev, end_time: end }))
                        checkAvailability('${baseDate}T${formData.start_time}:00','${baseDate}T${end}:00')
                      }}
                      className="px-3 py-1 text-xs rounded-md border border-gray-300 hover:bg-gray-100"
                    >2 ชม.</button>
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="purpose" className="block text-sm font-medium text-gray-900 mb-1">วัตถุประสงค์</label>
                <p className="text-xs text-gray-500 mb-2">เช่น คาบสอน, ประชุมกลุ่มย่อย, สอบสัมภาษณ์</p>
                <input
                  type="text"
                  id="purpose"
                  name="purpose"
                  required
                  value={formData.purpose}
                  onChange={handleChange}
                  placeholder="กรอกวัตถุประสงค์การจอง"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-900 mb-1">หมายเหตุ (ไม่บังคับ)</label>
                <p className="text-xs text-gray-500 mb-2">ข้อมูลเพิ่มเติม เช่น จำนวนนักศึกษา, อุปกรณ์ที่ต้องใช้</p>
                <textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="ระบุรายละเอียดเพิ่มเติม"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Availability Status */}
              {availability !== null && (
                <div className="p-4 rounded-lg border">
                  {availability.is_available ? (
                    <div className="flex items-center text-green-700">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="font-medium">ห้องว่าง สามารถจองได้</span>
                    </div>
                  ) : (
                    <div className="flex items-center text-red-700">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span className="font-medium">ห้องไม่ว่าง</span>
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
                  disabled={loading || !formData.start_time || !formData.end_time || !formData.purpose || (availability && !availability.is_available)}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'กำลังจอง...' : 'ยืนยันการจอง'}
                </button>
              </div>
            </form>
          )}

          {/* Close button for viewing existing booking */}
          {selectedDate?.booking && (
            <div className="pt-4">
              <button
                onClick={onClose}
                className="w-full px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
              >
                ปิด
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
