'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState('created_at')
  const [sortDirection, setSortDirection] = useState('desc')

  // Bulk operations states
  const [selectedBookings, setSelectedBookings] = useState([])
  const [bulkLoading, setBulkLoading] = useState(false)

  // Equipment management states
  const [expandedBooking, setExpandedBooking] = useState(null)
  const [availableEquipment, setAvailableEquipment] = useState([])
  const [showEquipmentModal, setShowEquipmentModal] = useState(false)
  const [selectedBookingId, setSelectedBookingId] = useState(null)
  const [bookingEquipment, setBookingEquipment] = useState({})
  const [equipmentFormData, setEquipmentFormData] = useState({
    equipment_id: '',
    quantity: 1,
    notes: ''
  })

  const { token, logout } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!token) {
      router.push('/login')
      return
    }
    fetchBookings()
    fetchAvailableEquipment()
  }, [token])

  const fetchBookings = async () => {
    if (!token) {
      setLoading(false)
      return
    }

    try {
      setError(null)
      const response = await fetch('http://127.0.0.1:8000/api/bookings', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      })

      if (!response.ok) {
        if (response.status === 401) {
          logout()
          router.push('/login')
          return
        }

        let errorMessage = `เกิดข้อผิดพลาดในการโหลดข้อมูล (HTTP ${response.status})`
        try {
          const contentType = response.headers.get('content-type')
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json()
            errorMessage = errorData.message || errorMessage
          }
        } catch (e) {
          // Use default error message
        }

        setError(errorMessage)
        console.error('Error fetching bookings: HTTP', response.status)
        return
      }

      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        console.error('Non-JSON response:', text)
        setError('เซิร์ฟเวอร์ส่งข้อมูลกลับมาในรูปแบบที่ไม่ถูกต้อง')
        return
      }

      const data = await response.json()

      if (data.success) {
        setBookings(data.data || [])
        setError(null)

        // Fetch equipment for each booking
        data.data.forEach(booking => {
          fetchBookingEquipment(booking.id)
        })
      } else {
        setError(data.message || 'ไม่สามารถโหลดข้อมูลการจองได้')
      }
    } catch (error) {
      console.error('Error fetching bookings:', error)
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้ง')
    } finally {
      setLoading(false)
    }
  }

  const fetchAvailableEquipment = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/equipment', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setAvailableEquipment(data.data)
        }
      }
    } catch (error) {
      console.error('Error fetching equipment:', error)
    }
  }

  const fetchBookingEquipment = async (bookingId) => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/bookings/${bookingId}/equipment`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setBookingEquipment(prev => ({
            ...prev,
            [bookingId]: data.data
          }))
        }
      }
    } catch (error) {
      console.error('Error fetching booking equipment:', error)
    }
  }

  const handleAddEquipment = async () => {
    if (!equipmentFormData.equipment_id) {
      alert('กรุณาเลือกอุปกรณ์')
      return
    }

    try {
      const response = await fetch(`http://127.0.0.1:8000/api/bookings/${selectedBookingId}/equipment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(equipmentFormData)
      })

      const data = await response.json()

      if (data.success) {
        fetchBookingEquipment(selectedBookingId)
        setShowEquipmentModal(false)
        resetEquipmentForm()
      } else {
        alert(data.message || 'เกิดข้อผิดพลาด')
      }
    } catch (error) {
      console.error('Error adding equipment:', error)
      alert('เกิดข้อผิดพลาดในการเพิ่มอุปกรณ์')
    }
  }

  const handleDeleteEquipment = async (bookingId, equipmentId) => {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบอุปกรณ์นี้?')) return

    try {
      const response = await fetch(`http://127.0.0.1:8000/api/bookings/${bookingId}/equipment/${equipmentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      })

      const data = await response.json()

      if (data.success) {
        fetchBookingEquipment(bookingId)
      } else {
        alert(data.message || 'เกิดข้อผิดพลาด')
      }
    } catch (error) {
      console.error('Error deleting equipment:', error)
      alert('เกิดข้อผิดพลาดในการลบอุปกรณ์')
    }
  }

  const openEquipmentModal = (bookingId) => {
    setSelectedBookingId(bookingId)
    setShowEquipmentModal(true)
    resetEquipmentForm()
  }

  const resetEquipmentForm = () => {
    setEquipmentFormData({
      equipment_id: '',
      quantity: 1,
      notes: ''
    })
  }

  const handleApprove = async (bookingId) => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/bookings/${bookingId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      })

      if (!response.ok) {
        if (response.status === 401) {
          logout()
          router.push('/login')
          return
        }
        const errorText = await response.text()
        alert(`เกิดข้อผิดพลาด: ${errorText || `HTTP ${response.status}`}`)
        return
      }

      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        console.error('Non-JSON response:', text)
        return
      }

      const data = await response.json()

      if (data.success) {
        fetchBookings()
      }
    } catch (error) {
      console.error('Error approving booking:', error)
      alert('เกิดข้อผิดพลาดในการอนุมัติการจอง')
    }
  }

  const handleReject = async (bookingId) => {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะปฏิเสธการจองนี้?')) return

    try {
      const response = await fetch(`http://127.0.0.1:8000/api/bookings/${bookingId}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      })

      if (!response.ok) {
        if (response.status === 401) {
          logout()
          router.push('/login')
          return
        }
        const errorText = await response.text()
        alert(`เกิดข้อผิดพลาด: ${errorText || `HTTP ${response.status}`}`)
        return
      }

      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        console.error('Non-JSON response:', text)
        return
      }

      const data = await response.json()

      if (data.success) {
        fetchBookings()
      }
    } catch (error) {
      console.error('Error rejecting booking:', error)
      alert('เกิดข้อผิดพลาดในการปฏิเสธการจอง')
    }
  }

  // Bulk Operations Functions
  const handleSelectAll = () => {
    if (selectedBookings.length === filteredBookings.length) {
      setSelectedBookings([])
    } else {
      setSelectedBookings(filteredBookings.map(b => b.id))
    }
  }

  const handleSelectBooking = (bookingId) => {
    if (selectedBookings.includes(bookingId)) {
      setSelectedBookings(selectedBookings.filter(id => id !== bookingId))
    } else {
      setSelectedBookings([...selectedBookings, bookingId])
    }
  }

  const handleBulkApprove = async () => {
    if (selectedBookings.length === 0) {
      alert('กรุณาเลือกรายการที่ต้องการอนุมัติ')
      return
    }

    if (!confirm(`คุณแน่ใจหรือไม่ที่จะอนุมัติการจอง ${selectedBookings.length} รายการ?`)) return

    setBulkLoading(true)
    let successCount = 0
    let errorCount = 0

    for (const bookingId of selectedBookings) {
      try {
        const response = await fetch(`http://127.0.0.1:8000/api/bookings/${bookingId}/approve`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        })

        if (response.ok) {
          successCount++
        } else {
          errorCount++
        }
      } catch (error) {
        errorCount++
      }
    }

    setBulkLoading(false)
    setSelectedBookings([])
    fetchBookings()
    alert(`อนุมัติสำเร็จ ${successCount} รายการ${errorCount > 0 ? `, ล้มเหลว ${errorCount} รายการ` : ''}`)
  }

  const handleBulkReject = async () => {
    if (selectedBookings.length === 0) {
      alert('กรุณาเลือกรายการที่ต้องการปฏิเสธ')
      return
    }

    if (!confirm(`คุณแน่ใจหรือไม่ที่จะปฏิเสธการจอง ${selectedBookings.length} รายการ?`)) return

    setBulkLoading(true)
    let successCount = 0
    let errorCount = 0

    for (const bookingId of selectedBookings) {
      try {
        const response = await fetch(`http://127.0.0.1:8000/api/bookings/${bookingId}/reject`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        })

        if (response.ok) {
          successCount++
        } else {
          errorCount++
        }
      } catch (error) {
        errorCount++
      }
    }

    setBulkLoading(false)
    setSelectedBookings([])
    fetchBookings()
    alert(`ปฏิเสธสำเร็จ ${successCount} รายการ${errorCount > 0 ? `, ล้มเหลว ${errorCount} รายการ` : ''}`)
  }

  const handleBulkCancel = async () => {
    if (selectedBookings.length === 0) {
      alert('กรุณาเลือกรายการที่ต้องการยกเลิก')
      return
    }

    if (!confirm(`คุณแน่ใจหรือไม่ที่จะยกเลิกการจอง ${selectedBookings.length} รายการ?`)) return

    setBulkLoading(true)
    let successCount = 0
    let errorCount = 0

    for (const bookingId of selectedBookings) {
      try {
        const response = await fetch(`http://127.0.0.1:8000/api/bookings/${bookingId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        })

        if (response.ok) {
          successCount++
        } else {
          errorCount++
        }
      } catch (error) {
        errorCount++
      }
    }

    setBulkLoading(false)
    setSelectedBookings([])
    fetchBookings()
    alert(`ยกเลิกสำเร็จ ${successCount} รายการ${errorCount > 0 ? `, ล้มเหลว ${errorCount} รายการ` : ''}`)
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

  const formatDateToThai = (dateString) => {
    const date = new Date(dateString)
    const thaiMonths = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ]
    const day = date.getDate()
    const month = thaiMonths[date.getMonth()]
    const year = date.getFullYear() + 543
    const hour = String(date.getHours()).padStart(2, '0')
    const minute = String(date.getMinutes()).padStart(2, '0')
    return `${day} ${month} ${year} ${hour}:${minute} น.`
  }

  const filteredBookings = bookings.filter(booking => {
    if (filter !== 'all' && booking.status !== filter) {
      return false
    }

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      return (
        booking.room?.name?.toLowerCase().includes(searchLower) ||
        booking.user?.name?.toLowerCase().includes(searchLower) ||
        booking.user?.email?.toLowerCase().includes(searchLower) ||
        booking.purpose?.toLowerCase().includes(searchLower) ||
        booking.room?.location?.toLowerCase().includes(searchLower)
      )
    }

    return true
  }).sort((a, b) => {
    let aValue, bValue

    switch (sortField) {
      case 'created_at':
        aValue = new Date(a.created_at)
        bValue = new Date(b.created_at)
        break
      case 'start_time':
        aValue = new Date(a.start_time)
        bValue = new Date(b.start_time)
        break
      case 'room_name':
        aValue = a.room?.name || ''
        bValue = b.room?.name || ''
        break
      case 'user_name':
        aValue = a.user?.name || ''
        bValue = b.user?.name || ''
        break
      default:
        aValue = a[sortField] || ''
        bValue = b[sortField] || ''
    }

    if (sortDirection === 'asc') {
      return aValue > bValue ? 1 : -1
    } else {
      return aValue < bValue ? 1 : -1
    }
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
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">จัดการการจอง</h1>
              <p className="text-gray-600">ดูและจัดการการจองทั้งหมดในระบบ</p>
            </div>
            <Link
              href="/admin"
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-lg transition-all shadow-md hover:shadow-lg font-medium"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              กลับไปหน้า Dashboard
            </Link>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
              <button
                onClick={fetchBookings}
                className="ml-4 px-4 py-2 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white rounded-lg text-sm font-medium transition-all shadow-md hover:shadow-lg"
              >
                ลองใหม่
              </button>
            </div>
          </div>
        )}

        {/* Bulk Actions Bar */}
        {selectedBookings.length > 0 && (
          <div className="mb-6 bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                <span className="text-blue-900 font-semibold">เลือกแล้ว {selectedBookings.length} รายการ</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleBulkApprove}
                  disabled={bulkLoading}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors flex items-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  อนุมัติทั้งหมด
                </button>
                <button
                  onClick={handleBulkReject}
                  disabled={bulkLoading}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors flex items-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  ปฏิเสธทั้งหมด
                </button>
                <button
                  onClick={handleBulkCancel}
                  disabled={bulkLoading}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors flex items-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  ยกเลิกทั้งหมด
                </button>
                <button
                  onClick={() => setSelectedBookings([])}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
                >
                  ยกเลิกการเลือก
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">กรองตามสถานะ</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'all', label: 'ทั้งหมด' },
                  { key: 'pending', label: 'รออนุมัติ' },
                  { key: 'approved', label: 'อนุมัติแล้ว' },
                  { key: 'rejected', label: 'ปฏิเสธ' },
                  { key: 'cancelled', label: 'ยกเลิก' }
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setFilter(tab.key)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all shadow-sm ${filter === tab.key
                      ? tab.key === 'all'
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md transform scale-105'
                        : tab.key === 'pending'
                          ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-md transform scale-105'
                          : tab.key === 'approved'
                            ? 'bg-gradient-to-r from-green-400 to-emerald-500 text-white shadow-md transform scale-105'
                            : tab.key === 'rejected'
                              ? 'bg-gradient-to-r from-red-400 to-rose-500 text-white shadow-md transform scale-105'
                              : 'bg-gradient-to-r from-gray-400 to-slate-500 text-white shadow-md transform scale-105'
                      : tab.key === 'all'
                        ? 'bg-purple-100 text-purple-700 hover:bg-purple-200 hover:shadow'
                        : tab.key === 'pending'
                          ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 hover:shadow'
                          : tab.key === 'approved'
                            ? 'bg-green-100 text-green-700 hover:bg-green-200 hover:shadow'
                            : tab.key === 'rejected'
                              ? 'bg-red-100 text-red-700 hover:bg-red-200 hover:shadow'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow'
                      }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">ค้นหา</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="ค้นหาด้วยชื่อห้อง, ชื่อผู้ใช้, อีเมล, หรือวัตถุประสงค์..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <svg className="w-5 h-5 text-gray-400 absolute right-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Sort Options */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">เรียงตาม</label>
            <div className="flex flex-wrap gap-2">
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value)}
                className="px-4 py-2 border-2 border-indigo-300 bg-white rounded-lg text-sm font-medium text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm hover:border-indigo-400 transition-colors"
              >
                <option value="created_at">วันที่สร้าง</option>
                <option value="start_time">วันที่เริ่มต้น</option>
                <option value="room_name">ชื่อห้อง</option>
                <option value="user_name">ชื่อผู้ใช้</option>
              </select>
              <button
                onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white rounded-lg text-sm font-medium transition-all shadow-md hover:shadow-lg flex items-center"
              >
                {sortDirection === 'asc' ? (
                  <>
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                    น้อย → มาก
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    มาก → น้อย
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Bookings List */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              การจองทั้งหมด ({filteredBookings.length} รายการ)
            </h2>
            {filteredBookings.length > 0 && (
              <button
                onClick={handleSelectAll}
                className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-sm font-medium transition-colors"
              >
                {selectedBookings.length === filteredBookings.length ? 'ยกเลิกเลือกทั้งหมด' : 'เลือกทั้งหมด'}
              </button>
            )}
          </div>

          {filteredBookings.length === 0 ? (
            <div className="text-center py-16">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-gray-500 text-lg mb-2">
                {searchTerm ? 'ไม่พบการจองที่ค้นหา' :
                  filter === 'all' ? 'ไม่มีการจอง' :
                    filter === 'pending' ? 'ไม่มีการจองรออนุมัติ' :
                      filter === 'approved' ? 'ไม่มีการจองที่อนุมัติแล้ว' :
                        filter === 'rejected' ? 'ไม่มีการจองที่ปฏิเสธ' :
                          'ไม่มีการจองที่ยกเลิก'}
              </p>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="mt-3 inline-flex items-center px-4 py-2 bg-gradient-to-r from-orange-400 to-pink-500 hover:from-orange-500 hover:to-pink-600 text-white rounded-lg text-sm font-medium transition-all shadow-md hover:shadow-lg"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  ล้างการค้นหา
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredBookings.map((booking) => (
                <div key={booking.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-4">
                    {/* Checkbox */}
                    <div className="flex items-center pt-1">
                      <input
                        type="checkbox"
                        checked={selectedBookings.includes(booking.id)}
                        onChange={() => handleSelectBooking(booking.id)}
                        className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </div>

                    {/* Booking Content */}
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-semibold text-gray-900">{booking.room?.name || 'ไม่ระบุห้อง'}</h3>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(booking.status)}`}>
                              {getStatusText(booking.status)}
                            </span>
                            <span className="text-sm text-gray-500">#{booking.id.toString().padStart(6, '0')}</span>
                          </div>
                          <p className="text-sm text-gray-600">{booking.room?.location || 'ไม่ระบุสถานที่'}</p>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-3 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">ผู้จอง</p>
                          <p className="text-sm font-medium text-gray-900">{booking.user?.name || 'ไม่ระบุ'}</p>
                          <p className="text-xs text-gray-500">{booking.user?.email || ''}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">วันที่เริ่มต้น</p>
                          <p className="text-sm font-medium text-gray-900">{formatDateToThai(booking.start_time)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">วันที่สิ้นสุด</p>
                          <p className="text-sm font-medium text-gray-900">{formatDateToThai(booking.end_time)}</p>
                        </div>
                      </div>

                      <div className="mb-4">
                        <p className="text-xs text-gray-500 mb-1">วัตถุประสงค์</p>
                        <p className="text-sm text-gray-900">{booking.purpose || 'ไม่ระบุ'}</p>
                      </div>

                      {booking.notes && (
                        <div className="mb-4 bg-blue-50 rounded-lg p-3">
                          <p className="text-xs text-gray-500 mb-1">หมายเหตุ</p>
                          <p className="text-sm text-gray-800">{booking.notes}</p>
                        </div>
                      )}

                      <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                        <p className="text-xs text-gray-500">
                          สร้างเมื่อ: {formatDateToThai(booking.created_at)}
                        </p>
                        {booking.status === 'pending' && (
                          <div className="flex gap-3">
                            <button
                              onClick={() => handleReject(booking.id)}
                              className="px-6 py-2.5 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white rounded-lg transition-all shadow-md hover:shadow-lg text-sm font-medium flex items-center"
                            >
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              ปฏิเสธ
                            </button>
                            <button
                              onClick={() => handleApprove(booking.id)}
                              className="px-6 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg transition-all shadow-md hover:shadow-lg text-sm font-medium flex items-center"
                            >
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              อนุมัติ
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
