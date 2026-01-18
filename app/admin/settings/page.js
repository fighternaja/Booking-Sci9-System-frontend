'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'

export default function SettingsPage() {
  const [settings, setSettings] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('general')
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const { token, logout } = useAuth()
  const router = useRouter()

  const tabs = [
    { id: 'general', label: 'ทั่วไป', icon: '⚙️' },
    { id: 'booking', label: 'การจอง', icon: '📅' },
    { id: 'notification', label: 'การแจ้งเตือน', icon: '🔔' },
    { id: 'system', label: 'ระบบ', icon: '🖥️' }
  ]

  useEffect(() => {
    if (!token) {
      router.push('/login')
      return
    }
    fetchSettings()
  }, [token, activeTab])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const response = await fetch(`http://127.0.0.1:8000/api/admin/settings?group=${activeTab}`, {
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
        throw new Error('Failed to fetch settings')
      }

      const data = await response.json()
      if (data.success) {
        // Convert array to object
        const settingsObj = {}
        if (Array.isArray(data.data)) {
          data.data.forEach(setting => {
            settingsObj[setting.key] = setting
          })
        }
        setSettings(settingsObj)
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
      setError('ไม่สามารถโหลดข้อมูลได้')
    } finally {
      setLoading(false)
    }
  }

  const updateSetting = async (key, value, type = 'string') => {
    try {
      setSaving(true)
      setError(null)
      
      const response = await fetch(`http://127.0.0.1:8000/api/admin/settings/${key}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ value, type })
      })

      if (!response.ok) {
        if (response.status === 401) {
          logout()
          router.push('/login')
          return
        }
        throw new Error('Failed to update setting')
      }

      const data = await response.json()
      if (data.success) {
        setSettings(prev => ({
          ...prev,
          [key]: data.data
        }))
        setSuccess('บันทึกการตั้งค่าสำเร็จ')
        setTimeout(() => setSuccess(null), 3000)
      }
    } catch (error) {
      console.error('Error updating setting:', error)
      setError('ไม่สามารถบันทึกการตั้งค่าได้')
    } finally {
      setSaving(false)
    }
  }

  const getDefaultSettings = () => {
    const defaults = {
      general: [
        { key: 'site_name', label: 'ชื่อเว็บไซต์', type: 'string', value: 'ระบบจองห้อง', group: 'general' },
        { key: 'site_description', label: 'คำอธิบายเว็บไซต์', type: 'string', value: '', group: 'general' },
        { key: 'maintenance_mode', label: 'โหมดบำรุงรักษา', type: 'boolean', value: false, group: 'general' },
      ],
      booking: [
        { key: 'booking_advance_days', label: 'จองล่วงหน้าได้ (วัน)', type: 'integer', value: 30, group: 'booking' },
        { key: 'booking_min_duration', label: 'ระยะเวลาขั้นต่ำ (นาที)', type: 'integer', value: 30, group: 'booking' },
        { key: 'booking_max_duration', label: 'ระยะเวลาสูงสุด (ชั่วโมง)', type: 'integer', value: 8, group: 'booking' },
        { key: 'booking_start_time', label: 'เวลาเริ่มต้นที่จองได้', type: 'string', value: '08:00', group: 'booking' },
        { key: 'booking_end_time', label: 'เวลาสิ้นสุดที่จองได้', type: 'string', value: '18:00', group: 'booking' },
        { key: 'auto_approve_admin', label: 'อนุมัติอัตโนมัติสำหรับ Admin', type: 'boolean', value: true, group: 'booking' },
      ],
      notification: [
        { 
          key: 'email_notifications_enabled', 
          label: 'เปิดใช้งาน Email Notifications', 
          type: 'boolean', 
          value: false, 
          group: 'notification',
          description: 'เปิดใช้งานการส่งอีเมลแจ้งเตือนเมื่อมีการเปลี่ยนแปลงสถานะการจอง (สร้าง, อนุมัติ, ปฏิเสธ, ยกเลิก)',
          icon: '📧'
        },
        { 
          key: 'reminder_before_hours', 
          label: 'เตือนก่อนเริ่ม (ชั่วโมง)', 
          type: 'integer', 
          value: 1, 
          group: 'notification',
          description: 'จำนวนชั่วโมงที่ต้องการให้ระบบส่งอีเมลเตือนก่อนการจองเริ่มต้น (แนะนำ: 1-24 ชั่วโมง)',
          icon: '⏰',
          min: 1,
          max: 24
        },
        { 
          key: 'notification_on_approval', 
          label: 'แจ้งเตือนเมื่ออนุมัติ', 
          type: 'boolean', 
          value: true, 
          group: 'notification',
          description: 'ส่งอีเมลแจ้งเตือนให้ผู้ใช้เมื่อการจองถูกอนุมัติ',
          icon: '✅'
        },
        { 
          key: 'notification_on_rejection', 
          label: 'แจ้งเตือนเมื่อปฏิเสธ', 
          type: 'boolean', 
          value: true, 
          group: 'notification',
          description: 'ส่งอีเมลแจ้งเตือนให้ผู้ใช้เมื่อการจองถูกปฏิเสธ',
          icon: '❌'
        },
      ],
      system: [
        { key: 'max_bookings_per_user', label: 'จำนวนการจองสูงสุดต่อผู้ใช้ (ต่อสัปดาห์)', type: 'integer', value: 10, group: 'system' },
        { key: 'session_timeout', label: 'หมดเวลาสำหรับ Session (นาที)', type: 'integer', value: 120, group: 'system' },
        { key: 'enable_audit_log', label: 'เปิดใช้งาน Audit Log', type: 'boolean', value: true, group: 'system' },
      ]
    }
    return defaults[activeTab] || []
  }

  const renderSettingInput = (setting) => {
    const currentSetting = settings[setting.key] || setting

    if (setting.type === 'boolean') {
      return (
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={currentSetting.value === true || currentSetting.value === 'true' || currentSetting.value === 1}
            onChange={(e) => updateSetting(setting.key, e.target.checked, 'boolean')}
            className="sr-only peer"
            disabled={saving}
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      )
    }

    if (setting.type === 'integer') {
      return (
        <div className="relative">
          <input
            type="number"
            value={currentSetting.value || setting.value || ''}
            onChange={(e) => updateSetting(setting.key, parseInt(e.target.value) || 0, 'integer')}
            min={setting.min}
            max={setting.max}
            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={saving}
          />
          {setting.min !== undefined && setting.max !== undefined && (
            <p className="text-xs text-gray-400 mt-1">ช่วงที่แนะนำ: {setting.min} - {setting.max}</p>
          )}
        </div>
      )
    }

    return (
      <input
        type="text"
        value={currentSetting.value || setting.value || ''}
        onChange={(e) => updateSetting(setting.key, e.target.value, 'string')}
        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        disabled={saving}
      />
    )
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                การตั้งค่าระบบ
              </h1>
              <p className="text-gray-600 text-lg">จัดการการตั้งค่าระบบทั้งหมด</p>
            </div>
            <Link
              href="/admin"
              className="px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
            >
              ← กลับไป Dashboard
            </Link>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-xl shadow-md border-2 border-gray-200 p-2 mb-6">
            <div className="flex space-x-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 py-3 px-4 rounded-lg font-semibold text-sm transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg transform scale-105'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Messages */}
          {error && (
            <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-xl p-4">
              <p className="text-red-800 font-semibold">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 bg-green-50 border-2 border-green-200 rounded-xl p-4">
              <p className="text-green-800 font-semibold">{success}</p>
            </div>
          )}

          {/* Settings Form */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="space-y-6">
              {getDefaultSettings().map((setting) => (
                <div key={setting.key} className="border-b border-gray-200 pb-6 last:border-b-0">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {setting.icon && <span className="text-2xl">{setting.icon}</span>}
                        <label className="text-lg font-semibold text-gray-900">
                          {setting.label}
                        </label>
                      </div>
                      {setting.description && (
                        <p className="text-sm text-gray-500 mb-3 ml-8">{setting.description}</p>
                      )}
                    </div>
                    {saving && (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 ml-4"></div>
                    )}
                  </div>
                  <div className="mt-2 ml-8">
                    {renderSettingInput(setting)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

