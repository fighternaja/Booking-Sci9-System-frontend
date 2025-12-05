'use client'

import moment from 'moment'
import { useEffect, useState } from 'react'
import { Calendar, momentLocalizer } from 'react-big-calendar'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import BookingModal from './BookingModal'
import './CalendarStyles.css'

// ตั้งค่า moment locale เป็นภาษาไทย
moment.locale('th')

const localizer = momentLocalizer(moment)

export default function BookingCalendar({ roomId, room }) {
  const [events, setEvents] = useState([])
  const [selectedDate, setSelectedDate] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())

  useEffect(() => {
    fetchBookings()
  }, [roomId, currentDate])

  const fetchBookings = async () => {
    try {
      setLoading(true)
      const startOfMonth = moment(currentDate).startOf('month').format('YYYY-MM-DD')
      const endOfMonth = moment(currentDate).endOf('month').format('YYYY-MM-DD')
      
      const response = await fetch(
        `http://127.0.0.1:8000/api/rooms/${roomId}/bookings?start_date=${startOfMonth}&end_date=${endOfMonth}`
      )
      const data = await response.json()
      
      if (data.success) {
        const calendarEvents = data.data.map(booking => ({
          id: booking.id,
          title: booking.purpose,
          start: new Date(booking.start_time),
          end: new Date(booking.end_time),
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
    setSelectedDate({ start, end })
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

  const CustomToolbar = ({ label, onNavigate, onView, view }) => {
    return (
      <div className="flex items-center justify-between mb-4 p-4 bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => onNavigate('PREV')}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <h2 className="text-xl font-semibold text-gray-900">{label}</h2>
          
          <button
            onClick={() => onNavigate('NEXT')}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onNavigate('TODAY')}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            วันนี้
          </button>
          
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => onView('month')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                view === 'month' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              เดือน
            </button>
            <button
              onClick={() => onView('week')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                view === 'week' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              สัปดาห์
            </button>
            <button
              onClick={() => onView('day')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                view === 'day' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              วัน
            </button>
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
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">ปฏิทินการจอง</h3>
        <p className="text-sm text-gray-600">คลิกที่ช่องว่างเพื่อจอง หรือคลิกที่การจองเพื่อดูรายละเอียด</p>
        
        {/* Legend */}
        <div className="mt-4 flex items-center space-x-6 text-sm">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
            <span className="text-gray-600">การจองในอนาคต</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-orange-500 rounded-full mr-2"></div>
            <span className="text-gray-600">การจองปัจจุบัน</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-gray-500 rounded-full mr-2"></div>
            <span className="text-gray-600">การจองที่ผ่านมา</span>
          </div>
        </div>
      </div>

      <div className="h-96">
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
          views={['month', 'week', 'day']}
          defaultView="month"
          components={{
            toolbar: CustomToolbar,
            event: CustomEvent
          }}
          eventPropGetter={eventStyleGetter}
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
