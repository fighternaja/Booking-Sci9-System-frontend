'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import Swal from 'sweetalert2'
import { API_URL, getStorageUrl } from '../../lib/api'

export default function AdminRoomsPage() {
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingRoom, setEditingRoom] = useState(null)
  const [viewMode, setViewMode] = useState('table') // 'table' or 'cards'
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState('name')
  const [sortDirection, setSortDirection] = useState('asc')
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    capacity: '',
    location: '',
    amenities: {
      equipment: [],
      facilities: []
    },
    is_active: true,
    image: null
  })
  const [newEquipment, setNewEquipment] = useState({ name: '', quantity: 1 })
  const [newFacility, setNewFacility] = useState('')
  const { token, logout } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!token) {
      router.push('/login')
      return
    }
    fetchRooms()
  }, [token])

  const fetchRooms = async () => {
    if (!token) {
      setLoading(false)
      return
    }

    try {
      const response = await fetch(`${API_URL}/api/admin/rooms`, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        if (response.status === 401) {
          logout()
          router.push('/login')
          return
        }
        console.error('HTTP Error:', response.status)
        setLoading(false)
        return
      }

      const data = await response.json()

      if (data.success) {
        setRooms(data.data)
      }
    } catch (error) {
      console.error('Error fetching rooms:', error)
      Swal.fire('Error', 'ไม่สามารถโหลดข้อมูลห้องได้', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      const url = editingRoom
        ? `${API_URL}/api/admin/rooms/${editingRoom.id}`
        : `${API_URL}/api/admin/rooms`

      // Use POST method with _method field for PUT requests to support file upload in Laravel
      const method = 'POST'

      const data = new FormData()
      data.append('name', formData.name)
      data.append('description', formData.description)
      data.append('capacity', formData.capacity)
      data.append('location', formData.location)
      data.append('is_active', formData.is_active ? '1' : '0')

      // Handle amenities
      if (formData.amenities) {
        if (formData.amenities.equipment) {
          formData.amenities.equipment.forEach((item, index) => {
            data.append(`amenities[equipment][${index}][name]`, item.name)
            data.append(`amenities[equipment][${index}][quantity]`, item.quantity)
          })
        }
        if (formData.amenities.facilities) {
          formData.amenities.facilities.forEach((item, index) => {
            data.append(`amenities[facilities][${index}]`, item)
          })
        }
      }

      if (formData.image instanceof File) {
        data.append('image', formData.image)
      }

      if (editingRoom) {
        data.append('_method', 'PUT')
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
          // Content-Type must be undefined to let browser set it with boundary
        },
        body: data
      })

      if (!response.ok) {
        if (response.status === 401) {
          logout()
          router.push('/login')
          return
        }
        const errorData = await response.json().catch(() => ({}))
        Swal.fire('Error', errorData.message || 'ไม่สามารถบันทึกข้อมูลได้', 'error')
        return
      }

      const dataResponse = await response.json()

      if (dataResponse.success) {
        Swal.fire({
          icon: 'success',
          title: 'สำเร็จ',
          text: editingRoom ? 'อัปเดตข้อมูลห้องเรียบร้อย' : 'สร้างห้องใหม่เรียบร้อย',
          timer: 1500,
          showConfirmButton: false
        })
        setShowModal(false)
        setEditingRoom(null)
        setFormData({
          name: '',
          description: '',
          capacity: '',
          location: '',
          amenities: {
            equipment: [],
            facilities: []
          },
          is_active: true,
          image: null
        })
        fetchRooms()
      }
    } catch (error) {
      console.error('Error saving room:', error)
      Swal.fire('Error', 'เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error')
    }
  }

  const handleEdit = (room) => {
    setEditingRoom(room)
    setFormData({
      name: room.name,
      description: room.description || '',
      capacity: room.capacity.toString(),
      location: room.location,
      amenities: room.amenities || { equipment: [], facilities: [] },
      is_active: room.is_active,
      image: null
    })
    setShowModal(true)
  }

  const handleAddEquipment = () => {
    if (!newEquipment.name.trim()) return

    setFormData(prev => ({
      ...prev,
      amenities: {
        ...prev.amenities,
        equipment: [...(prev.amenities.equipment || []), { ...newEquipment }]
      }
    }))
    setNewEquipment({ name: '', quantity: 1 })
  }

  const handleRemoveEquipment = (index) => {
    setFormData(prev => ({
      ...prev,
      amenities: {
        ...prev.amenities,
        equipment: prev.amenities.equipment.filter((_, i) => i !== index)
      }
    }))
  }

  const handleAddFacility = () => {
    if (!newFacility.trim()) return

    setFormData(prev => ({
      ...prev,
      amenities: {
        ...prev.amenities,
        facilities: [...(prev.amenities.facilities || []), newFacility.trim()]
      }
    }))
    setNewFacility('')
  }

  const handleRemoveFacility = (index) => {
    setFormData(prev => ({
      ...prev,
      amenities: {
        ...prev.amenities,
        facilities: prev.amenities.facilities.filter((_, i) => i !== index)
      }
    }))
  }

  const handleDelete = async (roomId) => {
    const result = await Swal.fire({
      title: 'ยืนยันการลบ?',
      text: "คุณจะไม่สามารถกู้คืนข้อมูลห้องนี้ได้!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#3b82f6',
      confirmButtonText: 'ลบ',
      cancelButtonText: 'ยกเลิก'
    })

    if (!result.isConfirmed) return

    try {
      const response = await fetch(`${API_URL}/api/admin/rooms/${roomId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to delete')
      }

      const data = await response.json()

      if (data.success) {
        Swal.fire('ลบสำเร็จ!', 'ข้อมูลห้องถูกลบแล้ว', 'success')
        fetchRooms()
      }
    } catch (error) {
      console.error('Error deleting room:', error)
      Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถลบห้องได้ (อาจมีการจองค้างอยู่)', 'error')
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target

    if (type === 'file') {
      setFormData(prev => ({
        ...prev,
        [name]: files[0]
      }))
      return
    }

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const filteredAndSortedRooms = rooms
    .filter(room =>
      room.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      room.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      room.description.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      let aValue = a[sortField]
      let bValue = b[sortField]

      if (sortField === 'capacity') {
        aValue = parseInt(aValue)
        bValue = parseInt(bValue)
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-64"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }


  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">จัดการห้อง</h1>
          <p className="text-gray-500 mt-1">เพิ่ม แก้ไข หรือลบห้องในระบบ</p>
        </div>
        <button
          onClick={() => {
            setEditingRoom(null)
            setFormData({
              name: '',
              description: '',
              capacity: '',
              location: '',
              amenities: {
                equipment: [],
                facilities: []
              },
              is_active: true,
              image: null
            })
            setNewEquipment({ name: '', quantity: 1 })
            setNewFacility('')
            setShowModal(true)
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-semibold transition-all shadow-md hover:shadow-lg flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          เพิ่มห้องใหม่
        </button>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-8">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-96">
            <input
              type="text"
              placeholder="ค้นหาห้อง (ชื่อ, สถานที่)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 hover:bg-white transition-colors"
            />
            <svg className="w-5 h-5 text-gray-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <div className="flex bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'table'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200'
                }`}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              ตาราง
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'cards'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200'
                }`}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              การ์ด
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'table' ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse border border-gray-300">
              <thead className="bg-gray-100">
                <tr>
                  <th onClick={() => handleSort('name')} className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors border border-gray-300">
                    <div className="flex items-center gap-2">ชื่อห้อง {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}</div>
                  </th>
                  <th onClick={() => handleSort('location')} className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors border border-gray-300">
                    <div className="flex items-center gap-2">ที่ตั้ง {sortField === 'location' && (sortDirection === 'asc' ? '↑' : '↓')}</div>
                  </th>
                  <th onClick={() => handleSort('capacity')} className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors border border-gray-300">
                    <div className="flex items-center gap-2">ความจุ {sortField === 'capacity' && (sortDirection === 'asc' ? '↑' : '↓')}</div>
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border border-gray-300">สถานะ</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider border border-gray-300">จัดการ</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {filteredAndSortedRooms.map((room) => (
                  <tr key={room.id} className="hover:bg-blue-50 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap border border-gray-300">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                          {room.image ? (
                            <img src={getStorageUrl(room.image)} alt={room.name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-gray-400">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-semibold text-gray-900">{room.name}</div>
                          <div className="text-xs text-gray-500 max-w-[200px] truncate">{room.description}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 border border-gray-300">{room.location}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 border border-gray-300">{room.capacity} คน</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center border border-gray-300">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${room.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
                        }`}>
                        {room.is_active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium border border-gray-300">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEdit(room)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-200"
                          title="แก้ไข"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button
                          onClick={() => handleDelete(room.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200"
                          title="ลบ"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedRooms.map((room) => (
            <div key={room.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all group">
              <div className="h-48 bg-gray-100 relative">
                {room.image ? (
                  <img src={getStorageUrl(room.image)} alt={room.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </div>
                )}
                <div className="absolute top-3 right-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold shadow-sm backdrop-blur-sm ${room.is_active ? 'bg-white/90 text-green-700' : 'bg-white/90 text-red-700'
                    }`}>
                    {room.is_active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                  </span>
                </div>
              </div>

              <div className="p-5">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{room.name}</h3>
                </div>

                <p className="text-gray-500 text-sm mb-4 line-clamp-2 min-h-[40px]">{room.description || 'ไม่มีคำอธิบาย'}</p>

                <div className="flex items-center gap-4 text-sm text-gray-500 mb-6">
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    {room.location}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                    {room.capacity}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleEdit(room)}
                    className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
                  >
                    แก้ไข
                  </button>
                  <button
                    onClick={() => handleDelete(room.id)}
                    className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                  >
                    ลบ
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {filteredAndSortedRooms.length === 0 && (
        <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">ไม่พบข้อมูลห้อง</h3>
          <p className="text-gray-500 mb-6 max-w-sm mx-auto">
            {searchTerm ? 'ลองค้นหาด้วยคำสำคัญอื่น หรือตรวจสอบคำสะกด' : 'เริ่มต้นสร้างห้องประชุมแรกของคุณเพื่อเริ่มใช้งานระบบ'}
          </p>
          {!searchTerm && (
            <button
              onClick={() => setShowModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-semibold transition-colors"
            >
              สร้างห้องใหม่
            </button>
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden animate-scaleIn flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 flex-shrink-0">
              <h2 className="text-xl font-bold text-gray-900">
                {editingRoom ? '✏️ แก้ไขข้อมูลห้อง' : '✨ เพิ่มห้องใหม่'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 space-y-5 overflow-y-auto flex-1">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">ชื่อห้อง <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="name"
                    required
                    placeholder="เช่น ห้องประชุม 101"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">คำอธิบาย</label>
                  <textarea
                    name="description"
                    placeholder="รายละเอียดเพิ่มเติมของห้อง..."
                    value={formData.description}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">รูปภาพห้อง</label>
                  <div className="flex items-start gap-4">
                    <div className="w-32 h-32 bg-gray-100 rounded-xl overflow-hidden border border-gray-200 flex-shrink-0 relative">
                      {(formData.image instanceof File) ? (
                        <img
                          src={URL.createObjectURL(formData.image)}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (editingRoom && editingRoom.image) ? (
                        <img
                          src={getStorageUrl(editingRoom.image)}
                          alt="Current"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <input
                        type="file"
                        name="image"
                        accept="image/*"
                        onChange={handleChange}
                        className="block w-full text-sm text-gray-500
                          file:mr-4 file:py-2.5 file:px-4
                          file:rounded-xl file:border-0
                          file:text-sm file:font-semibold
                          file:bg-blue-50 file:text-blue-700
                          hover:file:bg-blue-100
                          transition-all"
                      />
                      <p className="mt-2 text-xs text-gray-500">
                        รองรับไฟล์ภาพ JPG, PNG, GIF ขนาดไม่เกิน 2MB
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">ความจุ (คน) <span className="text-red-500">*</span></label>
                    <input
                      type="number"
                      name="capacity"
                      required
                      min="1"
                      placeholder="0"
                      value={formData.capacity}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">สถานที่ <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      name="location"
                      required
                      placeholder="เช่น ชั้น 1 อาคารเรียนรวม"
                      value={formData.location}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>

                {/* Amenities Section */}
                <div className="space-y-4 border-t border-gray-200 pt-5">
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    อุปกรณ์และสิ่งอำนวยความสะดวก
                  </h3>

                  {/* Equipment */}
                  <div className="bg-purple-50 p-4 rounded-xl border border-purple-200">
                    <label className="block text-sm font-semibold text-purple-900 mb-3">🛠️ อุปกรณ์ในห้อง</label>

                    <div className="flex gap-2 mb-3">
                      <input
                        type="text"
                        placeholder="ชื่ออุปกรณ์ เช่น โปรเจคเตอร์"
                        value={newEquipment.name}
                        onChange={(e) => setNewEquipment({ ...newEquipment, name: e.target.value })}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddEquipment())}
                        className="flex-1 px-3 py-2 border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                      />
                      <input
                        type="number"
                        placeholder="จำนวน"
                        min="1"
                        value={newEquipment.quantity}
                        onChange={(e) => setNewEquipment({ ...newEquipment, quantity: parseInt(e.target.value) || 1 })}
                        className="w-24 px-3 py-2 border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                      />
                      <button
                        type="button"
                        onClick={handleAddEquipment}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        เพิ่ม
                      </button>
                    </div>

                    {formData.amenities.equipment && formData.amenities.equipment.length > 0 ? (
                      <div className="space-y-2">
                        {formData.amenities.equipment.map((eq, index) => (
                          <div key={index} className="flex items-center justify-between bg-white p-2 rounded-lg border border-purple-200">
                            <span className="text-sm text-gray-900">
                              • {eq.name} <span className="text-gray-500">({eq.quantity})</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveEquipment(index)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-purple-600 text-center py-2">ยังไม่มีอุปกรณ์</p>
                    )}
                  </div>

                  {/* Facilities */}
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                    <label className="block text-sm font-semibold text-blue-900 mb-3">🏢 สิ่งอำนวยความสะดวก</label>

                    <div className="flex gap-2 mb-3">
                      <input
                        type="text"
                        placeholder="เช่น Wi-Fi, เครื่องปรับอากาศ"
                        value={newFacility}
                        onChange={(e) => setNewFacility(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddFacility())}
                        className="flex-1 px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                      <button
                        type="button"
                        onClick={handleAddFacility}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        เพิ่ม
                      </button>
                    </div>

                    {formData.amenities.facilities && formData.amenities.facilities.length > 0 ? (
                      <div className="space-y-2">
                        {formData.amenities.facilities.map((facility, index) => (
                          <div key={index} className="flex items-center justify-between bg-white p-2 rounded-lg border border-blue-200">
                            <span className="text-sm text-gray-900">• {facility}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveFacility(index)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-blue-600 text-center py-2">ยังไม่มีสิ่งอำนวยความสะดวก</p>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-center justify-between">
                  <div>
                    <span className="block text-sm font-medium text-gray-900">สถานะห้อง</span>
                    <span className="block text-xs text-gray-500">เปิด/ปิด การจองห้องนี้</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      name="is_active"
                      checked={formData.is_active}
                      onChange={handleChange}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
              {/* End of scrollable content */}

              {/* Sticky footer with buttons */}
              <div className="flex gap-3 p-6 border-t border-gray-100 bg-gray-50 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 shadow-md transition-all hover:shadow-lg"
                >
                  {editingRoom ? 'บันทึกการแก้ไข' : 'สร้างห้อง'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}