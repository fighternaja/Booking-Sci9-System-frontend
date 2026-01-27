export const parseDate = (date) => {
  if (!date) return null
  if (date instanceof Date) {
    if (isNaN(date.getTime())) return null
    return date
  }
  let dateStr = String(date).trim()
  if (dateStr.includes(' ') && !dateStr.includes('T')) {
    dateStr = dateStr.replace(' ', 'T')
  }
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return null
  return d
}

// Format date to YYYY-MM-DD HH:mm:ss (Local) for Backend
export const formatDateForBackend = (date) => {
  if (!date) return ''
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hour = String(d.getHours()).padStart(2, '0')
  const minute = String(d.getMinutes()).padStart(2, '0')
  const second = String(d.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`
}

// Format date from YYYY-MM-DD to DD/MM/YYYY
export const formatDateToDDMMYYYY = (dateString) => {
  if (!dateString) return ''
  const [year, month, day] = dateString.split('-')
  return `${day}/${month}/${year}`
}

// Convert DD/MM/YYYY to YYYY-MM-DD
export const convertDDMMYYYYToISO = (dateString) => {
  if (!dateString) return ''
  const [day, month, year] = dateString.split('/')
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

// Format date to Thai format (DD/MM/YYYY)
export const formatDateToThai = (date) => {
  const d = parseDate(date)
  if (!d) return ''
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

// จัดรูปแบบวันที่และเวลาให้อยู่ในรูปแบบไทย (วัน/เดือน/ปี พ.ศ. ชั่วโมง:นาที)
export const formatDateTimeToThai = (date) => {
  const d = parseDate(date)
  if (!d) return '-'
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear() + 543 // แปลงเป็น พ.ศ.
  const hour = String(d.getHours()).padStart(2, '0')
  const minute = String(d.getMinutes()).padStart(2, '0')
  return `${day}/${month}/${year} ${hour}:${minute} น.`
}

// แยกวันที่และเวลา - คืนค่าเป็น object { date, time }
export const splitDateTimeToThai = (date) => {
  const d = parseDate(date)
  if (!d) return { date: '', time: '' }
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear() + 543 // แปลงเป็น พ.ศ.
  const hour = String(d.getHours()).padStart(2, '0')
  const minute = String(d.getMinutes()).padStart(2, '0')
  return {
    date: `${day}/${month}/${year}`,
    time: `${hour}:${minute} น.`
  }
}

// จัดรูปแบบวันที่และเวลาให้อยู่ในรูปแบบไทยพร้อมชื่อเดือน
export const formatDateTimeToThaiFull = (date) => {
  const d = parseDate(date)
  if (!d) return ''
  const thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ]
  const day = d.getDate()
  const month = thaiMonths[d.getMonth()]
  const year = d.getFullYear() + 543 // แปลงเป็น พ.ศ.
  const hour = String(d.getHours()).padStart(2, '0')
  const minute = String(d.getMinutes()).padStart(2, '0')
  return `${day} ${month} ${year} ${hour}:${minute} น.`
}

// จัดรูปแบบวันที่เป็นรูปแบบไทย (วัน/เดือน/ปี พ.ศ.)
export const formatDateToThaiShort = (date) => {
  const d = parseDate(date)
  if (!d) return '-'
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear() + 543 // แปลงเป็น พ.ศ.
  return `${day}/${month}/${year}`
}

// จัดรูปแบบวันที่พร้อมชื่อเดือนย่อ (วัน เดือนย่อ ปี พ.ศ.)
export const formatDateToThaiWithShortMonth = (date) => {
  const d = parseDate(date)
  if (!d) return ''
  const thaiMonthsShort = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
  ]
  const day = d.getDate()
  const month = thaiMonthsShort[d.getMonth()]
  const year = d.getFullYear() + 543 // แปลงเป็น พ.ศ.
  return `${day} ${month} ${year}`
}

// จัดรูปแบบวันที่พร้อมชื่อวันย่อ (วันย่อ วัน/เดือน/ปี พ.ศ.)
export const formatDateToThaiWithDay = (date) => {
  const d = parseDate(date)
  if (!d) return ''
  const thaiDays = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']
  const thaiMonthsShort = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
  ]
  const dayName = thaiDays[d.getDay()]
  const day = d.getDate()
  const month = thaiMonthsShort[d.getMonth()]
  const year = d.getFullYear() + 543 // แปลงเป็น พ.ศ.
  return `${dayName} ${day} ${month} ${year}`
}

// การดึงวันที่ปัจจุบันในรูปแบบ DD/MM/YYYY
export const getCurrentDateDDMMYYYY = () => {
  const today = new Date()
  const day = String(today.getDate()).padStart(2, '0')
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const year = today.getFullYear()
  return `${day}/${month}/${year}`
}

export const getCurrentDateISO = () => {
  return new Date().toISOString().split('T')[0]
}

// การแปลงวันที่จากรูปแบบ YYYY-MM-DDTHH:MM → DD/MM/YYYY HH:MM
export const formatDateTimeToDDMMYYYY = (dateTimeString) => {
  if (!dateTimeString) return ''
  const [datePart, timePart] = dateTimeString.split('T')
  const [year, month, day] = datePart.split('-')
  const [hour, minute] = timePart.split(':')
  return `${day}/${month}/${year} ${hour}:${minute}`
}

// การแปลงวันที่จากรูปแบบ DD/MM/YYYY HH:MM → YYYY-MM-DDTHH:MM
export const convertDDMMYYYYToISOWithTime = (dateTimeString) => {
  if (!dateTimeString) return ''
  const [datePart, timePart] = dateTimeString.split(' ')
  if (!datePart || !timePart) return ''

  const [day, month, year] = datePart.split('/')
  const [hour, minute] = timePart.split(':')

  if (!day || !month || !year || !hour || !minute) return ''

  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`
}
