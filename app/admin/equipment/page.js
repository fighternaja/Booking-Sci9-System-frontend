'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AdminEquipmentPage() {
    const [equipment, setEquipment] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editingEquipment, setEditingEquipment] = useState(null)
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        quantity: 1,
        available_quantity: 1,
        status: 'available'
    })

    const { token, logout } = useAuth()
    const router = useRouter()

    useEffect(() => {
        if (!token) {
            router.push('/login')
            return
        }
        fetchEquipment()
    }, [token])

    const fetchEquipment = async () => {
        try {
            setLoading(true)
            const response = await fetch('http://127.0.0.1:8000/api/equipment', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            })

            if (response.ok) {
                const data = await response.json()
                if (data.success) {
                    setEquipment(data.data)
                }
            }
        } catch (error) {
            console.error('Error fetching equipment:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        const url = editingEquipment
            ? `http://127.0.0.1:8000/api/equipment/${editingEquipment.id}`
            : 'http://127.0.0.1:8000/api/equipment'

        const method = editingEquipment ? 'PUT' : 'POST'

        try {
            const response = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(formData)
            })

            const data = await response.json()

            if (data.success) {
                fetchEquipment()
                handleCloseModal()
                alert(editingEquipment ? 'แก้ไขอุปกรณ์สำเร็จ' : 'เพิ่มอุปกรณ์สำเร็จ')
            } else {
                alert(data.message || 'เกิดข้อผิดพลาด')
            }
        } catch (error) {
            console.error('Error saving equipment:', error)
            alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล')
        }
    }

    const handleDelete = async (id) => {
        if (!confirm('คุณแน่ใจหรือไม่ที่จะลบอุปกรณ์นี้?')) return

        try {
            const response = await fetch(`http://127.0.0.1:8000/api/equipment/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            })

            const data = await response.json()

            if (data.success) {
                fetchEquipment()
                alert('ลบอุปกรณ์สำเร็จ')
            } else {
                alert(data.message || 'เกิดข้อผิดพลาด')
            }
        } catch (error) {
            console.error('Error deleting equipment:', error)
            alert('เกิดข้อผิดพลาดในการลบอุปกรณ์')
        }
    }

    const handleEdit = (item) => {
        setEditingEquipment(item)
        setFormData({
            name: item.name,
            description: item.description || '',
            quantity: item.quantity,
            available_quantity: item.available_quantity,
            status: item.status
        })
        setShowModal(true)
    }

    const handleCloseModal = () => {
        setShowModal(false)
        setEditingEquipment(null)
        setFormData({
            name: '',
            description: '',
            quantity: 1,
            available_quantity: 1,
            status: 'available'
        })
    }

    const getStatusBadge = (status) => {
        const badges = {
            available: 'bg-green-100 text-green-800',
            maintenance: 'bg-yellow-100 text-yellow-800',
            unavailable: 'bg-red-100 text-red-800'
        }
        return badges[status] || 'bg-gray-100 text-gray-800'
    }

    const getStatusText = (status) => {
        const texts = {
            available: 'พร้อมใช้งาน',
            maintenance: 'ซ่อมบำรุง',
            unavailable: 'ไม่พร้อมใช้งาน'
        }
        return texts[status] || status
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
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">จัดการอุปกรณ์</h1>
                            <p className="text-gray-600">จัดการอุปกรณ์เสริมสำหรับการจองห้อง</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setShowModal(true)}
                                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg transition-all shadow-md hover:shadow-lg font-medium"
                            >
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                เพิ่มอุปกรณ์
                            </button>
                            <Link
                                href="/admin"
                                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-lg transition-all shadow-md hover:shadow-lg font-medium"
                            >
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                                กลับ Dashboard
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Equipment Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {equipment.length === 0 ? (
                        <div className="col-span-full text-center py-16 bg-white rounded-lg shadow">
                            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                            <p className="text-gray-500 text-lg mb-4">ยังไม่มีอุปกรณ์ในระบบ</p>
                            <button
                                onClick={() => setShowModal(true)}
                                className="inline-flex items-center px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                            >
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                เพิ่มอุปกรณ์แรก
                            </button>
                        </div>
                    ) : (
                        equipment.map((item) => (
                            <div key={item.id} className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow overflow-hidden">
                                <div className="p-6">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex-1">
                                            <h3 className="text-xl font-bold text-gray-900 mb-2">{item.name}</h3>
                                            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(item.status)}`}>
                                                {getStatusText(item.status)}
                                            </span>
                                        </div>
                                        <svg className="w-12 h-12 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                        </svg>
                                    </div>

                                    {item.description && (
                                        <p className="text-sm text-gray-600 mb-4">{item.description}</p>
                                    )}

                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div className="bg-blue-50 rounded-lg p-3">
                                            <p className="text-xs text-blue-600 font-medium mb-1">จำนวนทั้งหมด</p>
                                            <p className="text-2xl font-bold text-blue-900">{item.quantity}</p>
                                        </div>
                                        <div className="bg-green-50 rounded-lg p-3">
                                            <p className="text-xs text-green-600 font-medium mb-1">พร้อมใช้งาน</p>
                                            <p className="text-2xl font-bold text-green-900">{item.available_quantity}</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleEdit(item)}
                                            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center"
                                        >
                                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                            แก้ไข
                                        </button>
                                        <button
                                            onClick={() => handleDelete(item.id)}
                                            className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center"
                                        >
                                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                            ลบ
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
                        <div className="p-6">
                            <h2 className="text-2xl font-bold text-gray-900 mb-6">
                                {editingEquipment ? 'แก้ไขอุปกรณ์' : 'เพิ่มอุปกรณ์ใหม่'}
                            </h2>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">ชื่ออุปกรณ์ *</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">คำอธิบาย</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                        rows="3"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">จำนวนทั้งหมด *</label>
                                        <input
                                            type="number"
                                            value={formData.quantity}
                                            onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                            min="1"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">พร้อมใช้งาน *</label>
                                        <input
                                            type="number"
                                            value={formData.available_quantity}
                                            onChange={(e) => setFormData({ ...formData, available_quantity: parseInt(e.target.value) || 1 })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                            min="0"
                                            max={formData.quantity}
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">สถานะ *</label>
                                    <select
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                        required
                                    >
                                        <option value="available">พร้อมใช้งาน</option>
                                        <option value="maintenance">ซ่อมบำรุง</option>
                                        <option value="unavailable">ไม่พร้อมใช้งาน</option>
                                    </select>
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={handleCloseModal}
                                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                                    >
                                        ยกเลิก
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
                                    >
                                        {editingEquipment ? 'บันทึก' : 'เพิ่ม'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
