'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useAuth } from './contexts/AuthContext'
import { API_URL } from './lib/api'
export default function Home() {
  const { user } = useAuth()
  const [stats, setStats] = useState({
    totalRooms: 0,
    totalUsers: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_URL}/api/stats`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        // เพิ่ม mode และ credentials สำหรับ CORS
        mode: 'cors',
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const contentType = response.headers.get('content-type')
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json()
        if (data.success && data.data) {
          setStats({
            totalRooms: data.data.total_rooms || 0,
            totalUsers: data.data.total_users || 0
          })
        } else {
          console.warn('Stats API returned unsuccessful response:', data)
        }
      } else {
        throw new Error('Response is not JSON')
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
      // ตั้งค่า default values เมื่อเกิด error
      setStats({
        totalRooms: 0,
        totalUsers: 0
      })
    } finally {
      setLoading(false)
    }
  }

  return (

    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div>
            <div className="mb-6">
              <span className="inline-block bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs md:text-sm font-semibold px-3 py-1.5 md:px-4 md:py-2 rounded-full mb-4 shadow-lg">
                🏢 อาคาร Sci 9
              </span>
            </div>
            <h1 className="text-3xl md:text-5xl font-bold mb-4 md:mb-6 leading-tight">
              <span className="text-gray-900">อาคาร Sci 9 ภาควิชาคอมพิวเตอร์</span><br />
              <span className="text-2xl md:text-4xl bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">คณะวิทยาศาสตร์และเทคโนโลยี</span><br />
              <span className="text-xl md:text-3xl text-purple-600">มหาวิทยาลัยราชภัฏเชียงใหม่</span>
            </h1>
            <p className="text-base md:text-lg text-gray-700 mb-6 md:mb-8 leading-relaxed">
              ระบบจองห้องออนไลน์ สำหรับนักศึกษาและอาจารย์ ภาควิชาคอมพิวเตอร์
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/rooms"
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-lg text-center font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                🏢 ดูห้องเรียนทั้งหมด
              </Link>
              {!user && (
                <Link
                  href="/login"
                  className="bg-white border-2 border-blue-200 text-blue-600 px-6 py-3 rounded-lg text-center font-semibold hover:bg-blue-50 hover:border-blue-300 transition-all duration-300 shadow-md hover:shadow-lg"
                >
                  🔐 เข้าสู่ระบบ
                </Link>
              )}
            </div>
          </div>

          {/* ส่วนรูปภาพของอาคารหน้า homepage */}
          <div className="flex justify-center w-full">
            <div className="bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 h-150 w-full rounded-2xl flex items-center justify-center shadow-2xl">
              <div className="text-center text-white w-full h-full">
                <img src="1728933072bgweb.webp" alt="Sci 9" className="w-full h-full object-cover rounded-2xl" />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Statistics Section - Redesigned */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 shadow-xl p-8 lg:p-12 text-white">
          {/* Decorative Background Elements */}
          <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl"></div>

          <div className="relative z-10">
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center p-3 bg-white/10 backdrop-blur-md rounded-2xl mb-6 shadow-lg ring-1 ring-white/20">
                <span className="text-3xl mr-2">📊</span>
                <h2 className="text-2xl font-bold text-white tracking-wide">สถิติการใช้งาน</h2>
              </div>
              <p className="text-blue-100 text-lg font-light">ข้อมูลการใช้งานระบบจองห้องภาควิชาคอมพิวเตอร์</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* Rooms Stat Card */}
              <div className="group bg-white/10 backdrop-blur-md border border-white/20 p-8 rounded-3xl hover:bg-white/20 transition-all duration-300 transform hover:-translate-y-2 shadow-lg">
                <div className="flex flex-col items-center text-center">
                  <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center text-4xl mb-6 shadow-inner ring-1 ring-white/10 group-hover:scale-110 transition-transform duration-300">
                    🏢
                  </div>
                  <div className="text-5xl font-bold text-white mb-2">
                    {loading ? (
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-white border-t-transparent"></div>
                    ) : (
                      stats.totalRooms
                    )}
                  </div>
                  <div className="text-xl text-blue-100 font-medium tracking-wide">ห้องทั้งหมด</div>
                </div>
              </div>

              {/* Users Stat Card */}
              <div className="group bg-white/10 backdrop-blur-md border border-white/20 p-8 rounded-3xl hover:bg-white/20 transition-all duration-300 transform hover:-translate-y-2 shadow-lg">
                <div className="flex flex-col items-center text-center">
                  <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center text-4xl mb-6 shadow-inner ring-1 ring-white/10 group-hover:scale-110 transition-transform duration-300">
                    👥
                  </div>
                  <div className="text-5xl font-bold text-white mb-2">
                    {loading ? (
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-white border-t-transparent"></div>
                    ) : (
                      stats.totalUsers
                    )}
                  </div>
                  <div className="text-xl text-blue-100 font-medium tracking-wide">ผู้ใช้งาน</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How to Use Section - Redesigned */}
      <div className="py-24 bg-[#FFFDF5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-flex items-center justify-center mb-4">
              <span className="text-4xl mr-3 transform -rotate-12">🚀</span>
              <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-red-500 to-pink-600 bg-clip-text text-transparent">
                วิธีการใช้งาน
              </h2>
            </div>
            <p className="text-gray-500 text-lg font-light">เพียง 3 ขั้นตอนง่ายๆ คุณก็สามารถจองห้องเรียนได้แล้ว</p>
          </div>

          <div className="grid md:grid-cols-3 gap-12 relative">
            {/* Connecting Line (Desktop) */}
            <div className="hidden md:block absolute top-[2.5rem] left-[16%] right-[16%] h-0.5 bg-gradient-to-r from-orange-200 via-pink-200 to-purple-200 -z-10"></div>

            {/* Step 1 */}
            <div className="text-center group relative">
              <div className="w-20 h-20 bg-gradient-to-r from-orange-400 to-red-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg shadow-orange-200 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 ring-4 ring-white">
                <span className="text-white text-3xl font-bold">1</span>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3 flex items-center justify-center gap-2">
                <span>📝</span> สมัครสมาชิก
              </h3>
              <p className="text-gray-500 font-light leading-relaxed">สมัครสมาชิกด้วยข้อมูลพื้นฐาน<br />เพื่อเริ่มต้นใช้งานระบบ</p>
            </div>

            {/* Step 2 */}
            <div className="text-center group relative">
              <div className="w-20 h-20 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg shadow-pink-200 group-hover:scale-110 group-hover:-rotate-3 transition-all duration-300 ring-4 ring-white">
                <span className="text-white text-3xl font-bold">2</span>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3 flex items-center justify-center gap-2">
                <span>🏢</span> เลือกห้องเรียน
              </h3>
              <p className="text-gray-500 font-light leading-relaxed">เลือกห้องเรียนที่ต้องการ<br />และตรวจสอบความพร้อมใช้งาน</p>
            </div>

            {/* Step 3 */}
            <div className="text-center group relative">
              <div className="w-20 h-20 bg-gradient-to-r from-violet-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg shadow-purple-200 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 ring-4 ring-white">
                <span className="text-white text-3xl font-bold">3</span>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3 flex items-center justify-center gap-2">
                <span>✅</span> ยืนยันการจอง
              </h3>
              <p className="text-gray-500 font-light leading-relaxed">ยืนยันการจองและรอ<br />อนุมัติจากผู้ดูแลระบบ</p>
            </div>
          </div>
        </div>
      </div>
    </div>

  )
}
