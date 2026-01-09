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
  const { user, token, isAdmin } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (selectedDate && isOpen) {
      const startTime = new Date(selectedDate.start)
      const endTime = new Date(selectedDate.end)
      
      // ถ้าเป็นการจองใหม่ ให้ตั้งเวลาเริ่มต้นเป็นชั่วโมงถัดไป
      if (!selectedDate.booking) {
        // ตั้งเวลาเริ่มต้นเป็นชั่วโมงถัดไป
        const nextHour = startTime.getHours() + 1
        startTime.setHours(nextHour, 0, 0, 0)
        // ตั้งเวลาสิ้นสุดเป็น 2 ชั่วโมงหลังจากเวลาเริ่มต้น
        endTime.setHours(nextHour + 2, 0, 0, 0)
      }
      
      // แยกวันที่และเวลา (เก็บวันที่ภายใน ไม่แสดงใน UI)
      // ใช้ toISOString() เพื่อให้ได้ format ที่ถูกต้อง
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
      if (!selectedDate.booking && room && room.id) {
        // สร้าง datetime string ในรูปแบบ ISO 8601
        const fullStartTime = `${dateStr}T${startTimeStr}:00`
        const fullEndTime = `${dateStr}T${endTimeStr}:00`
        
        // ตรวจสอบว่า endTime มากกว่า startTime จริงๆ
        const start = new Date(fullStartTime)
        const end = new Date(fullEndTime)
        
        if (end > start) {
          checkAvailability(fullStartTime, fullEndTime)
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
      // แปลงเป็น ISO 8601 format สำหรับ Laravel
      const startISO = new Date(startTime).toISOString()
      const endISO = new Date(endTime).toISOString()
      
      const response = await fetch(`http://127.0.0.1:8000/api/rooms/${room.id}/check-availability`, {
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
    
    // ตรวจสอบความพร้อมอัตโนมัติเมื่อกรอกข้อมูลครบ
    if (name === 'start_time' && baseDate && formData.end_time) {
      const fullStartTime = `${baseDate}T${value}:00`
      const fullEndTime = `${baseDate}T${formData.end_time}:00`
      // ตรวจสอบว่า endTime มากกว่า startTime
      const start = new Date(fullStartTime)
      const end = new Date(fullEndTime)
      if (end > start) {
        checkAvailability(fullStartTime, fullEndTime)
      }
    } else if (name === 'end_time' && baseDate && formData.start_time) {
      const fullStartTime = `${baseDate}T${formData.start_time}:00`
      const fullEndTime = `${baseDate}T${value}:00`
      // ตรวจสอบว่า endTime มากกว่า startTime
      const start = new Date(fullStartTime)
      const end = new Date(fullEndTime)
      if (end > start) {
        checkAvailability(fullStartTime, fullEndTime)
      }
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
    const fullStartTime = `${baseDate}T${formData.start_time}:00`
    const fullEndTime = `${baseDate}T${formData.end_time}:00`

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
          'Authorization': `Bearer ${token}`,
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
        // แสดงข้อความสำเร็จตาม status
        const message = data.message || (data.data.status === 'pending' 
          ? 'ส่งคำขอจองห้องแล้ว กรุณารอการอนุมัติจากผู้ดูแลระบบ' 
          : 'จองห้องสำเร็จ')
        
        // ใช้ onBookingSuccess callback เพื่อ refresh calendar
        onBookingSuccess()
        
        // แสดงข้อความสำเร็จและ redirect
        setTimeout(() => {
          alert(message)
          router.push('/my-bookings')
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
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-slideUp">
        {/* Header with Gradient */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold">
                    {selectedDate?.booking ? 'รายละเอียดการจอง' : 'จองห้อง'}
                  </h2>
                  <p className="text-blue-100 mt-1 text-sm">
                    {room?.name} • {formatDate(selectedDate?.start)}
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-all duration-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-6">
          {/* Room Info */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 mb-6 border border-blue-100 shadow-sm">
            <div className="flex items-center space-x-4">
              <div className="h-20 w-20 bg-white rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
                {room?.image ? (
                  <img
                    src={`http://127.0.0.1:8000/${room.image}`}
                    alt={room.name}
                    className="w-full h-full object-cover rounded-xl"
                  />
                ) : (
                  <svg className="w-10 h-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900 text-lg mb-1">{room?.name}</h3>
                <p className="text-sm text-gray-600 mb-3">{room?.description || 'ห้องประชุม'}</p>
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

              <div className="bg-gradient-to-r from-gray-50 to-blue-50 border-2 border-gray-200 rounded-xl p-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-gray-700 flex items-center">
                    <svg className="w-4 h-4 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    เลือกช่วงเวลาอย่างรวดเร็ว
                  </span>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        if (!formData.start_time || !baseDate) return
                        // ใช้ baseDate เพื่อให้คำนวณเวลาถูกต้องแม้ผ่านเที่ยงคืน
                        const startDateTime = new Date(`${baseDate}T${formData.start_time}:00`)
                        const endDateTime = new Date(startDateTime)
                        endDateTime.setMinutes(endDateTime.getMinutes() + 30)
                        const end = `${String(endDateTime.getHours()).padStart(2, '0')}:${String(endDateTime.getMinutes()).padStart(2, '0')}`
                        setFormData(prev => ({ ...prev, end_time: end }))
                        const fullStartTime = `${baseDate}T${formData.start_time}:00`
                        const fullEndTime = endDateTime.toISOString().slice(0, 19)
                        checkAvailability(fullStartTime, fullEndTime)
                      }}
                      className="px-4 py-2 text-sm font-medium rounded-lg border-2 border-gray-300 bg-white hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700 transition-all duration-200 shadow-sm hover:shadow-md"
                    >30 นาที</button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!formData.start_time || !baseDate) return
                        // ใช้ baseDate เพื่อให้คำนวณเวลาถูกต้องแม้ผ่านเที่ยงคืน
                        const startDateTime = new Date(`${baseDate}T${formData.start_time}:00`)
                        const endDateTime = new Date(startDateTime)
                        endDateTime.setMinutes(endDateTime.getMinutes() + 60)
                        const end = `${String(endDateTime.getHours()).padStart(2, '0')}:${String(endDateTime.getMinutes()).padStart(2, '0')}`
                        setFormData(prev => ({ ...prev, end_time: end }))
                        const fullStartTime = `${baseDate}T${formData.start_time}:00`
                        const fullEndTime = endDateTime.toISOString().slice(0, 19)
                        checkAvailability(fullStartTime, fullEndTime)
                      }}
                      className="px-4 py-2 text-sm font-medium rounded-lg border-2 border-gray-300 bg-white hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700 transition-all duration-200 shadow-sm hover:shadow-md"
                    >1 ชม.</button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!formData.start_time || !baseDate) return
                        // ใช้ baseDate เพื่อให้คำนวณเวลาถูกต้องแม้ผ่านเที่ยงคืน
                        const startDateTime = new Date(`${baseDate}T${formData.start_time}:00`)
                        const endDateTime = new Date(startDateTime)
                        endDateTime.setMinutes(endDateTime.getMinutes() + 120)
                        const end = `${String(endDateTime.getHours()).padStart(2, '0')}:${String(endDateTime.getMinutes()).padStart(2, '0')}`
                        setFormData(prev => ({ ...prev, end_time: end }))
                        const fullStartTime = `${baseDate}T${formData.start_time}:00`
                        const fullEndTime = endDateTime.toISOString().slice(0, 19)
                        checkAvailability(fullStartTime, fullEndTime)
                      }}
                      className="px-4 py-2 text-sm font-medium rounded-lg border-2 border-gray-300 bg-white hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700 transition-all duration-200 shadow-sm hover:shadow-md"
                    >2 ชม.</button>
                  </div>
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

              {/* Availability Status */}
              {availability !== null && (
                <div className={`p-4 rounded-xl border-2 ${
                  availability.is_available 
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
    </div>
  )
}
