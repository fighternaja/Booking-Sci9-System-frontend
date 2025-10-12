'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { formatDateTimeToThai } from '../utils/dateUtils'

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const { user, token } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }
    fetchBookings()
  }, [user, router])

  const fetchBookings = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/bookings', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      const data = await response.json()
      
      if (data.success) {
        setBookings(data.data)
      }
    } catch (error) {
      console.error('Error fetching bookings:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800'
    }
    return badges[status] || 'bg-gray-100 text-gray-800'
  }

  const getStatusText = (status) => {
    const texts = {
      pending: 'รออนุมัติ',
      approved: 'อนุมัติแล้ว',
      rejected: 'ปฏิเสธ',
      cancelled: 'ยกเลิก'
    }
    return texts[status] || status
  }

  const filteredBookings = bookings.filter(booking => {
    if (filter === 'all') return true
    if (filter === 'upcoming') return booking.status === 'approved' && new Date(booking.start_time) > new Date()
    if (filter === 'pending') return booking.status === 'pending'
    if (filter === 'history') return booking.status === 'approved' && new Date(booking.start_time) < new Date()
    return true
  })

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
          <h1 className="text-3xl font-bold text-gray-900 mb-4">การจองของฉัน</h1>
          <p className="text-gray-600">จัดการการจองห้องของคุณ</p>
        </div>

        {/* Filter Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { key: 'all', label: 'ทั้งหมด' },
                { key: 'upcoming', label: 'การจองที่จะมาถึง' },
                { key: 'pending', label: 'รออนุมัติ' },
                { key: 'history', label: 'ประวัติการจอง' }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    filter === tab.key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Bookings List */}
        <div className="space-y-6">
          {filteredBookings.map((booking) => (
            <div key={booking.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">{booking.room.name}</h3>
                  <p className="text-gray-600">{booking.room.location}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(booking.status)}`}>
                  {getStatusText(booking.status)}
                </span>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-500">วันที่เริ่มต้น</p>
                  <p className="font-medium">
                    {formatDateTimeToThai(booking.start_time)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">วันที่สิ้นสุด</p>
                  <p className="font-medium">
                    {formatDateTimeToThai(booking.end_time)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">วัตถุประสงค์</p>
                  <p className="font-medium">{booking.purpose}</p>
                </div>
                <div>
                </div>
              </div>

              {booking.notes && (
                <div className="mb-4">
                  <p className="text-sm text-gray-500">หมายเหตุ</p>
                  <p className="text-gray-700">{booking.notes}</p>
                </div>
              )}

              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-500">
                  จองเมื่อ: {formatDateTimeToThai(booking.created_at)}
                </div>
                {booking.status === 'pending' && (
                  <button className="text-red-600 hover:text-red-800 text-sm font-medium">
                    ยกเลิกการจอง
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {filteredBookings.length === 0 && (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {filter === 'all' ? 'ยังไม่มีการจอง' : 
               filter === 'upcoming' ? 'ไม่มีการจองที่จะมาถึง' :
               filter === 'pending' ? 'ไม่มีการจองรออนุมัติ' :
               'ไม่มีประวัติการจอง'}
            </h3>
            <p className="text-gray-600 mb-4">
              {filter === 'all' ? 'เริ่มต้นการจองห้องของคุณ' : 'ลองเปลี่ยนตัวกรองดู'}
            </p>
            {filter === 'all' && (
              <Link
                href="/rooms"
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
              >
                ดูห้องทั้งหมด
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
