'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { API_URL } from '../lib/api'

export default function ProfilePage() {
  const { user, loading: authLoading, updateProfile } = useAuth()
  const router = useRouter()

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: ''
  })
  const [selectedFile, setSelectedFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!authLoading && user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        password: ''
      })
      if (user.profile_picture) {
        if (user.profile_picture.startsWith('http')) {
          setPreview(user.profile_picture)
        } else {
          setPreview(`${API_URL}/${user.profile_picture}`)
        }
      }
    }
  }, [user, authLoading])

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setSelectedFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    setError('')

    const profileData = {
      ...formData,
      profile_picture: selectedFile
    }

    const result = await updateProfile(profileData)

    if (result.success) {
      setMessage(result.message)
      setFormData(prev => ({ ...prev, password: '' }))
      setSelectedFile(null)
    } else {
      setError(result.message)
    }

    setLoading(false)
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    router.push('/login')
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">โปรไฟล์และสถิติ</h1>
          <p className="mt-2 text-sm text-gray-500">
            ดูภาพรวมการใช้งานและจัดการข้อมูลส่วนตัวของคุณ
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Profile Card */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden p-6 text-center">
              <div className="relative inline-block group mb-4">
                <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-100 border-4 border-white shadow-lg ring-1 ring-gray-100 mx-auto">
                  {preview ? (
                    <img src={preview} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                      <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                  )}
                </div>
                <label className="absolute bottom-1 right-1 bg-blue-600 p-2 rounded-full text-white shadow-lg cursor-pointer hover:bg-blue-700 transition-colors transform hover:scale-105">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                </label>
              </div>

              <h2 className="text-xl font-bold text-gray-900">{user.name}</h2>
              <p className="text-sm text-gray-500 mb-4">{user.email}</p>

              <div className="flex justify-center gap-2 mb-6">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${user.role === 'admin'
                  ? 'bg-purple-100 text-purple-700 border-purple-200'
                  : 'bg-blue-100 text-blue-700 border-blue-200'
                  }`}>
                  {user.role === 'admin' ? 'ADMINISTRATOR' : 'GENERAL USER'}
                </span>
              </div>

              <div className="border-t border-gray-100 pt-4 text-left space-y-3">
                <div>
                  <p className="text-xs text-gray-400 uppercase font-semibold">สมาชิกเมื่อ</p>
                  <p className="text-sm font-medium text-gray-700">{formatDate(user.created_at)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase font-semibold">ใช้งานล่าสุด</p>
                  <p className="text-sm font-medium text-gray-700">{formatDate(user.last_login_at)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase font-semibold">เบอร์โทรศัพท์</p>
                  <p className="text-sm font-medium text-gray-700">{user.phone || '-'}</p>
                </div>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-white rounded-2xl shadow-sm border border-red-100 overflow-hidden p-6">
              <h3 className="text-base font-bold text-red-600 mb-2">พื้นที่อันตราย</h3>
              <p className="text-xs text-gray-500 mb-4">การลบบัญชีจะไม่สามารถกู้คืนได้ และข้อมูลการจองทั้งหมดจะถูกยกเลิก</p>
              <button disabled className="w-full py-2 bg-red-50 text-red-600 rounded-lg text-sm font-bold border border-red-200 hover:bg-red-100 transition-colors opacity-50 cursor-not-allowed">
                ขอร้องเรียนลบบัญชี (ติดต่อ Admin)
              </button>
            </div>
          </div>

          {/* Right Column: Edit Form */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden p-8">
              <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 text-sm">✏️</span>
                แก้ไขข้อมูลส่วนตัว
              </h3>

              {message && (
                <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl flex items-center gap-2 animate-fade-in-down">
                  <span className="text-xl">✅</span>
                  {message}
                </div>
              )}

              {error && (
                <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2 animate-fade-in-down">
                  <span className="text-xl">❌</span>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-gray-700">ชื่อ - นามสกุล</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-gray-700">อีเมล</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-gray-700">เบอร์โทรศัพท์</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="0xx-xxx-xxxx"
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                    🔒 ความปลอดภัย
                  </h4>
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-gray-700">รหัสผ่านใหม่</label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="ตั้งรหัสผ่านใหม่ (อย่างน้อย 8 ตัวอักษร)"
                      minLength="8"
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none"
                    />
                    <p className="text-xs text-gray-400 mt-1">* เว้นว่างไว้หากไม่ต้องการเปลี่ยน</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-900/20 transition-all hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {loading ? 'กำลังบันทึก...' :
                      <>
                        <span>💾</span> บันทึกข้อมูล
                      </>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
