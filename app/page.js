'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useAuth } from './contexts/AuthContext'
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
      const response = await fetch('http://127.0.0.1:8000/api/stats', {
        headers: {
          'Accept': 'application/json',
        }
      })
      
      if (response.ok) {
        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json()
          if (data.success) {
            setStats({
              totalRooms: data.data.total_rooms,
              totalUsers: data.data.total_users
            })
          }
        }
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
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
                <span className="inline-block bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm font-semibold px-4 py-2 rounded-full mb-4 shadow-lg">
                  🏢 อาคาร Sci 9
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
                <span className="text-gray-900">อาคาร Sci 9 ภาควิชาคอมพิวเตอร์</span><br />
                <span className="text-3xl md:text-4xl bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">คณะวิทยาศาสตร์และเทคโนโลยี</span><br />
                <span className="text-2xl md:text-3xl text-purple-600">มหาวิทยาลัยราชภัฏเชียงใหม่</span>
              </h1>
              <p className="text-lg text-gray-700 mb-8 leading-relaxed">
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

        {/* ในส่วนของสถิติการใช้งาน */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white mb-4">📊 สถิติการใช้งาน</h2>
              <p className="text-blue-100 text-lg">ข้อมูลการใช้งานระบบจองห้อง</p>
            </div>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 text-center border border-white/20 hover:bg-white/20 transition-all duration-300 shadow-lg">
                <div className="text-5xl mb-4">🏢</div>
                <div className="text-4xl font-bold text-white mb-2">
                  {loading ? (
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                  ) : (
                    stats.totalRooms
                  )}
                </div>
                <div className="text-xl text-blue-100 font-medium">ห้องเรียนทั้งหมด</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 text-center border border-white/20 hover:bg-white/20 transition-all duration-300 shadow-lg">
                <div className="text-5xl mb-4">👥</div>
                <div className="text-4xl font-bold text-white mb-2">
                  {loading ? (
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                  ) : (
                    stats.totalUsers
                  )}
                </div>
                <div className="text-xl text-blue-100 font-medium">ผู้ใช้งาน</div>
              </div>
            </div>
          </div>
        </div>

        {/* How to Use Section */}
        <div className="py-20 bg-gradient-to-br from-orange-50 via-yellow-50 to-pink-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-pink-600 bg-clip-text text-transparent mb-4">
                🚀 วิธีการใช้งาน
              </h2>
              <p className="text-lg text-gray-600">เพียง 3 ขั้นตอนง่ายๆ คุณก็สามารถจองห้องเรียนได้แล้ว</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center group">
                <div className="w-20 h-20 bg-gradient-to-r from-orange-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <span className="text-white text-2xl font-bold">1</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">📝 สมัครสมาชิก</h3>
                <p className="text-gray-600">สมัครสมาชิกด้วยข้อมูลพื้นฐาน</p>
              </div>

              <div className="text-center group">
                <div className="w-20 h-20 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <span className="text-white text-2xl font-bold">2</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">🏢 เลือกห้องเรียน</h3>
                <p className="text-gray-600">เลือกห้องเรียนที่ต้องการและตรวจสอบความพร้อมใช้งาน</p>
              </div>

              <div className="text-center group">
                <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <span className="text-white text-2xl font-bold">3</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">✅ ยืนยันการจอง</h3>
                <p className="text-gray-600">ยืนยันการจองและรออนุมัติจากผู้ดูแลระบบ</p>
              </div>
            </div>
          </div>
        </div>
      </div>

  )
}
