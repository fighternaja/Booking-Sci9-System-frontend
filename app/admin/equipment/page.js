'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useRouter } from 'next/navigation'
import AdminHeader from '../components/AdminHeader'
import AdminCard from '../components/AdminCard'
import AdminButton from '../components/AdminButton'
import Swal from 'sweetalert2'

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
                Swal.fire({
                    icon: 'success',
                    title: 'สำเร็จ',
                    text: editingEquipment ? 'แก้ไขอุปกรณ์สำเร็จ' : 'เพิ่มอุปกรณ์สำเร็จ',
                    timer: 1500,
                    showConfirmButton: false
                })
            } else {
                Swal.fire('Error', data.message || 'เกิดข้อผิดพลาด', 'error')
            }
        } catch (error) {
            console.error('Error saving equipment:', error)
            Swal.fire('Error', 'เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error')
        }
    }

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: 'ยืนยันการลบ?',
            text: "คุณต้องการลบอุปกรณ์นี้ใช่หรือไม่?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#3b82f6',
            confirmButtonText: 'ลบ',
            cancelButtonText: 'ยกเลิก'
        })

        if (!result.isConfirmed) return

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
                Swal.fire('ลบสำเร็จ!', 'ลบอุปกรณ์เรียบร้อยแล้ว', 'success')
            } else {
                Swal.fire('Error', data.message || 'เกิดข้อผิดพลาด', 'error')
            }
        } catch (error) {
            console.error('Error deleting equipment:', error)
            Swal.fire('Error', 'เกิดข้อผิดพลาดในการลบอุปกรณ์', 'error')
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
            available: 'bg-green-50 text-green-700 border-green-100',
            maintenance: 'bg-yellow-50 text-yellow-700 border-yellow-100',
            unavailable: 'bg-red-50 text-red-700 border-red-100'
        }
        return badges[status] || 'bg-gray-50 text-gray-700 border-gray-100'
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
            <div className="space-y-8">
                <div className="h-20 bg-gray-100 rounded-2xl animate-pulse"></div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => <div key={i} className="h-64 bg-gray-100 rounded-2xl animate-pulse"></div>)}
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <AdminHeader
                title="จัดการอุปกรณ์"
                subtitle="จัดการอุปกรณ์เสริมสำหรับการจองห้อง"
                actions={
                    <AdminButton
                        onClick={() => setShowModal(true)}
                        icon={<span className="text-lg">+</span>}
                    >
                        เพิ่มอุปกรณ์
                    </AdminButton>
                }
            />

            {/* Equipment Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {equipment.length === 0 ? (
                    <AdminCard className="col-span-full">
                        <div className="text-center py-16">
                            <span className="text-4xl block mb-4">🔌</span>
                            <p className="text-gray-500 font-medium text-lg">ยังไม่มีอุปกรณ์ในระบบ</p>
                            <p className="text-gray-400 text-sm mt-2">เริ่มเพิ่มอุปกรณ์แรกของคุณได้เลย</p>
                        </div>
                    </AdminCard>
                ) : (
                    equipment.map((item) => (
                        <AdminCard key={item.id} className="flex flex-col h-full group">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">{item.name}</h3>
                                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStatusBadge(item.status)}`}>
                                        {getStatusText(item.status)}
                                    </span>
                                </div>
                                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl">
                                    🔌
                                </div>
                            </div>

                            <p className="text-sm text-gray-600 mb-6 flex-1 line-clamp-2">
                                {item.description || 'ไม่มีคำอธิบาย'}
                            </p>

                            <div className="grid grid-cols-2 gap-3 mb-6">
                                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                                    <p className="text-xs text-gray-500 font-medium mb-1">ทั้งหมด</p>
                                    <p className="text-xl font-bold text-gray-900">{item.quantity}</p>
                                </div>
                                <div className="bg-green-50 rounded-xl p-3 border border-green-100">
                                    <p className="text-xs text-green-600 font-medium mb-1">ว่าง</p>
                                    <p className="text-xl font-bold text-green-700">{item.available_quantity}</p>
                                </div>
                            </div>

                            <div className="flex gap-2 pt-4 border-t border-gray-100 mt-auto">
                                <AdminButton
                                    variant="secondary"
                                    size="sm"
                                    className="flex-1"
                                    onClick={() => handleEdit(item)}
                                >
                                    แก้ไข
                                </AdminButton>
                                <AdminButton
                                    variant="danger"
                                    size="sm"
                                    className="flex-1"
                                    onClick={() => handleDelete(item.id)}
                                >
                                    ลบ
                                </AdminButton>
                            </div>
                        </AdminCard>
                    ))
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <AdminCard className="w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col p-0">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-900">
                                {editingEquipment ? '✏️ แก้ไขอุปกรณ์' : '➕ เพิ่มอุปกรณ์ใหม่'}
                            </h2>
                            <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600">✕</button>
                        </div>

                        <div className="p-6 overflow-y-auto">
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">ชื่ออุปกรณ์ *</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        required
                                        placeholder="เช่น สาย HDMI, ปลั๊กพ่วง"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">คำอธิบาย</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                                        rows="3"
                                        placeholder="รายละเอียดเพิ่มเติม..."
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">จำนวนทั้งหมด *</label>
                                        <input
                                            type="number"
                                            value={formData.quantity}
                                            onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                                            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                            min="1"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">พร้อมใช้งาน *</label>
                                        <input
                                            type="number"
                                            value={formData.available_quantity}
                                            onChange={(e) => setFormData({ ...formData, available_quantity: parseInt(e.target.value) || 0 })}
                                            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                            min="0"
                                            max={formData.quantity}
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">สถานะ *</label>
                                    <select
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                        required
                                    >
                                        <option value="available">พร้อมใช้งาน</option>
                                        <option value="maintenance">ซ่อมบำรุง</option>
                                        <option value="unavailable">ไม่พร้อมใช้งาน</option>
                                    </select>
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <AdminButton
                                        type="button"
                                        variant="secondary"
                                        onClick={handleCloseModal}
                                        className="flex-1"
                                    >
                                        ยกเลิก
                                    </AdminButton>
                                    <AdminButton
                                        type="submit"
                                        className="flex-1"
                                    >
                                        {editingEquipment ? 'บันทึก' : 'เพิ่ม'}
                                    </AdminButton>
                                </div>
                            </form>
                        </div>
                    </AdminCard>
                </div>
            )}
        </div>
    )
}
