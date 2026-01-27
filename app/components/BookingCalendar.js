'use client'

import moment from 'moment'
import { useEffect, useState } from 'react'
import { Calendar, momentLocalizer } from 'react-big-calendar'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import BookingModal from './BookingModal'
import Swal from 'sweetalert2'
import './CalendarStyles.css'
import { parseDate } from '../utils/dateUtils'
import { API_URL } from '../lib/api'

// ตั้งค่า moment locale เป็นภาษาไทย
moment.locale('th')

const localizer = momentLocalizer(moment)

export default function BookingCalendar({ roomId, room, onBookingSuccess }) {
  const [events, setEvents] = useState([])
  const [selectedDate, setSelectedDate] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState('month')

  useEffect(() => {
    fetchBookings()
  }, [roomId, currentDate])

  const fetchBookings = async () => {
    try {
      setLoading(true)
      const month = moment(currentDate).format('YYYY-MM')

      const response = await fetch(
        `${API_URL}/api/rooms/${roomId}/bookings?month=${month}`,
        {
          headers: {
            'Accept': 'application/json',
          }
        }
      )

      if (!response.ok) {
        console.error('Error fetching bookings: HTTP', response.status)
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
        // กรองการจองที่ยกเลิกแล้วออกจากปฏิทิน
        const calendarEvents = data.data
          .filter(booking => booking.status !== 'cancelled' && booking.status !== 'rejected')
          .map(booking => ({
            id: booking.id,
            title: booking.purpose,
            start: parseDate(booking.start_time),
            end: parseDate(booking.end_time),
            resource: booking
          }))
        setEvents(calendarEvents)
      }
    } catch (error) {
      console.error('Error fetching bookings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectSlot = ({ start, end }) => {
    // ตรวจสอบว่าไม่ให้เลือกวันที่ในอดีต
    const now = new Date()
    const startDate = new Date(start)
    const endDate = new Date(end)

    // เปรียบเทียบเฉพาะวันที่ (ไม่รวมเวลา)
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const selectedDay = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())

    // ถ้าเลือกวันที่ในอดีต ให้แจ้งเตือนและไม่เปิด modal
    if (selectedDay < today) {
      Swal.fire({
        title: 'ไม่สามารถจองได้',
        text: 'ไม่สามารถจองวันที่ในอดีตได้ กรุณาเลือกวันที่ปัจจุบันหรืออนาคต',
        icon: 'warning',
        confirmButtonText: 'ตกลง',
        confirmButtonColor: '#3B82F6'
      })
      return
    }

    // ตรวจสอบเวลาทำการ (8:00 - 18:00)
    const startHour = startDate.getHours()
    const endHour = endDate.getHours()

    // ถ้าเลือกทั้งวัน ให้ตั้งเวลาเริ่มต้นเป็น 08:00 และสิ้นสุดเป็น 09:00
    if (startDate.getHours() === 0 && startDate.getMinutes() === 0) {
      startDate.setHours(8, 0, 0, 0)
      endDate.setHours(9, 0, 0, 0)
    } else {
      // ตรวจสอบว่าเวลาอยู่ในช่วงเวลาทำการหรือไม่
      if (startHour < 8 || startHour >= 18) {
        Swal.fire({
          title: 'อยู่นอกเวลาทำการ',
          text: 'เวลาทำการคือ 8:00 - 18:00 น. กรุณาเลือกเวลาในช่วงเวลาทำการ',
          icon: 'warning',
          confirmButtonText: 'ตกลง',
          confirmButtonColor: '#3B82F6'
        })
        return
      }
      if (endHour < 8 || endHour > 18) {
        Swal.fire({
          title: 'อยู่นอกเวลาทำการ',
          text: 'เวลาทำการคือ 8:00 - 18:00 น. กรุณาเลือกเวลาในช่วงเวลาทำการ',
          icon: 'warning',
          confirmButtonText: 'ตกลง',
          confirmButtonColor: '#3B82F6'
        })
        return
      }
    }

    setSelectedDate({ start: startDate, end: endDate })
    setShowModal(true)
  }

  const handleSelectEvent = (event) => {
    setSelectedDate({
      start: event.start,
      end: event.end,
      booking: event.resource
    })
    setShowModal(true)
  }

  const handleModalClose = () => {
    setShowModal(false)
    setSelectedDate(null)
  }

  const handleBookingSuccess = () => {
    fetchBookings()
    setShowModal(false)
    setSelectedDate(null)
    if (onBookingSuccess) {
      onBookingSuccess()
    }
  }

  const eventStyleGetter = (event) => {
    const now = new Date()
    const isPast = event.end < now
    const isCurrent = event.start <= now && event.end >= now

    let backgroundColor = '#3B82F6' // blue
    if (isPast) {
      backgroundColor = '#9CA3AF' // gray
    } else if (isCurrent) {
      backgroundColor = '#F59E0B' // orange
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: 0.8,
        color: 'white',
        border: '0px',
        display: 'block'
      }
    }
  }

  const CustomToolbar = ({ label, onNavigate, onView, view: currentView }) => {
    const handleNavigate = (action) => {
      onNavigate(action)
      if (action === 'TODAY') {
        const today = new Date()
        setCurrentDate(today)
      } else if (action === 'PREV') {
        const newDate = new Date(currentDate)
        if (currentView === 'month') {
          newDate.setMonth(newDate.getMonth() - 1)
        } else if (currentView === 'week') {
          newDate.setDate(newDate.getDate() - 7)
        } else {
          newDate.setDate(newDate.getDate() - 1)
        }
        setCurrentDate(newDate)
      } else if (action === 'NEXT') {
        const newDate = new Date(currentDate)
        if (currentView === 'month') {
          newDate.setMonth(newDate.getMonth() + 1)
        } else if (currentView === 'week') {
          newDate.setDate(newDate.getDate() + 7)
        } else {
          newDate.setDate(newDate.getDate() + 1)
        }
        setCurrentDate(newDate)
      }
    }

    const handleViewChange = (newView) => {
      onView(newView)
      setView(newView)
    }

    return (
      <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
        <div className="flex items-center space-x-4 w-full md:w-auto justify-between md:justify-start">
          <button
            onClick={() => handleNavigate('PREV')}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            type="button"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <h2 className="text-lg md:text-xl font-semibold text-gray-900 flex-1 text-center md:min-w-[200px]">{label}</h2>

          <button
            onClick={() => handleNavigate('NEXT')}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            type="button"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto justify-center">
          <button
            onClick={() => handleNavigate('TODAY')}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            type="button"
          >
            วันนี้
          </button>

          <div className="flex bg-gray-100 rounded-lg p-1 overflow-x-auto">
            {['month', 'week', 'day', 'agenda'].map((v) => (
              <button
                key={v}
                onClick={() => handleViewChange(v)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${currentView === v
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
                  }`}
                type="button"
              >
                {v === 'month' ? 'เดือน' : v === 'week' ? 'สัปดาห์' : v === 'day' ? 'วัน' : 'กำหนดการ'}
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const CustomEvent = ({ event }) => {
    const startTime = moment(event.start).format('HH:mm')
    const endTime = moment(event.end).format('HH:mm')

    return (
      <div className="text-xs">
        <div className="font-medium truncate">{event.title}</div>
        <div className="opacity-90">{startTime} - {endTime}</div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">กำลังโหลดปฏิทิน...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full">
      <div className="h-[600px] mb-4">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%' }}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          selectable
          popup
          views={['month', 'week', 'day', 'agenda']}
          view={view}
          onView={setView}
          date={currentDate}
          onNavigate={setCurrentDate}
          components={{
            toolbar: CustomToolbar,
            event: CustomEvent
          }}
          eventPropGetter={eventStyleGetter}
          dayPropGetter={(date) => {
            // Disable วันที่ในอดีต
            const today = new Date()
            const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate())
            const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate())
            const isPast = dateOnly < todayOnly

            return {
              className: isPast ? 'rbc-day-past' : '',
              style: isPast ? {
                opacity: 0.5,
                pointerEvents: 'none',
                backgroundColor: '#f3f4f6'
              } : {}
            }
          }}
          slotPropGetter={(date) => {
            // Disable ช่วงเวลาในอดีตและนอกเวลาทำการ (8:00 - 18:00)
            const now = new Date()
            const isPast = date < now
            const hour = date.getHours()
            const isOutsideBusinessHours = hour < 8 || hour >= 18

            return {
              className: (isPast || isOutsideBusinessHours) ? 'rbc-slot-past' : '',
              style: (isPast || isOutsideBusinessHours) ? {
                opacity: 0.5,
                pointerEvents: 'none',
                backgroundColor: '#f3f4f6'
              } : {}
            }
          }}
          messages={{
            next: 'ถัดไป',
            previous: 'ก่อนหน้า',
            today: 'วันนี้',
            month: 'เดือน',
            week: 'สัปดาห์',
            day: 'วัน',
            agenda: 'วาระ',
            date: 'วันที่',
            time: 'เวลา',
            event: 'เหตุการณ์',
            noEventsInRange: 'ไม่มีเหตุการณ์ในช่วงนี้',
            showMore: total => `+${total} เพิ่มเติม`
          }}
        />
      </div>

      <BookingModal
        isOpen={showModal}
        onClose={handleModalClose}
        selectedDate={selectedDate}
        room={room}
        onBookingSuccess={handleBookingSuccess}
      />
    </div>
  )
}
