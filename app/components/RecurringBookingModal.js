'use client'

import { useState, useEffect } from 'react'
import Swal from 'sweetalert2'
import { API_URL } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'

export default function RecurringBookingModal({ isOpen, onClose, room, onSuccess }) {
    const { token } = useAuth()
    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)
    const [previewData, setPreviewData] = useState(null)

    // Form State
    const [formData, setFormData] = useState({
        recurrence_type: 'weekly', // daily, weekly, monthly
        start_time: '08:00',
        end_time: '12:00',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        days_of_week: [], // 0=Sun, 1=Mon, ...
        purpose: '',
        notes: ''
    })

    // Reset when opening
    useEffect(() => {
        if (isOpen) {
            setStep(1)
            setPreviewData(null)
            setFormData(prev => ({
                ...prev,
                start_date: new Date().toISOString().split('T')[0],
                end_date: '',
                days_of_week: [],
                purpose: '',
                notes: ''
            }))
        }
    }, [isOpen])

    const handleNext = () => {
        if (step === 1) {
            // Validate Step 1
            if (!formData.start_time || !formData.end_time || !formData.start_date || !formData.end_date) {
                Swal.fire('กรุณากรอกข้อมูลให้ครบ', '', 'warning')
                return
            }
            if (formData.recurrence_type === 'weekly' && formData.days_of_week.length === 0) {
                Swal.fire('กรุณาเลือกวันในสัปดาห์', '', 'warning')
                return
            }
            // Go to Preview
            checkConflicts()
        } else if (step === 2) {
            // Submit
            submitBooking()
        }
    }

    const checkConflicts = async () => {
        setLoading(true)
        try {
            const payload = {
                room_id: room.id,
                ...formData
            }

            const response = await fetch(`${API_URL}/api/recurring-bookings/check-conflicts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            })

            const data = await response.json()
            if (data.success) {
                setPreviewData(data.data)
                setStep(2)
            } else {
                Swal.fire('เกิดข้อผิดพลาด', data.message, 'error')
            }
        } catch (error) {
            console.error(error)
            Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถตรวจสอบการจองได้', 'error')
        } finally {
            setLoading(false)
        }
    }

    const submitBooking = async () => {
        if (!formData.purpose) {
            Swal.fire('กรุณาระบุวัตถุประสงค์', '', 'warning')
            return
        }

        setLoading(true)
        try {
            const payload = {
                room_id: room.id,
                ...formData
            }

            const response = await fetch(`${API_URL}/api/recurring-bookings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            })

            const data = await response.json()
            if (data.success) { // Note: Response uses 201 created usually, success true
                await Swal.fire('จองสำเร็จ!', data.message, 'success')
                onSuccess && onSuccess()
                onClose()
            } else {
                Swal.fire('เกิดข้อผิดพลาด', data.message, 'error')
            }
        } catch (error) {
            console.error(error)
            Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถบันทึกการจองได้', 'error')
        } finally {
            setLoading(false)
        }
    }

    const toggleDay = (dayIndex) => {
        setFormData(prev => {
            const days = prev.days_of_week.includes(dayIndex)
                ? prev.days_of_week.filter(d => d !== dayIndex)
                : [...prev.days_of_week, dayIndex].sort()
            return { ...prev, days_of_week: days }
        })
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">จองห้องแบบต่อเนื่อง</h2>
                        <p className="text-sm text-gray-500">{room?.name}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 flex-1 overflow-y-auto">
                    {/* Steps Indicator */}
                    <div className="flex items-center mb-8 px-8">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>1</div>
                        <div className={`flex-1 h-1 mx-2 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>2</div>
                    </div>

                    {step === 1 && (
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">รูปแบบการจอง</label>
                                <div className="flex gap-4">
                                    <button
                                        className={`flex-1 py-3 px-4 rounded-xl border-2 text-sm font-medium transition-all ${formData.recurrence_type === 'weekly' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-300'}`}
                                        onClick={() => setFormData({ ...formData, recurrence_type: 'weekly' })}
                                    >
                                        รายสัปดาห์ (Weekly)
                                    </button>
                                    <button
                                        className={`flex-1 py-3 px-4 rounded-xl border-2 text-sm font-medium transition-all ${formData.recurrence_type === 'daily' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-300'}`}
                                        onClick={() => setFormData({ ...formData, recurrence_type: 'daily' })}
                                    >
                                        รายวัน (Daily)
                                    </button>
                                </div>
                            </div>

                            {formData.recurrence_type === 'weekly' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">เลือกวันในสัปดาห์</label>
                                    <div className="flex flex-wrap gap-2">
                                        {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((day, index) => (
                                            <button
                                                key={index}
                                                onClick={() => toggleDay(index)}
                                                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all ${formData.days_of_week.includes(index) ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                            >
                                                {day}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">เวลาเริ่ม</label>
                                    <input type="time" value={formData.start_time} onChange={e => setFormData({ ...formData, start_time: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">เวลาสิ้นสุด</label>
                                    <input type="time" value={formData.end_time} onChange={e => setFormData({ ...formData, end_time: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">ตั้งแต่วันที่</label>
                                    <input type="date" value={formData.start_date} onChange={e => setFormData({ ...formData, start_date: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">ถึงวันที่</label>
                                    <input type="date" value={formData.end_date} onChange={e => setFormData({ ...formData, end_date: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && previewData && (
                        <div className="space-y-6">
                            <div className="bg-gray-50 rounded-xl p-4 flex gap-4 text-sm">
                                <div className="flex-1">
                                    <p className="text-gray-500">ทั้งหมด</p>
                                    <p className="text-xl font-bold text-gray-900">{previewData.summary.total} ครั้ง</p>
                                </div>
                                <div className="flex-1">
                                    <p className="text-gray-500">ว่าง</p>
                                    <p className="text-xl font-bold text-green-600">{previewData.summary.available} ครั้ง</p>
                                </div>
                                <div className="flex-1">
                                    <p className="text-gray-500">ไม่ว่าง</p>
                                    <p className="text-xl font-bold text-red-600">{previewData.summary.conflicts} ครั้ง</p>
                                </div>
                            </div>

                            {/* Calendar/List Preview */}
                            <div className="border rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-100 text-gray-600 font-medium">
                                        <tr>
                                            <th className="p-3">วันที่</th>
                                            <th className="p-3">เวลา</th>
                                            <th className="p-3">สถานะ</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {previewData.dates.map((item, i) => (
                                            <tr key={i} className={item.is_available ? 'bg-white' : 'bg-red-50'}>
                                                <td className="p-3">{new Date(item.date).toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short' })}</td>
                                                <td className="p-3">{item.start_time.split(' ')[1].slice(0, 5)} - {item.end_time.split(' ')[1].slice(0, 5)}</td>
                                                <td className="p-3">
                                                    {item.is_available ? (
                                                        <span className="text-green-600 font-medium flex items-center gap-1">
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                            ว่าง
                                                        </span>
                                                    ) : (
                                                        <span className="text-red-600 font-medium flex items-center gap-1" title={item.conflict?.purpose}>
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                            ไม่ว่าง ({item.conflict?.user_name})
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {previewData.summary.conflicts > 0 && (
                                <div className="text-sm text-orange-600 bg-orange-50 p-3 rounded-lg border border-orange-200">
                                    ⚠️ มี {previewData.summary.conflicts} รายการที่ห้องไม่ว่าง ระบบจะสร้างการจองเฉพาะวันที่ว่างเท่านั้น
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">วัตถุประสงค์การใช้ห้อง</label>
                                <input
                                    type="text"
                                    value={formData.purpose}
                                    onChange={e => setFormData({ ...formData, purpose: e.target.value })}
                                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="เช่น ประชุมโปรเจกต์รายสัปดาห์"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 rounded-b-2xl">
                    {step === 2 && (
                        <button
                            onClick={() => setStep(1)}
                            className="px-6 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-white transition-all"
                        >
                            ย้อนกลับ
                        </button>
                    )}
                    <button
                        onClick={handleNext}
                        disabled={loading}
                        className="px-8 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold hover:shadow-lg hover:shadow-blue-500/30 disabled:opacity-50 transition-all flex items-center"
                    >
                        {loading && <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                        {step === 1 ? 'ตรวจสอบห้องว่าง' : 'ยืนยันการจอง'}
                    </button>
                </div>
            </div>
        </div>
    )
}
