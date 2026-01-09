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
        `http://127.0.0.1:8000/api/rooms/${roomId}/bookings?month=${month}`
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
    // ตั้งค่าเวลาเริ่มต้นและสิ้นสุดเริ่มต้น
    const startDate = new Date(start)
    const endDate = new Date(end)
    
    // ถ้าเลือกทั้งวัน ให้ตั้งเวลาเริ่มต้นเป็น 09:00 และสิ้นสุดเป็น 10:00
    if (startDate.getHours() === 0 && startDate.getMinutes() === 0) {
      startDate.setHours(9, 0, 0, 0)
      endDate.setHours(10, 0, 0, 0)
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
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => handleNavigate('PREV')}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            type="button"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <h2 className="text-xl font-semibold text-gray-900 min-w-[200px] text-center">{label}</h2>
          
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
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleNavigate('TODAY')}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            type="button"
          >
            วันนี้
          </button>
          
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => handleViewChange('month')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                currentView === 'month' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              type="button"
            >
              เดือน
            </button>
            <button
              onClick={() => handleViewChange('week')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                currentView === 'week' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              type="button"
            >
              สัปดาห์
            </button>
            <button
              onClick={() => handleViewChange('day')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                currentView === 'day' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              type="button"
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
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-6">จองห้องประชุม</h3>
      </div>

      <div className="h-[600px] mb-6">
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
          view={view}
          onView={setView}
          date={currentDate}
          onNavigate={setCurrentDate}
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

      {/* Legend */}
      <div className="flex items-center gap-6 pt-4 border-t border-gray-200">
        <div className="flex items-center">
          <div className="w-4 h-4 bg-blue-500 rounded-full mr-2"></div>
          <span className="text-sm text-gray-700">มีการจอง</span>
        </div>
        <div className="flex items-center">
          <input 
            type="checkbox" 
            id="today-filter"
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mr-2 cursor-pointer"
            onChange={(e) => {
              if (e.target.checked) {
                const today = new Date()
                setCurrentDate(today)
                setView('month')
              }
            }}
          />
          <label htmlFor="today-filter" className="text-sm text-gray-700 cursor-pointer">วันนี้</label>
        </div>
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
