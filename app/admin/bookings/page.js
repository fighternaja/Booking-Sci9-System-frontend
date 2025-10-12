'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { formatDateToThai } from '../../utils/dateUtils'

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const { token } = useAuth()

  useEffect(() => {
    fetchBookings()
  }, [])

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

  const handleApprove = async (bookingId) => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/bookings/${bookingId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()

      if (data.success) {
        fetchBookings()
      }
    } catch (error) {
      console.error('Error approving booking:', error)
    }
  }

  const handleReject = async (bookingId) => {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะปฏิเสธการจองนี้?')) return

    try {
      const response = await fetch(`http://127.0.0.1:8000/api/bookings/${bookingId}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()

      if (data.success) {
        fetchBookings()
      }
    } catch (error) {
      console.error('Error rejecting booking:', error)
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
    if (filter === 'pending') return booking.status === 'pending'
    if (filter === 'approved') return booking.status === 'approved'
    if (filter === 'rejected') return booking.status === 'rejected'
    return true
  })

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">อนุมัติการจอง</h1>
        <p className="text-gray-600">จัดการการจองห้องทั้งหมดในระบบ</p>
      </div>

      {/* Filter Tabs */}
      <div className="mb-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { key: 'all', label: 'ทั้งหมด' },
              { key: 'pending', label: 'รออนุมัติ' },
              { key: 'approved', label: 'อนุมัติแล้ว' },
              { key: 'rejected', label: 'ปฏิเสธ' }
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

            <div className="grid md:grid-cols-2 gap-6 mb-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">ข้อมูลผู้จอง</h4>
                <div className="flex items-center">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                    <span className="text-blue-600 text-sm font-medium">
                      {booking.user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{booking.user.name}</p>
                    <p className="text-sm text-gray-600">{booking.user.email}</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">ข้อมูลการจอง</h4>
                <div className="space-y-1">
                  <p className="text-sm">
                    <span className="text-gray-500">วันที่เริ่มต้น:</span>{' '}
                    {formatDateToThai(booking.start_time)}
                  </p>
                  <p className="text-sm">
                    <span className="text-gray-500">วันที่สิ้นสุด:</span>{' '}
                    {formatDateToThai(booking.end_time)}
                  </p>
                  <p className="text-sm">
                    <span className="text-gray-500">วัตถุประสงค์:</span> {booking.purpose}
                  </p>
                  <p className="text-sm">
                  </p>
                </div>
              </div>
            </div>

            {booking.notes && (
              <div className="mb-4">
                <h4 className="font-medium text-gray-900 mb-1">หมายเหตุ</h4>
                <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{booking.notes}</p>
              </div>
            )}

            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-500">
                จองเมื่อ: {formatDateToThai(booking.created_at)}
              </div>
              
              {booking.status === 'pending' && (
                <div className="flex space-x-3">
                  <button
                    onClick={() => handleReject(booking.id)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    ปฏิเสธ
                  </button>
                  <button
                    onClick={() => handleApprove(booking.id)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    อนุมัติ
                  </button>
                </div>
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
            {filter === 'all' ? 'ไม่มีการจอง' : 
             filter === 'pending' ? 'ไม่มีการจองรออนุมัติ' :
             filter === 'approved' ? 'ไม่มีการจองที่อนุมัติแล้ว' :
             'ไม่มีการจองที่ปฏิเสธ'}
          </h3>
          <p className="text-gray-600">ลองเปลี่ยนตัวกรองดู</p>
        </div>
      )}
    </div>
  )
}
