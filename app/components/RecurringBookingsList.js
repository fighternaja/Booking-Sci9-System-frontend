'use client'

import { useEffect, useState } from 'react'
import Swal from 'sweetalert2'
import { useRouter } from 'next/navigation'

export default function RecurringBookingsList({ token }) {
    const [recurringBookings, setRecurringBookings] = useState([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('all') // all, active, inactive
    const router = useRouter()

    useEffect(() => {
        if (token) {
            fetchRecurringBookings()
        }
    }, [token, filter])

    const fetchRecurringBookings = async () => {
        try {
            setLoading(true)
            const url = filter === 'all'
                ? 'http://127.0.0.1:8000/api/recurring-bookings'
                : `http://127.0.0.1:8000/api/recurring-bookings?is_active=${filter === 'active' ? 1 : 0}`

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            })

            if (!response.ok) {
                throw new Error('Failed to fetch recurring bookings')
            }

            const data = await response.json()
            if (data.success) {
                setRecurringBookings(data.data)
            }
        } catch (error) {
            console.error('Error fetching recurring bookings:', error)
            Swal.fire({
                title: 'เกิดข้อผิดพลาด',
                text: 'ไม่สามารถโหลดข้อมูลการจองซ้ำได้',
                icon: 'error',
                confirmButtonText: 'ตกลง'
            })
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: 'ยืนยันการลบ',
            text: 'คุณต้องการลบการจองซ้ำนี้หรือไม่? การจองที่ยังไม่เกิดขึ้นจะถูกยกเลิกทั้งหมด',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#EF4444',
            cancelButtonColor: '#6B7280',
            confirmButtonText: 'ลบ',
            cancelButtonText: 'ยกเลิก'
        })

        if (!result.isConfirmed) return

        try {
            const response = await fetch(`http://127.0.0.1:8000/api/recurring-bookings/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            })

            if (!response.ok) {
                throw new Error('Failed to delete')
            }

            const data = await response.json()
            if (data.success) {
                Swal.fire({
                    title: 'สำเร็จ',
                    text: 'ลบการจองซ้ำเรียบร้อยแล้ว',
                    icon: 'success',
                    confirmButtonText: 'ตกลง'
                })
                fetchRecurringBookings()
            }
        } catch (error) {
            console.error('Error deleting recurring booking:', error)
            Swal.fire({
                title: 'เกิดข้อผิดพลาด',
                text: 'ไม่สามารถลบการจองซ้ำได้',
                icon: 'error',
                confirmButtonText: 'ตกลง'
            })
        }
    }

    const toggleActive = async (id, currentStatus) => {
        try {
            const response = await fetch(`http://127.0.0.1:8000/api/recurring-bookings/${id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    is_active: !currentStatus
                })
            })

            if (!response.ok) {
                throw new Error('Failed to update')
            }

            const data = await response.json()
            if (data.success) {
                Swal.fire({
                    title: 'สำเร็จ',
                    text: currentStatus ? 'หยุดการจองซ้ำชั่วคราว' : 'เปิดการจองซ้ำอีกครั้ง',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                })
                fetchRecurringBookings()
            }
        } catch (error) {
            console.error('Error toggling recurring booking:', error)
            Swal.fire({
                title: 'เกิดข้อผิดพลาด',
                text: 'ไม่สามารถอัปเดตสถานะได้',
                icon: 'error',
                confirmButtonText: 'ตกลง'
            })
        }
    }

    const getRecurrenceText = (booking) => {
        const types = {
            daily: 'ทุกวัน',
            weekly: 'ทุกสัปดาห์',
            monthly: 'ทุกเดือน'
        }

        let text = types[booking.recurrence_type] || booking.recurrence_type

        if (booking.interval > 1) {
            text = `ทุก ${booking.interval} ${booking.recurrence_type === 'daily' ? 'วัน' : booking.recurrence_type === 'weekly' ? 'สัปดาห์' : 'เดือน'}`
        }

        if (booking.recurrence_type === 'weekly' && booking.days_of_week?.length > 0) {
            const days = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']
            const selectedDays = booking.days_of_week.map(d => days[d]).join(', ')
            text += ` (${selectedDays})`
        }

        return text
    }

    const formatDate = (dateString) => {
        const date = new Date(dateString)
        return date.toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
    }

    const formatTime = (timeString) => {
        if (!timeString) return ''
        const date = timeString.includes('T') ? new Date(timeString) : new Date(`2000-01-01T${timeString}`)
        return date.toLocaleTimeString('th-TH', {
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    if (loading && !recurringBookings.length) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Filter Tabs */}
            <div className="flex gap-2 bg-white p-2 rounded-xl shadow-sm border border-gray-200 w-fit">
                <button
                    onClick={() => setFilter('all')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${filter === 'all'
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-gray-600 hover:bg-gray-100'
                        }`}
                >
                    ทั้งหมด ({recurringBookings.length})
                </button>
                <button
                    onClick={() => setFilter('active')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${filter === 'active'
                        ? 'bg-green-600 text-white shadow-md'
                        : 'text-gray-600 hover:bg-gray-100'
                        }`}
                >
                    ใช้งานอยู่
                </button>
                <button
                    onClick={() => setFilter('inactive')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${filter === 'inactive'
                        ? 'bg-gray-600 text-white shadow-md'
                        : 'text-gray-600 hover:bg-gray-100'
                        }`}
                >
                    หยุดชั่วคราว
                </button>
            </div>

            {/* Recurring Bookings List */}
            {recurringBookings.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-lg p-12 text-center border-2 border-dashed border-gray-200">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">ไม่มีการจองซ้ำ</h3>
                    <p className="text-gray-500 mb-6 text-sm">คุณยังไม่มีการจองซ้ำในระบบ</p>
                    <button
                        onClick={() => router.push('/')}
                        className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-md hover:shadow-lg text-sm"
                    >
                        สร้างการจองใหม่
                    </button>
                </div>
            ) : (
                <div className="grid gap-6">
                    {recurringBookings.map((booking) => (
                        <div
                            key={booking.id}
                            className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all border border-gray-100 overflow-hidden"
                        >
                            <div className="p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-xl font-bold text-gray-900">{booking.room?.name}</h3>
                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${booking.is_active
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-gray-100 text-gray-700'
                                                }`}>
                                                {booking.is_active ? 'ใช้งานอยู่' : 'หยุดชั่วคราว'}
                                            </span>
                                        </div>
                                        <p className="text-gray-600 mb-3">{booking.purpose}</p>

                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div className="flex items-center text-sm text-gray-700">
                                                <svg className="w-5 h-5 text-purple-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                </svg>
                                                <span className="font-medium">{getRecurrenceText(booking)}</span>
                                            </div>

                                            <div className="flex items-center text-sm text-gray-700">
                                                <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <span className="font-medium">{formatTime(booking.start_time)} - {formatTime(booking.end_time)}</span>
                                            </div>

                                            <div className="flex items-center text-sm text-gray-700">
                                                <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                                <span>เริ่ม: {formatDate(booking.start_date)}</span>
                                            </div>

                                            {booking.end_date && (
                                                <div className="flex items-center text-sm text-gray-700">
                                                    <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                    <span>สิ้นสุด: {formatDate(booking.end_date)}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex gap-2 ml-4">
                                        <button
                                            onClick={() => toggleActive(booking.id, booking.is_active)}
                                            className={`p-2.5 rounded-lg transition-all ${booking.is_active
                                                ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                                                }`}
                                            title={booking.is_active ? 'หยุดชั่วคราว' : 'เปิดใช้งาน'}
                                        >
                                            {booking.is_active ? (
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            ) : (
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            )}
                                        </button>

                                        <button
                                            onClick={() => handleDelete(booking.id)}
                                            className="p-2.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-all"
                                            title="ลบ"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>

                                {booking.notes && (
                                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                                        <p className="text-sm text-gray-700">
                                            <span className="font-medium">หมายเหตุ:</span> {booking.notes}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
