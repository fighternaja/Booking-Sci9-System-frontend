'use client'

import { useState } from 'react'
import Swal from 'sweetalert2'

export default function AttendeesList({ bookingId, attendees, token, onUpdate }) {
    const [loading, setLoading] = useState({})

    const getStatusBadge = (status) => {
        const badges = {
            pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'รอตอบรับ' },
            accepted: { bg: 'bg-green-100', text: 'text-green-700', label: 'ยอมรับ' },
            declined: { bg: 'bg-red-100', text: 'text-red-700', label: 'ปฏิเสธ' },
            attended: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'เข้าร่วมแล้ว' }
        }
        const badge = badges[status] || badges.pending
        return (
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badge.bg} ${badge.text}`}>
                {badge.label}
            </span>
        )
    }

    const handleResendInvitation = async (attendeeId) => {
        setLoading({ ...loading, [attendeeId]: true })
        try {
            const response = await fetch(`http://127.0.0.1:8000/api/attendees/${attendeeId}/send-invitation`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            })

            if (!response.ok) {
                throw new Error('Failed to resend invitation')
            }

            const data = await response.json()
            if (data.success) {
                Swal.fire({
                    title: 'สำเร็จ',
                    text: 'ส่งคำเชิญอีกครั้งเรียบร้อยแล้ว',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                })
            }
        } catch (error) {
            console.error('Error resending invitation:', error)
            Swal.fire({
                title: 'เกิดข้อผิดพลาด',
                text: 'ไม่สามารถส่งคำเชิญได้',
                icon: 'error',
                confirmButtonText: 'ตกลง'
            })
        } finally {
            setLoading({ ...loading, [attendeeId]: false })
        }
    }

    const handleRemoveAttendee = async (attendeeId) => {
        const result = await Swal.fire({
            title: 'ยืนยันการลบ',
            text: 'คุณต้องการลบผู้เข้าร่วมคนนี้หรือไม่?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#EF4444',
            cancelButtonColor: '#6B7280',
            confirmButtonText: 'ลบ',
            cancelButtonText: 'ยกเลิก'
        })

        if (!result.isConfirmed) return

        try {
            const response = await fetch(`http://127.0.0.1:8000/api/bookings/${bookingId}/attendees/${attendeeId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            })

            if (!response.ok) {
                throw new Error('Failed to remove attendee')
            }

            const data = await response.json()
            if (data.success) {
                Swal.fire({
                    title: 'สำเร็จ',
                    text: 'ลบผู้เข้าร่วมเรียบร้อยแล้ว',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                })
                if (onUpdate) onUpdate()
            }
        } catch (error) {
            console.error('Error removing attendee:', error)
            Swal.fire({
                title: 'เกิดข้อผิดพลาด',
                text: 'ไม่สามารถลบผู้เข้าร่วมได้',
                icon: 'error',
                confirmButtonText: 'ตกลง'
            })
        }
    }

    const handleCheckin = async (attendeeId) => {
        try {
            const response = await fetch(`http://127.0.0.1:8000/api/attendees/${attendeeId}/checkin`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            })

            if (!response.ok) {
                throw new Error('Failed to check-in')
            }

            const data = await response.json()
            if (data.success) {
                Swal.fire({
                    title: 'สำเร็จ',
                    text: 'เช็คอินผู้เข้าร่วมเรียบร้อยแล้ว',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                })
                if (onUpdate) onUpdate()
            }
        } catch (error) {
            console.error('Error checking in attendee:', error)
            Swal.fire({
                title: 'เกิดข้อผิดพลาด',
                text: 'ไม่สามารถเช็คอินได้',
                icon: 'error',
                confirmButtonText: 'ตกลง'
            })
        }
    }

    if (!attendees || attendees.length === 0) {
        return (
            <div className="bg-gray-50 rounded-xl p-6 text-center">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <p className="text-gray-600 text-sm">ไม่มีผู้เข้าร่วม</p>
            </div>
        )
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-900 flex items-center">
                    <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    ผู้เข้าร่วม ({attendees.length})
                </h4>
            </div>

            {attendees.map((attendee) => (
                <div
                    key={attendee.id}
                    className="bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-blue-300 transition-all"
                >
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <p className="font-semibold text-gray-900">
                                    {attendee.display_name || attendee.name || attendee.email_address || attendee.email}
                                </p>
                                {getStatusBadge(attendee.status)}
                                {attendee.is_required && (
                                    <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs font-medium">
                                        จำเป็น
                                    </span>
                                )}
                            </div>
                            <p className="text-sm text-gray-600">
                                {attendee.email_address || attendee.email}
                            </p>
                            {attendee.responded_at && (
                                <p className="text-xs text-gray-500 mt-1">
                                    ตอบรับเมื่อ: {new Date(attendee.responded_at).toLocaleDateString('th-TH')}
                                </p>
                            )}
                        </div>

                        <div className="flex gap-2 ml-4">
                            {attendee.status === 'pending' && (
                                <button
                                    onClick={() => handleResendInvitation(attendee.id)}
                                    disabled={loading[attendee.id]}
                                    className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-all disabled:opacity-50"
                                    title="ส่งคำเชิญอีกครั้ง"
                                >
                                    {loading[attendee.id] ? (
                                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
                                    ) : (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                    )}
                                </button>
                            )}

                            {attendee.status === 'accepted' && attendee.status !== 'attended' && (
                                <button
                                    onClick={() => handleCheckin(attendee.id)}
                                    className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-all"
                                    title="เช็คอิน"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </button>
                            )}

                            <button
                                onClick={() => handleRemoveAttendee(attendee.id)}
                                className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-all"
                                title="ลบ"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}
