'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import Swal from 'sweetalert2'

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState('created_at')
  const [sortDirection, setSortDirection] = useState('desc')

  // Bulk operations
  const [selectedBookings, setSelectedBookings] = useState([])
  const [bulkLoading, setBulkLoading] = useState(false)

  // Equipment management
  const [showEquipmentModal, setShowEquipmentModal] = useState(false)
  const [selectedBookingId, setSelectedBookingId] = useState(null)
  const [bookingEquipment, setBookingEquipment] = useState({})
  const [equipmentFormData, setEquipmentFormData] = useState({
    equipment_id: '',
    quantity: 1,
    notes: ''
  })
  const [availableEquipment, setAvailableEquipment] = useState([])

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
    if (!token) { setLoading(false); return }

    try {
      setError(null)
      const response = await fetch('http://127.0.0.1:8000/api/bookings', {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      })

      if (!response.ok) {
        if (response.status === 401) { logout(); router.push('/login'); return }
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      if (data.success) {
        setBookings(data.data || [])
        setError(null)
        data.data.forEach(booking => fetchBookingEquipment(booking.id))
      } else {
        setError(data.message || 'ไม่สามารถโหลดข้อมูลการจองได้')
      }
    } catch (error) {
      console.error('Error fetching bookings:', error)
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ')
    } finally {
      setLoading(false)
    }
  }

  const fetchAvailableEquipment = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/equipment', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        if (data.success) setAvailableEquipment(data.data)
      }
    } catch (e) { console.error(e) }
  }

  const fetchBookingEquipment = async (bookingId) => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/bookings/${bookingId}/equipment`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        if (data.success) {
          setBookingEquipment(prev => ({ ...prev, [bookingId]: data.data }))
        }
      }
    } catch (e) { console.error(e) }
  }

  // Actions
  const handleApprove = async (bookingId) => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/bookings/${bookingId}/approve`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        fetchBookings()
        Swal.fire({ icon: 'success', title: 'อนุมัติเรียบร้อย', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 })
      }
    } catch (e) { console.error(e) }
  }

  const handleReject = async (bookingId) => {
    const result = await Swal.fire({
      title: 'ปฏิเสธการจอง?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'ยืนยัน',
      cancelButtonText: 'ยกเลิก',
      cancelButtonTextClass: 'text-gray-600'
    })
    if (!result.isConfirmed) return

    try {
      const res = await fetch(`http://127.0.0.1:8000/api/bookings/${bookingId}/reject`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        fetchBookings()
        Swal.fire({ icon: 'success', title: 'ปฏิเสธเรียบร้อย', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 })
      }
    } catch (e) { console.error(e) }
  }

  // Equipment Actions
  const handleAddEquipment = async () => {
    if (!equipmentFormData.equipment_id) return
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/bookings/${selectedBookingId}/equipment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(equipmentFormData)
      })
      const data = await res.json()
      if (data.success) {
        fetchBookingEquipment(selectedBookingId)
        setShowEquipmentModal(false)
        setEquipmentFormData({ equipment_id: '', quantity: 1, notes: '' })
        Swal.fire({ icon: 'success', title: 'เพิ่มอุปกรณ์แล้ว', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 })
      }
    } catch (e) { console.error(e) }
  }

  const handleDeleteEquipment = async (bookingId, eqId) => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/bookings/${bookingId}/equipment/${eqId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) fetchBookingEquipment(bookingId)
    } catch (e) { console.error(e) }
  }

  // Bulk Actions
  const handleSelectAll = (e) => {
    if (e.target.checked) setSelectedBookings(filteredBookings.map(b => b.id))
    else setSelectedBookings([])
  }

  const handleSelectOne = (id) => {
    if (selectedBookings.includes(id)) setSelectedBookings(prev => prev.filter(bId => bId !== id))
    else setSelectedBookings(prev => [...prev, id])
  }

  const performBulk = async (action) => {
    if (!selectedBookings.length) return
    setBulkLoading(true)
    for (const id of selectedBookings) {
      try {
        let url = `http://127.0.0.1:8000/api/bookings/${id}/${action}`
        let method = 'POST'
        if (action === 'cancel') {
          url = `http://127.0.0.1:8000/api/bookings/${id}`
          method = 'DELETE'
        }
        await fetch(url, { method, headers: { 'Authorization': `Bearer ${token}` } })
      } catch (e) { console.error(e) }
    }
    setBulkLoading(false)
    setSelectedBookings([])
    fetchBookings()
    Swal.fire({ icon: 'success', title: 'ดำเนินการเรียบร้อย', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 })
  }

  // Filtering
  const filteredBookings = bookings.filter(booking => {
    if (filter !== 'all' && booking.status !== filter) return false
    if (searchTerm) {
      const s = searchTerm.toLowerCase()
      return booking.room?.name?.toLowerCase().includes(s) ||
        booking.user?.name?.toLowerCase().includes(s) ||
        booking.purpose?.toLowerCase().includes(s)
    }
    return true
  }).sort((a, b) => {
    const dateA = new Date(a.created_at)
    const dateB = new Date(b.created_at)
    return sortDirection === 'desc' ? dateB - dateA : dateA - dateB
  })

  // Format Helper
  const formatTime = (dateStr) => {
    const d = new Date(dateStr)
    return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.'
  }
  const formatDate = (dateStr) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-white"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div></div>

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">

      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight text-gray-900">จัดการการจองห้อง</h1>
          <Link href="/admin" className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
            กลับสู่แดชบอร์ด
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Controls */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">

          {/* Minimal Tabs */}
          <div className="flex p-1 bg-white border border-gray-200 rounded-lg shadow-sm">
            {[
              { id: 'all', label: 'ทั้งหมด' },
              { id: 'pending', label: 'รออนุมัติ' },
              { id: 'approved', label: 'อนุมัติแล้ว' },
              { id: 'rejected', label: 'ปฏิเสธ' },
              { id: 'cancelled', label: 'ยกเลิก' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${filter === tab.id
                    ? 'bg-gray-900 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Simple Search */}
          <div className="relative w-full md:w-64">
            <input
              type="text"
              className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all shadow-sm"
              placeholder="ค้นหา..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <svg className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Bulk Actions Banner */}
        {selectedBookings.length > 0 && (
          <div className="mb-4 bg-gray-900 text-white rounded-lg shadow-md px-4 py-3 flex items-center justify-between animate-fade-in-down">
            <span className="text-sm font-medium">เลือก {selectedBookings.length} รายการ</span>
            <div className="flex gap-2 text-xs font-semibold">
              <button onClick={() => performBulk('approve')} disabled={bulkLoading} className="px-3 py-1.5 bg-white text-gray-900 rounded hover:bg-gray-100 transition-colors">อนุมัติ</button>
              <button onClick={() => performBulk('reject')} disabled={bulkLoading} className="px-3 py-1.5 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors">ปฏิเสธ</button>
              <button onClick={() => setSelectedBookings([])} className="px-3 py-1.5 text-gray-300 hover:text-white transition-colors">ยกเลิก</button>
            </div>
          </div>
        )}

        {/* Clean Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full whitespace-nowrap text-sm text-left">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-medium">
                <tr>
                  <th className="px-6 py-4 w-10">
                    <input type="checkbox"
                      className="rounded border-gray-300 text-gray-900 focus:ring-gray-900 w-4 h-4 cursor-pointer"
                      checked={selectedBookings.length === filteredBookings.length && filteredBookings.length > 0}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th className="px-6 py-4">ผู้จอง</th>
                  <th className="px-6 py-4">ห้องและเวลา</th>
                  <th className="px-6 py-4">วัตถุประสงค์</th>
                  <th className="px-6 py-4">สถานะ</th>
                  <th className="px-6 py-4 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredBookings.length > 0 ? filteredBookings.map((booking) => (
                  <tr key={booking.id} className={`hover:bg-gray-50/80 transition-colors ${selectedBookings.includes(booking.id) ? 'bg-gray-50' : ''}`}>
                    <td className="px-6 py-4">
                      <input type="checkbox"
                        className="rounded border-gray-300 text-gray-900 focus:ring-gray-900 w-4 h-4 cursor-pointer"
                        checked={selectedBookings.includes(booking.id)}
                        onChange={() => handleSelectOne(booking.id)}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                          {booking.user?.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">{booking.user?.name}</div>
                          <div className="text-xs text-gray-500">{booking.user?.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-900 font-medium">{booking.room?.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {formatDate(booking.start_time)}, {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                      </div>
                      {bookingEquipment[booking.id]?.length > 0 && (
                        <div className="mt-1 flex gap-1">
                          {bookingEquipment[booking.id].map(eq => (
                            <span key={eq.id} className="inline-block px-1.5 py-0.5 bg-gray-100 text-[10px] text-gray-600 rounded">
                              {eq.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 max-w-xs truncate text-gray-600">
                      {booking.purpose}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                        ${booking.status === 'approved' ? 'bg-green-50 text-green-700 border border-green-100' :
                          booking.status === 'pending' ? 'bg-yellow-50 text-yellow-700 border border-yellow-100' :
                            booking.status === 'rejected' ? 'bg-red-50 text-red-700 border border-red-100' :
                              'bg-gray-100 text-gray-600 border border-gray-200'
                        }`}
                      >
                        {booking.status === 'approved' ? 'อนุมัติแล้ว' :
                          booking.status === 'pending' ? 'รออนุมัติ' :
                            booking.status === 'rejected' ? 'ปฏิเสธ' : 'ยกเลิก'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => { setSelectedBookingId(booking.id); setShowEquipmentModal(true) }}
                          className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                          title="อุปกรณ์"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                        </button>
                        {booking.status === 'pending' && (
                          <>
                            <button onClick={() => handleApprove(booking.id)} className="text-green-600 hover:text-green-800 transition-colors p-1" title="อนุมัติ">
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            </button>
                            <button onClick={() => handleReject(booking.id)} className="text-red-600 hover:text-red-800 transition-colors p-1" title="ปฏิเสธ">
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-24 text-center text-gray-500">
                      <div className="flex flex-col items-center">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                          <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                        </div>
                        <p className="font-medium">ไม่พบข้อมูลการจอง</p>
                        <p className="text-xs mt-1 text-gray-400">ลองเปลี่ยนตัวกรองหรือคำค้นหา</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Equipment Modal */}
      {showEquipmentModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-semibold text-gray-900">รายการอุปกรณ์</h3>
              <button onClick={() => setShowEquipmentModal(false)} className="text-gray-400 hover:text-gray-600"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>

            <div className="p-6">
              {/* List */}
              {bookingEquipment[selectedBookingId]?.length > 0 ? (
                <div className="space-y-2 mb-6">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">อุปกรณ์ที่มี</p>
                  {bookingEquipment[selectedBookingId].map(eq => (
                    <div key={eq.id} className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded border border-gray-100">
                      <span className="text-gray-700">{eq.name} <span className="text-gray-400">x{eq.pivot.quantity}</span></span>
                      <button onClick={() => handleDeleteEquipment(selectedBookingId, eq.id)} className="text-red-400 hover:text-red-600 text-xs">ลบ</button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-400 text-sm mb-4">ไม่มีอุปกรณ์เสริม</div>
              )}

              {/* Add */}
              <div className="pt-4 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">เพิ่มรายการ</p>
                <div className="space-y-3">
                  <select
                    className="w-full rounded-lg border-gray-200 text-sm focus:ring-gray-900 focus:border-gray-900"
                    value={equipmentFormData.equipment_id}
                    onChange={e => setEquipmentFormData({ ...equipmentFormData, equipment_id: e.target.value })}
                  >
                    <option value="">เลือกอุปกรณ์</option>
                    {availableEquipment.map(eq => <option key={eq.id} value={eq.id}>{eq.name}</option>)}
                  </select>
                  <div className="flex gap-2">
                    <input
                      type="number" min="1" className="w-20 rounded-lg border-gray-200 text-sm focus:ring-gray-900 focus:border-gray-900"
                      value={equipmentFormData.quantity}
                      onChange={e => setEquipmentFormData({ ...equipmentFormData, quantity: parseInt(e.target.value) || 1 })}
                    />
                    <button onClick={handleAddEquipment} className="flex-1 bg-gray-900 hover:bg-black text-white rounded-lg text-sm font-medium transition-colors">
                      เพิ่ม
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
