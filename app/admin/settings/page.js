'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import Swal from 'sweetalert2'
import { API_URL } from '../../lib/api'

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState({
    // Time & Duration
    max_hours_per_booking: 4,
    min_hours_per_booking: 1,
    allowed_time_start: '08:00',
    allowed_time_end: '18:30',

    // Limits
    max_bookings_per_day: 3,
    max_bookings_per_week: 10,
    max_advance_days: 30,
    min_advance_hours: 1,

    // Restrictions
    allowed_weekdays: [1, 2, 3, 4, 5],
    booking_holidays: [], // Array of date strings 'YYYY-MM-DD'
    booking_allowed_roles: ['admin', 'user'],

    // Approval
    require_approval: true
  })

  const [newHoliday, setNewHoliday] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('general') // general, restrictions, roles

  const { token, logout, loading: authLoading } = useAuth()
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
    if (authLoading) return
    if (!token) {
      router.push('/login')
      return
    }
    fetchSettings()
  }, [token, authLoading])

  const fetchSettings = async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/settings/booking-restrictions`, {
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
        console.warn('Using default settings due to API error')
        setLoading(false)
        return
      }

      const data = await response.json()
      if (data.success && data.data) {
        // Ensure arrays exist
        setSettings({
          ...data.data,
          booking_holidays: Array.isArray(data.data.booking_holidays) ? data.data.booking_holidays : [],
          booking_allowed_roles: Array.isArray(data.data.booking_allowed_roles) ? data.data.booking_allowed_roles : ['admin', 'user'],
          allowed_weekdays: Array.isArray(data.data.allowed_weekdays) ? data.data.allowed_weekdays : [1, 2, 3, 4, 5]
        })
      }
    } catch (error) {
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

  const toggleRole = (role) => {
    setSettings(prev => ({
      ...prev,
      booking_allowed_roles: prev.booking_allowed_roles.includes(role)
        ? prev.booking_allowed_roles.filter(r => r !== role)
        : [...prev.booking_allowed_roles, role]
    }))
  }

  const addHoliday = () => {
    if (!newHoliday) return
    if (settings.booking_holidays.includes(newHoliday)) {
      Swal.fire('แจ้งเตือน', 'วันที่นี้มีอยู่ในรายการแล้ว', 'warning')
      return
    }
    setSettings(prev => ({
      ...prev,
      booking_holidays: [...prev.booking_holidays, newHoliday].sort()
    }))
    setNewHoliday('')
  }

  const removeHoliday = (dateToRemove) => {
    setSettings(prev => ({
      ...prev,
      booking_holidays: prev.booking_holidays.filter(date => date !== dateToRemove)
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch(`${API_URL}/api/admin/settings/booking-restrictions`, {
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
      const response = await fetch(`${API_URL}/api/admin/settings/booking-restrictions/reset`, {
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

  if (loading || authLoading) {
    return (
      <div className="min-h-screen p-8 bg-gray-50/50">
        <div className="animate-pulse space-y-8 max-w-6xl mx-auto">
          <div className="h-10 bg-gray-200 rounded w-1/4"></div>
          <div className="h-12 bg-gray-200 rounded w-full"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white p-6 rounded-2xl h-64"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8 bg-gray-50/50">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gray-900 via-blue-800 to-gray-900 mb-2">
              ตั้งค่าระบบ
            </h1>
            <p className="text-gray-500 font-medium">จัดการข้อจำกัด กฎการจอง และสิทธิ์การใช้งาน</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className="px-6 py-2.5 border border-gray-200 text-gray-600 rounded-xl font-semibold hover:bg-gray-50 hover:text-red-600 hover:border-red-200 transition-all duration-300 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              รีเซ็ต
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-8 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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

        {/* Tab Navigation */}
        <div className="flex p-1 bg-white/80 backdrop-blur-xl rounded-2xl shadow-sm border border-gray-200/50 w-full md:w-fit">
          {[
            { id: 'general', label: 'ทั่วไป', icon: '⚙️' },
            { id: 'restrictions', label: 'ข้อจำกัด & วันหยุด', icon: '📅' },
            { id: 'roles', label: 'บทบาท & สิทธิ์', icon: '👥' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 ${activeTab === tab.id
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-50'
                }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

          {/* GENERAL TAB */}
          {activeTab === 'general' && (
            <>
              {/* Approval */}
              <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-sm border border-gray-100 md:col-span-2 group hover:shadow-md transition-all duration-300">
                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-xl">✅</span>
                  การอนุมัติการจอง
                </h2>

                <label className="flex items-start p-5 bg-gradient-to-br from-indigo-50/50 to-white rounded-2xl border-2 border-indigo-100 cursor-pointer hover:border-indigo-200 transition-all duration-300">
                  <input
                    type="checkbox"
                    checked={settings.require_approval}
                    onChange={(e) => handleChange('require_approval', e.target.checked)}
                    className="w-6 h-6 text-indigo-600 rounded-lg focus:ring-indigo-500 mt-0.5 border-gray-300"
                  />
                  <div className="ml-4">
                    <span className="font-bold text-gray-900 block text-lg mb-1">ต้องการการอนุมัติจาก Admin</span>
                    <span className="text-gray-500 font-medium">หากเปิดใช้งาน การจองทั้งหมดจะต้องรอการอนุมัติจากผู้ดูแลระบบก่อนถึงจะสมบูรณ์ หากปิดจะเป็นการอนุมัติอัตโนมัติ</span>
                  </div>
                </label>
              </div>

              {/* Booking Time */}
              <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-sm border border-gray-100 group hover:shadow-md transition-all duration-300">
                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-xl">⏱️</span>
                  ช่วงเวลาการจอง
                </h2>

                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-2">เวลาเริ่ม</label>
                      <input
                        type="time"
                        value={settings.allowed_time_start}
                        onChange={(e) => handleChange('allowed_time_start', e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-2">เวลาสิ้นสุด</label>
                      <input
                        type="time"
                        value={settings.allowed_time_end}
                        onChange={(e) => handleChange('allowed_time_end', e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-semibold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-2">ขั้นต่ำ (ชม.)</label>
                      <input
                        type="number"
                        min="1"
                        max="24"
                        value={settings.min_hours_per_booking}
                        onChange={(e) => handleChange('min_hours_per_booking', parseInt(e.target.value))}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-2">สูงสุด (ชม.)</label>
                      <input
                        type="number"
                        min="1"
                        max="24"
                        value={settings.max_hours_per_booking}
                        onChange={(e) => handleChange('max_hours_per_booking', parseInt(e.target.value))}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-semibold"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Booking Limits */}
              <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-sm border border-gray-100 group hover:shadow-md transition-all duration-300">
                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center text-xl">📊</span>
                  ขีดจำกัดการจอง
                </h2>

                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-2">สูงสุด/วัน</label>
                      <input
                        type="number"
                        min="1"
                        value={settings.max_bookings_per_day}
                        onChange={(e) => handleChange('max_bookings_per_day', parseInt(e.target.value))}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 transition-all font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-2">สูงสุด/สัปดาห์</label>
                      <input
                        type="number"
                        min="1"
                        value={settings.max_bookings_per_week}
                        onChange={(e) => handleChange('max_bookings_per_week', parseInt(e.target.value))}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 transition-all font-semibold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">จองล่วงหน้าได้สูงสุด (วัน)</label>
                    <input
                      type="number"
                      min="1"
                      value={settings.max_advance_days}
                      onChange={(e) => handleChange('max_advance_days', parseInt(e.target.value))}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 transition-all font-semibold w-full"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* RESTRICTIONS TAB */}
          {activeTab === 'restrictions' && (
            <>
              {/* Allowed Days */}
              <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-sm border border-gray-100 md:col-span-2 group hover:shadow-md transition-all duration-300">
                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-xl">📆</span>
                  วันที่อนุญาตให้จอง
                </h2>

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                  {weekdays.map((day) => (
                    <label
                      key={day.value}
                      className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${settings.allowed_weekdays.includes(day.value)
                        ? 'bg-orange-50 border-orange-500 text-orange-700 shadow-sm transform scale-105'
                        : 'bg-white border-gray-100 text-gray-400 hover:border-gray-300 opacity-70 hover:opacity-100'
                        }`}
                    >
                      <input
                        type="checkbox"
                        checked={settings.allowed_weekdays.includes(day.value)}
                        onChange={() => toggleWeekday(day.value)}
                        className="sr-only"
                      />
                      <span className="font-bold text-sm">{day.label}</span>
                      <span className="text-xs mt-1">
                        {settings.allowed_weekdays.includes(day.value) ? 'เปิด' : 'ปิด'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Blackout Dates */}
              <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-sm border border-gray-100 md:col-span-2 group hover:shadow-md transition-all duration-300">
                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-xl">⛔</span>
                  วันหยุด / วันงดจอง (Blackout Dates)
                </h2>

                <div className="flex gap-4 mb-6">
                  <input
                    type="date"
                    value={newHoliday}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setNewHoliday(e.target.value)}
                    className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 transition-all font-semibold"
                  />
                  <button
                    onClick={addHoliday}
                    className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 shadow-md hover:shadow-lg transition-all"
                  >
                    เพิ่มวันหยุด
                  </button>
                </div>

                {settings.booking_holidays.length > 0 ? (
                  <div className="flex flex-wrap gap-3">
                    {settings.booking_holidays.map((date) => (
                      <div key={date} className="flex items-center gap-2 pl-4 pr-2 py-2 bg-red-50 text-red-700 rounded-full border border-red-100 font-medium">
                        {new Date(date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
                        <button
                          onClick={() => removeHoliday(date)}
                          className="w-6 h-6 rounded-full bg-white text-red-500 hover:bg-red-100 flex items-center justify-center transition-colors"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-center py-8">ไม่มีวันหยุดที่กำหนด</p>
                )}
              </div>
            </>
          )}

          {/* ROLES TAB */}
          {activeTab === 'roles' && (
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-sm border border-gray-100 md:col-span-2 group hover:shadow-md transition-all duration-300">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-xl">👥</span>
                สิทธิ์การจองตามบทบาท
              </h2>

              <div className="grid md:grid-cols-2 gap-8">
                {/* Admin Role */}
                <div className="p-6 rounded-2xl bg-purple-50 border-2 border-purple-100">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-purple-200 flex items-center justify-center text-2xl">🛡️</div>
                      <div>
                        <h3 className="font-bold text-lg text-purple-900">ผู้ดูแลระบบ (Admin)</h3>
                        <p className="text-sm text-purple-700">สิทธิ์สูงสุดในการจัดการ</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.booking_allowed_roles.includes('admin')}
                        onChange={() => toggleRole('admin')}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>
                  <ul className="text-sm text-purple-800 space-y-2 opacity-80">
                    <li className="flex items-center gap-2">✓ จองห้องได้ทุกประเภท</li>
                    <li className="flex items-center gap-2">✓ ไม่จำกัดจำนวนครั้ง</li>
                    <li className="flex items-center gap-2">✓ จองได้ไม่จำกัดล่วงหน้า</li>
                  </ul>
                </div>

                {/* User Role */}
                <div className="p-6 rounded-2xl bg-gray-50 border-2 border-gray-100">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-2xl">👤</div>
                      <div>
                        <h3 className="font-bold text-lg text-gray-900">ผู้ใช้ทั่วไป (User)</h3>
                        <p className="text-sm text-gray-500">นักศึกษาและบุคลากรทั่วไป</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.booking_allowed_roles.includes('user')}
                        onChange={() => toggleRole('user')}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  <ul className="text-sm text-gray-600 space-y-2 mb-4">
                    <li className="flex items-center gap-2">ℹ️ บังคับใช้วันที่อนุญาต</li>
                    <li className="flex items-center gap-2">ℹ️ จำกัดจำนวนครั้งตามการตั้งค่า</li>
                    <li className="flex items-center gap-2">ℹ️ บังคับใช้ Blackout Dates</li>
                  </ul>
                  <div className="p-3 bg-yellow-50 text-yellow-800 text-xs rounded-lg border border-yellow-200">
                    <strong>หมายเหตุ:</strong> การจำกัดจำนวนครั้ง (วัน/สัปดาห์) จะถูกใช้กับผู้ใช้ทั่วไปทุกคน
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
