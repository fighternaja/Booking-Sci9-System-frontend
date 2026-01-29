export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">

        {/* Header Section */}
        <div className="text-center mb-16 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-blue-400 rounded-full blur-3xl opacity-20 animate-pulse"></div>
          <h1 className="relative text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 mb-6 tracking-tight">
            เกี่ยวกับอาคาร
          </h1>
          <p className="relative text-gray-500 text-lg max-w-2xl mx-auto font-medium">
            ศูนย์กลางการเรียนรู้และนวัตกรรมดิจิทัล ภาควิชาคอมพิวเตอร์<br />
            มหาวิทยาลัยราชภัฏเชียงใหม่
          </p>
        </div>

        {/* Contact Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {/* Phone Card */}
          <div className="group bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-white/50 hover:-translate-y-2">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-blue-500/30 shadow-lg group-hover:scale-110 transition-transform duration-300">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3 text-center">โทรศัพท์</h3>
            <p className="text-gray-500 text-center font-medium">-</p>
          </div>

          {/* Email Card */}
          <div className="group bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-white/50 hover:-translate-y-2">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-emerald-500/30 shadow-lg group-hover:scale-110 transition-transform duration-300">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3 text-center">เว็บไซต์</h3>
            <div className="text-center">
              <a href="https://www.computer.cmru.ac.th/" target="_blank" rel="noopener noreferrer" className="text-gray-500 font-medium hover:text-blue-600 transition-colors break-words">
                computer.cmru.ac.th
              </a>
            </div>
          </div>

          {/* Address Card */}
          <div className="group bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-white/50 hover:-translate-y-2">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-indigo-500/30 shadow-lg group-hover:scale-110 transition-transform duration-300">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3 text-center">ที่อยู่</h3>
            <p className="text-gray-500 text-center font-medium leading-relaxed">
              180 หมู่ 7 ถนนโชตนา (เชียงใหม่-ฝาง)<br />
              ต.ขี้เหล็ก อ.แม่ริม จ.เชียงใหม่ 50180
            </p>
          </div>
        </div>

        {/* Business Hours Section */}
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 flex flex-col md:flex-row">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 text-white flex flex-col justify-center items-center md:w-1/3 text-center">
              <svg className="w-12 h-12 mb-4 opacity-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-xl font-bold">เวลาทำการ</h3>
              <p className="text-blue-100 text-sm mt-2">เปิดให้บริการสำหรับ<br />นักศึกษาและบุคลากร</p>
            </div>

            <div className="p-8 flex-1 flex flex-col justify-center bg-white">
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="font-semibold text-gray-700">จันทร์ - ศุกร์</span>
                  </div>
                  <span className="font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full text-sm">08:00 - 18:00</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-red-400"></div>
                    <span className="font-semibold text-gray-700">เสาร์ - อาทิตย์</span>
                  </div>
                  <span className="font-bold text-gray-400 bg-gray-50 px-3 py-1 rounded-full text-sm">ปิดทำการ</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

