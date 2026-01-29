export default function Footer() {
  return (
    <footer className="bg-gray-50 pt-16 pb-12 border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8 mb-12">
          {/* Brand Section */}
          <div className="md:col-span-2">
            <div className="flex items-center mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center mr-3 shadow-md">
                <img src="/1729709782com2024.png" alt="Sci 9 Booking" className="w-8 h-8 object-contain" />
              </div>
              <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-700">Sci 9 Booking</h3>
            </div>
            <p className="text-gray-600 leading-relaxed mb-6 max-w-sm">
              ระบบจองห้องออนไลน์ที่ทันสมัย สะดวก และรวดเร็ว
              สำหรับนักศึกษาและบุคลากร ภาควิชาคอมพิวเตอร์
              มหาวิทยาลัยราชภัฏเชียงใหม่
            </p>

          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-bold text-gray-900 mb-6">เมนูลัด</h4>
            <ul className="space-y-4">
              <li>
                <a href="/" className="text-gray-600 hover:text-blue-600 transition-colors inline-block transform hover:translate-x-1">หน้าหลัก</a>
              </li>
              <li>
                <a href="/rooms" className="text-gray-600 hover:text-blue-600 transition-colors inline-block transform hover:translate-x-1">ห้องทั้งหมด</a>
              </li>
              <li>
                <a href="/about" className="text-gray-600 hover:text-blue-600 transition-colors inline-block transform hover:translate-x-1">เกี่ยวกับอาคาร</a>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-lg font-bold text-gray-900 mb-6">ติดต่อเรา</h4>
            <ul className="space-y-4">
              <li className="flex items-start text-gray-600 group">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mr-3 mt-0.5 group-hover:bg-blue-600 group-hover:text-white transition-all">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                {/*<span>053-885-400</span>*/}
              </li>
              <li className="flex items-start text-gray-600 group">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mr-3 mt-0.5 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0M3.6 9h16.8M3.6 15h16.8M11.5 3a17 17 0 0 0 0 18M12.5 3a17 17 0 0 1 0 18" />
                  </svg>
                </div>
                <span><a href="https://www.computer.cmru.ac.th/" className="hover:text-indigo-600">https://www.computer.cmru.ac.th/</a></span>
              </li>
              <li className="flex items-start text-gray-600 group">
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mr-3 mt-0.5 group-hover:bg-purple-600 group-hover:text-white transition-all">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <span>180 หมู่ 7 ถนนโชตนา (เชียงใหม่-ฝาง) ตำบลขี้เหล็ก อำเภอแม่ริม จังหวัดเชียงใหม่ 50180</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-500 text-sm mb-4 md:mb-0">

          </p>
          {/*<div className="flex space-x-6">
            <a href="#" className="text-gray-500 hover:text-blue-600 text-sm transition-colors">Privacy Policy</a>
            <a href="#" className="text-gray-500 hover:text-blue-600 text-sm transition-colors">Terms of Service</a>
          </div>*/}
        </div>
      </div>
    </footer>
  )
}