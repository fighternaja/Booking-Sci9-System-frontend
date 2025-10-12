'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../../contexts/AuthContext'
import { convertDDMMYYYYToISOWithTime, formatDateTimeToDDMMYYYY } from '../../../utils/dateUtils'

export default function BookRoomPage() {
  const [room, setRoom] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    start_time: '',
    end_time: '',
    purpose: '',
    notes: ''
  })
  const [displayStartTime, setDisplayStartTime] = useState('')
  const [displayEndTime, setDisplayEndTime] = useState('')
  const startTimeRef = useRef(null)
  const endTimeRef = useRef(null)
  const { user, token } = useAuth()
  const params = useParams()
  const router = useRouter()

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }
    fetchRoom()
  }, [user, router])

  // อัพเดท display values เมื่อ formData เปลี่ยน
  useEffect(() => {
    if (formData.start_time) {
      setDisplayStartTime(formatDateTimeToDDMMYYYY(formData.start_time))
    }
    if (formData.end_time) {
      setDisplayEndTime(formatDateTimeToDDMMYYYY(formData.end_time))
    }
  }, [formData.start_time, formData.end_time])

  const fetchRoom = async () => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/rooms/${params.id}`)
      const data = await response.json()
      
      if (data.success) {
        setRoom(data.data)
      }
    } catch (error) {
      console.error('Error fetching room:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleDisplayDateTimeChange = (field, value) => {
    if (field === 'start_time') {
      setDisplayStartTime(value)
    } else if (field === 'end_time') {
      setDisplayEndTime(value)
    }
    
    // ตรวจสอบรูปแบบ DD/MM/YYYY HH:MM
    if (value.match(/^\d{1,2}\/\d{1,2}\/\d{4} \d{1,2}:\d{2}$/)) {
      const isoDateTime = convertDDMMYYYYToISOWithTime(value)
      setFormData(prev => ({
        ...prev,
        [field]: isoDateTime
      }))
    } else if (value === '') {
      // ถ้าผู้ใช้ลบข้อมูล ให้ล้างค่า
      setFormData(prev => ({
        ...prev,
        [field]: ''
      }))
    }
  }

  const handleDateTimePickerChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // อัพเดท display value
    if (value) {
      const displayValue = formatDateTimeToDDMMYYYY(value)
      if (field === 'start_time') {
        setDisplayStartTime(displayValue)
      } else if (field === 'end_time') {
        setDisplayEndTime(displayValue)
      }
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    // ตรวจสอบข้อมูลก่อนส่ง
    if (!formData.start_time || !formData.end_time || !formData.purpose) {
      setError('กรุณากรอกข้อมูลให้ครบถ้วน')
      setSubmitting(false)
      return
    }

    // ตรวจสอบว่าเวลาเริ่มต้นไม่เกินเวลาสิ้นสุด
    const startTime = new Date(formData.start_time)
    const endTime = new Date(formData.end_time)
    
    if (startTime >= endTime) {
      setError('เวลาเริ่มต้นต้องน้อยกว่าเวลาสิ้นสุด')
      setSubmitting(false)
      return
    }

    // ตรวจสอบว่าเวลาเริ่มต้นไม่เป็นอดีต
    const now = new Date()
    if (startTime <= now) {
      setError('เวลาเริ่มต้นต้องเป็นอนาคต')
      setSubmitting(false)
      return
    }

    try {
      console.log('Sending booking request:', {
        room_id: room.id,
        ...formData
      })

      const response = await fetch('http://127.0.0.1:8000/api/bookings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          room_id: room.id,
          ...formData
        })
      })

      console.log('Response status:', response.status)
      const data = await response.json()
      console.log('Response data:', data)

      if (data.success) {
        router.push('/my-bookings')
      } else {
        setError(data.message || 'เกิดข้อผิดพลาดในการจองห้อง')
      }
    } catch (error) {
      console.error('Booking error:', error)
      setError('เกิดข้อผิดพลาดในการจองห้อง')
    } finally {
      setSubmitting(false)
    }
  }


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">กำลังโหลด...</p>
        </div>
      </div>
    )
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">ไม่พบห้อง</h1>
          <p className="text-gray-600">ห้องที่คุณกำลังมองหาไม่มีอยู่</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">จองห้อง</h1>
          <p className="text-gray-600">กรอกข้อมูลการจองห้อง</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Room Info */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">ข้อมูลห้อง</h2>
            
            <div className="h-48 bg-gray-200 rounded-lg mb-4 flex items-center justify-center">
              {room.image ? (
                <img
                  src={`http://localhost:8000/storage/${room.image}`}
                  alt={room.name}
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <div className="text-gray-400 text-center">
                  <svg className="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <p>ไม่มีรูปภาพ</p>
                </div>
              )}
            </div>

            <h3 className="text-xl font-semibold text-gray-900 mb-2">{room.name}</h3>
            <p className="text-gray-600 mb-4">{room.description}</p>
            
            <div className="space-y-2">
              <div className="flex items-center">
                <svg className="w-4 h-4 text-gray-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-gray-600">{room.location}</span>
              </div>
              
              <div className="flex items-center">
                <svg className="w-4 h-4 text-gray-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
                <span className="text-gray-600">ความจุ {room.capacity} คน</span>
              </div>
              
              <div className="flex items-center">
                <svg className="w-4 h-4 text-gray-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
          </div>

          {/* Booking Form */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">ข้อมูลการจอง</h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="start_time" className="block text-sm font-medium text-gray-700 mb-2">
                  วันที่และเวลาเริ่มต้น
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="start_time"
                    name="start_time"
                    required
                    value={displayStartTime}
                    onChange={(e) => handleDisplayDateTimeChange('start_time', e.target.value)}
                    onBlur={(e) => {
                      // เมื่อผู้ใช้เสร็จสิ้นการพิมพ์ ให้ตรวจสอบและแปลงรูปแบบ
                      const value = e.target.value
                      if (value && value.match(/^\d{1,2}\/\d{1,2}\/\d{4} \d{1,2}:\d{2}$/)) {
                        const isoDateTime = convertDDMMYYYYToISOWithTime(value)
                        setFormData(prev => ({
                          ...prev,
                          start_time: isoDateTime
                        }))
                      }
                    }}
                    placeholder="DD/MM/YYYY HH:MM"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 pr-10"
                  />
                  <input
                    type="datetime-local"
                    ref={startTimeRef}
                    value={formData.start_time}
                    onChange={(e) => handleDateTimePickerChange('start_time', e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                    style={{ pointerEvents: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => startTimeRef.current.showPicker()}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-auto"
                  >
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="end_time" className="block text-sm font-medium text-gray-700 mb-2">
                  วันที่และเวลาสิ้นสุด
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="end_time"
                    name="end_time"
                    required
                    value={displayEndTime}
                    onChange={(e) => handleDisplayDateTimeChange('end_time', e.target.value)}
                    onBlur={(e) => {
                      // เมื่อผู้ใช้เสร็จสิ้นการพิมพ์ ให้ตรวจสอบและแปลงรูปแบบ
                      const value = e.target.value
                      if (value && value.match(/^\d{1,2}\/\d{1,2}\/\d{4} \d{1,2}:\d{2}$/)) {
                        const isoDateTime = convertDDMMYYYYToISOWithTime(value)
                        setFormData(prev => ({
                          ...prev,
                          end_time: isoDateTime
                        }))
                      }
                    }}
                    placeholder="DD/MM/YYYY HH:MM"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 pr-10"
                  />
                  <input
                    type="datetime-local"
                    ref={endTimeRef}
                    value={formData.end_time}
                    onChange={(e) => handleDateTimePickerChange('end_time', e.target.value)}
                    min={formData.start_time || new Date().toISOString().slice(0, 16)}
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                    style={{ pointerEvents: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => endTimeRef.current.showPicker()}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-auto"
                  >
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="purpose" className="block text-sm font-medium text-gray-700 mb-2">
                  วัตถุประสงค์
                </label>
                <input
                  type="text"
                  id="purpose"
                  name="purpose"
                  required
                  value={formData.purpose}
                  onChange={handleChange}
                  placeholder="เช่น การประชุม, การสัมมนา, การอบรม"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                  หมายเหตุ (ไม่บังคับ)
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="ข้อมูลเพิ่มเติมที่ต้องการแจ้ง"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>


              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submitting || !formData.start_time || !formData.end_time || !formData.purpose}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'กำลังจอง...' : 'ยืนยันการจอง'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
