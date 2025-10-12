export default function Footer() {
    return (
        <footer className="bg-gradient-to-r from-gray-800 via-blue-900 to-indigo-900 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <div className="text-3xl mr-3">🏢</div>
                <h3 className="text-2xl font-bold text-white">Sci 9 Booking</h3>
              </div>
              <p className="text-blue-100 leading-relaxed">
                ระบบจองห้องออนไลน์สำหรับอาคาร Sci 9 คณะวิทยาศาสตร์และเทคโนโลยี มหาวิทยาลัยราชภัฏเชียงใหม่
              </p>
              <div className="mt-4 flex space-x-4">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center hover:bg-blue-500 transition-colors cursor-pointer">
                  <span className="text-white text-lg">📧</span>
                </div>
                <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center hover:bg-indigo-500 transition-colors cursor-pointer">
                  <span className="text-white text-lg">📱</span>
                </div>
                <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center hover:bg-purple-500 transition-colors cursor-pointer">
                  <span className="text-white text-lg">🌐</span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="text-xl font-bold text-white mb-6 flex items-center">
                <span className="mr-2">📞</span>
                ติดต่อเรา
              </h4>
              <ul className="space-y-3">
                <li className="text-blue-100 hover:text-white transition-colors cursor-pointer flex items-center">
                  <span className="mr-2">📧 </span>
                  www.computer.cmru.ac.th
                </li>
                <li className="text-blue-100 hover:text-white transition-colors cursor-pointer flex items-center">
                  <span className="mr-2">📱</span>
                  -
                </li>
                <li className="text-blue-100 hover:text-white transition-colors cursor-pointer flex items-center">
                  <span className="mr-2">🕒</span>
                  จันทร์-ศุกร์ 8:00-17:00
                </li>
                <li className="text-blue-100 hover:text-white transition-colors cursor-pointer flex items-center">
                  <span className="mr-2">📍</span>
                  อาคาร Sci 9 ภาควิชาคอมพิวเตอร์
                </li>
              </ul>
            </div>
          </div>
          {/**<div className="border-t border-blue-700 mt-12 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <p className="text-blue-200 text-sm">
                © 2025 Sci 9 Booking System. All rights reserved.
              </p>
              <div className="flex space-x-6 mt-4 md:mt-0">
                <span className="text-blue-200 text-sm hover:text-white cursor-pointer">Privacy Policy</span>
                <span className="text-blue-200 text-sm hover:text-white cursor-pointer">Terms of Service</span>
                <span className="text-blue-200 text-sm hover:text-white cursor-pointer">Help Center</span>
              </div>
            </div>
          </div>**/}
        </div>
      </footer>
    )
}