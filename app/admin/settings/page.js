'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import Swal from 'sweetalert2'

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState({
    max_hours_per_booking: 4,
    min_hours_per_booking: 1,
    allowed_time_start: '08:00',
    allowed_time_end: '18:30',
    max_bookings_per_day: 3,
    max_bookings_per_week: 10,
    max_advance_days: 30,
    min_advance_hours: 1,
    allowed_weekdays: [1, 2, 3, 4, 5],
    require_approval: true
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { token, logout } = useAuth()
  const router = useRouter()

  const weekdays = [
    { value: 0, label: 'อาทิตย์' },
    { value: 1, label: 'จันทร์' },
    { value: 2, label: 'อังคาร' },
    { value: 3, label: 'พุธ' },
    { value: 4, label: 'พฤหัสบดี' },
    { value: 5, label: 'ศุกร์' },
    { value: 6, label: 'เสาร์' }
  ]

  useEffect(() => {
    if (!token) {
      router.push('/login')
      return
    }
    fetchSettings()
  }, [token])

  const fetchSettings = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/admin/settings/booking-restrictions', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      })

      if (!response.ok) {
        if (response.status === 401) {
          logout()
          router.push('/login')
          return
        }

        // Use default values if API fails
        console.warn('Using default settings due to API error')
        setLoading(false)
        return
      }

      const data = await response.json()
      if (data.success && data.data) {
        setSettings(data.data)
      }
    } catch (error) {
      // Use default values on error
      console.warn('Settings API unavailable, using defaults')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const toggleWeekday = (day) => {
    setSettings(prev => ({
      ...prev,
      allowed_weekdays: prev.allowed_weekdays.includes(day)
        ? prev.allowed_weekdays.filter(d => d !== day)
        : [...prev.allowed_weekdays, day].sort()
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch('http://127.0.0.1:8000/api/admin/settings/booking-restrictions', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(settings)
      })

      const data = await response.json()

      if (data.success) {
        Swal.fire({
          icon: 'success',
          title: 'สำเร็จ',
          text: 'บันทึกการตั้งค่าเรียบร้อย',
          timer: 1500,
          showConfirmButton: false
        })
      } else {
        Swal.fire('ข้อผิดพลาด', data.message || 'ไม่สามารถบันทึกได้', 'error')
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      Swal.fire('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการบันทึก', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    const result = await Swal.fire({
      title: 'ยืนยันการรีเซ็ต?',
      text: 'การตั้งค่าทั้งหมดจะกลับเป็นค่าเริ่มต้น',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#3b82f6',
      confirmButtonText: 'รีเซ็ต',
      cancelButtonText: 'ยกเลิก'
    })

    if (!result.isConfirmed) return

    try {
      const response = await fetch('http://127.0.0.1:8000/api/admin/settings/booking-restrictions/reset', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      })

      const data = await response.json()

      if (data.success) {
        setSettings(data.data)
        Swal.fire('สำเร็จ', 'รีเซ็ตการตั้งค่าเรียบร้อย', 'success')
      }
    } catch (error) {
      console.error('Error resetting settings:', error)
      Swal.fire('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการรีเซ็ต', 'error')
    }
  }

  if (loading) {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white p-6 rounded-2xl h-32"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">⚙️ ตั้งค่าระบบ</h1>
        <p className="text-gray-600">จัดการข้อจำกัดและกฎเกณฑ์การจองห้อง</p>
      </div>

      <div className="space-y-6">
        {/* เวลาการจอง */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            ⏱️ เวลาการจอง
          </h2>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">จำนวนชั่วโมงขั้นต่ำ</label>
              <input
                type="number"
                min="1"
                max="24"
                value={settings.min_hours_per_booking}
                onChange={(e) => handleChange('min_hours_per_booking', parseInt(e.target.value))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">จำนวนชั่วโมงสูงสุด</label>
              <input
                type="number"
                min="1"
                max="24"
                value={settings.max_hours_per_booking}
                onChange={(e) => handleChange('max_hours_per_booking', parseInt(e.target.value))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">เวลาเริ่มต้นที่อนุญาต</label>
              <input
                type="time"
                value={settings.allowed_time_start}
                onChange={(e) => handleChange('allowed_time_start', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">เวลาสิ้นสุดที่อนุญาต</label>
              <input
                type="time"
                value={settings.allowed_time_end}
                onChange={(e) => handleChange('allowed_time_end', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* จำนวนการจอง */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            📊 จำนวนการจอง
          </h2>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">สูงสุดต่อวัน</label>
              <input
                type="number"
                min="1"
                value={settings.max_bookings_per_day}
                onChange={(e) => handleChange('max_bookings_per_day', parseInt(e.target.value))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">สูงสุดต่อสัปดาห์</label>
              <input
                type="number"
                min="1"
                value={settings.max_bookings_per_week}
                onChange={(e) => handleChange('max_bookings_per_week', parseInt(e.target.value))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
        </div>

        {/* การจองล่วงหน้า */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            📅 การจองล่วงหน้า
          </h2>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">จองล่วงหน้าได้สูงสุด (วัน)</label>
              <input
                type="number"
                min="1"
                value={settings.max_advance_days}
                onChange={(e) => handleChange('max_advance_days', parseInt(e.target.value))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">ต้องจองล่วงหน้าอย่างน้อย (ชั่วโมง)</label>
              <input
                type="number"
                min="0"
                value={settings.min_advance_hours}
                onChange={(e) => handleChange('min_advance_hours', parseInt(e.target.value))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
        </div>

        {/* วันที่อนุญาต */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            📆 วันที่อนุญาตให้จอง
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {weekdays.map((day) => (
              <label
                key={day.value}
                className={`flex items-center p-3 rounded-xl border-2 cursor-pointer transition-all ${settings.allowed_weekdays.includes(day.value)
                  ? 'bg-orange-50 border-orange-500 text-orange-900'
                  : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
              >
                <input
                  type="checkbox"
                  checked={settings.allowed_weekdays.includes(day.value)}
                  onChange={() => toggleWeekday(day.value)}
                  className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500 mr-2"
                />
                <span className="font-medium">{day.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* การอนุมัติ */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            ✅ การอนุมัติ
          </h2>

          <label className="flex items-center p-4 bg-indigo-50 rounded-xl border-2 border-indigo-200 cursor-pointer hover:bg-indigo-100 transition-colors">
            <input
              type="checkbox"
              checked={settings.require_approval}
              onChange={(e) => handleChange('require_approval', e.target.checked)}
              className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 mr-3"
            />
            <div>
              <span className="font-semibold text-indigo-900 block">ต้องการการอนุมัติจาก Admin</span>
              <span className="text-sm text-indigo-700">การจองทั้งหมดต้องได้รับการอนุมัติก่อนจึงจะใช้งานได้</span>
            </div>
          </label>
        </div>

        {/* ปุ่ม */}
        <div className="flex gap-4">
          <button
            onClick={handleReset}
            className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            รีเซ็ตค่าเริ่มต้น
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                กำลังบันทึก...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                บันทึกการตั้งค่า
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
