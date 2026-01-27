'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import NotificationBell from './NotificationBell'

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const router = useRouter()

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleLogout = () => {
    logout()
    setIsMenuOpen(false)
  }

  const getProfileImageUrl = () => {
    if (user?.profile_picture) {
      if (user.profile_picture.startsWith('http://') || user.profile_picture.startsWith('https://')) {
        return user.profile_picture
      }
      return `http://127.0.0.1:8000/${user.profile_picture}`
    }
    return null
  }

  return (
    <nav className={`fixed w-full z-50 transition-all duration-300 ${scrolled
      ? 'bg-white/80 backdrop-blur-md shadow-lg border-b border-gray-100'
      : 'bg-white/0'
      }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20">
          <div className="flex items-center">
            <Link href="/" className="flex items-center group">
              <div className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center mr-2 md:mr-3 font-bold text-lg group-hover:scale-105 transition-all duration-300 shadow-md ${scrolled ? 'bg-gradient-to-br from-blue-600 to-indigo-600' : 'bg-white'
                }`}>
                <img src="/1729709782com2024.png" alt="Sci 9 Booking" className="w-8 h-8 md:w-10 md:h-10 object-contain" />
              </div>
              <div className="flex flex-col">
                <h1 className={`text-lg md:text-xl font-bold leading-none ${scrolled ? 'text-gray-900' : 'text-gray-800'
                  }`}>
                  Sci 9 Booking
                </h1>
                <span className={`text-[10px] md:text-xs font-medium tracking-wider ${scrolled ? 'text-blue-600' : 'text-blue-500'
                  }`}>
                  COMPUTER SCIENCE
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-1">
            {[
              { name: 'หน้าหลัก', href: '/' },
              { name: 'ห้องทั้งหมด', href: '/rooms' },
              ...(user ? [{ name: 'การจองของฉัน', href: '/my-bookings' }] : []),
              { name: 'เกี่ยวกับอาคาร', href: '/about' },
              ...(isAdmin() ? [{ name: 'Admin Dashboard', href: '/admin' }] : [])
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${scrolled
                  ? 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                  : 'text-gray-700 hover:text-blue-600 hover:bg-white/50'
                  }`}
              >
                {item.name}
              </Link>
            ))}
          </div>

          <div className="flex items-center space-x-3">
            {user ? (
              <>
                <div className={`rounded-full transition-colors ${scrolled ? 'hover:bg-gray-100' : 'hover:bg-white/50'}`}>
                  <NotificationBell />
                </div>

                <div className="relative">
                  <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className={`flex items-center space-x-2 p-1.5 rounded-full transition-all duration-300 border-2 ${scrolled
                      ? 'border-transparent hover:border-blue-100 bg-gray-50 hover:bg-blue-50'
                      : 'border-transparent hover:border-white/50 bg-white/50 hover:bg-white/80'
                      }`}
                  >
                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center overflow-hidden shadow-inner font-bold text-blue-600">
                      {getProfileImageUrl() ? (
                        <img
                          src={getProfileImageUrl()}
                          alt={user.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        user.name?.charAt(0).toUpperCase()
                      )}
                    </div>
                    <span className={`hidden md:block text-sm font-medium pr-2 max-w-[100px] truncate ${scrolled ? 'text-gray-700' : 'text-gray-800'
                      }`}>
                      {user.name}
                    </span>
                    <svg className={`w-4 h-4 transition-transform duration-200 ${isMenuOpen ? 'rotate-180' : ''} ${scrolled ? 'text-gray-400' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isMenuOpen && (
                    <div className="absolute right-0 mt-3 w-56 rounded-2xl shadow-xl py-2 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50 transform origin-top-right animate-scaleIn">
                      <div className="px-4 py-3 text-sm border-b border-gray-100 bg-gray-50/50">
                        <p className="font-semibold text-gray-900">{user.name}</p>
                        <p className="text-gray-500 text-xs mt-0.5 truncate">{user.email}</p>
                      </div>

                      <div className="p-1">
                        <Link
                          href="/profile"
                          onClick={() => setIsMenuOpen(false)}
                          className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-colors group"
                        >
                          <svg className="w-5 h-5 mr-3 text-gray-400 group-hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          โปรไฟล์
                        </Link>

                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors group"
                        >
                          <svg className="w-5 h-5 mr-3 text-gray-400 group-hover:text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          ออกจากระบบ
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  href="/login"
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-all duration-300"
                >
                  เข้าสู่ระบบ
                </Link>
                <Link
                  href="/register"
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg transition-all duration-300"
                >
                  สมัครสมาชิก
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={`p-2 rounded-xl transition-all duration-300 ${scrolled
                  ? 'text-gray-600 hover:bg-gray-100'
                  : 'text-gray-800 hover:bg-white/50'
                  }`}
              >
                <span className="sr-only">Open main menu</span>
                {isMenuOpen ? (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`md:hidden overflow-hidden transition-all duration-300 ${isMenuOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="px-4 pt-2 pb-6 bg-white/95 backdrop-blur-xl border-t border-gray-100 shadow-xl space-y-1">
          {[
            { name: 'หน้าหลัก', href: '/' },
            { name: 'ห้องทั้งหมด', href: '/rooms' },
            ...(user ? [{ name: 'การจองของฉัน', href: '/my-bookings' }] : []),
            { name: 'เกี่ยวกับอาคาร', href: '/about' },
            ...(isAdmin() ? [{ name: 'Admin Dashboard', href: '/admin' }] : [])
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsMenuOpen(false)}
              className="block px-4 py-3 rounded-xl text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            >
              {item.name}
            </Link>
          ))}

          {!user && (
            <div className="grid grid-cols-2 gap-3 p-2 mt-4">
              <Link href="/login" onClick={() => setIsMenuOpen(false)} className="flex items-center justify-center px-4 py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50">
                เข้าสู่ระบบ
              </Link>
              <Link href="/register" onClick={() => setIsMenuOpen(false)} className="flex items-center justify-center px-4 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 shadow-md">
                สมัครสมาชิก
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
