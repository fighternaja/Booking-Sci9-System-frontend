'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const router = useRouter()

  const handleLogout = () => {
    logout()
    setIsMenuOpen(false)
  }

  const getProfileImageUrl = () => {
    if (user?.profile_picture) {
      return `http://127.0.0.1:8000/${user.profile_picture}`
    }
    return null
  }

  return (

      <nav className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 shadow-lg border-b border-blue-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="flex items-center group">
                <div className="bg-white text-white w-12 h-12 rounded-full flex items-center justify-center mr-3 font-bold text-lg group-hover:scale-110 transition-transform duration-300 shadow-lg">
                  <img src="/1729709782com2024.png" alt="Sci 9 Booking" className="w-12 h-12" />
                </div>
                <h1 className="text-xl font-bold text-white group-hover:text-blue-100 transition-colors">Sci 9 Booking</h1>
              </Link>
            </div>

            <div className="hidden md:flex items-center space-x-8">
              <Link href="/" className="text-white/90 hover:text-white font-medium transition-colors hover:bg-white/10 px-3 py-2 rounded-lg">
                หน้าหลัก
              </Link>
              <Link href="/rooms" className="text-white/90 hover:text-white font-medium transition-colors hover:bg-white/10 px-3 py-2 rounded-lg">
                ห้องทั้งหมด
              </Link>
              {user && (
                <Link href="/my-bookings" className="text-white/90 hover:text-white font-medium transition-colors hover:bg-white/10 px-3 py-2 rounded-lg">
                  การจองของฉัน
                </Link>
              )}
              <Link href="/about" className="text-white/90 hover:text-white font-medium transition-colors hover:bg-white/10 px-3 py-2 rounded-lg">
                เกี่ยวกับอาคาร
              </Link>
              {isAdmin() && (
                <Link href="/admin" className="text-white/90 hover:text-white font-medium transition-colors hover:bg-white/10 px-3 py-2 rounded-lg">
                  Admin Dashboard
                </Link>
              )}
            </div>

            <div className="flex items-center">
              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white/50 bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-all duration-300 p-2"
                  >
                    <span className="sr-only">Open user menu</span>
                    <div className="h-8 w-8 rounded-full bg-white/30 flex items-center justify-center overflow-hidden">
                      {getProfileImageUrl() ? (
                        <img 
                          src={getProfileImageUrl()} 
                          alt={user.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-white text-sm font-medium">
                          {user.name?.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                  </button>

                  {isMenuOpen && (
                    <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-lg shadow-xl py-1 bg-white/95 backdrop-blur-sm ring-1 ring-white/20 focus:outline-none z-50">
                      <div className="px-4 py-2 text-sm text-gray-700 border-b border-gray-200">
                        <p className="font-medium">{user.name}</p>
                        <p className="text-gray-500">{user.email}</p>
                      </div>
                      <Link
                        href="/porfile"
                        onClick={() => setIsMenuOpen(false)}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                      >
                        โปรไฟล์
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors"
                      >
                        ออกจากระบบ
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center space-x-4">
                  <Link
                    href="/login"
                    className="bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-white/30 transition-all duration-300 shadow-lg hover:shadow-xl"
                  >
                    Login
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile menu button มือถือ */}
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-white hover:text-blue-100 focus:outline-none focus:text-blue-100 bg-white/20 backdrop-blur-sm hover:bg-white/30 rounded-lg p-2 transition-all duration-300"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile menu มือถือ */}
          {isMenuOpen && (
            <div className="md:hidden bg-white/95 backdrop-blur-sm rounded-lg mx-4 mt-2 shadow-xl">
              <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                <Link href="/" className="text-gray-700 hover:text-blue-600 hover:bg-blue-50 block px-3 py-2 rounded-md text-base font-medium transition-colors">
                  หน้าหลัก
                </Link>
                <Link href="/rooms" className="text-gray-700 hover:text-blue-600 hover:bg-blue-50 block px-3 py-2 rounded-md text-base font-medium transition-colors">
                  ห้องทั้งหมด
                </Link>
                {user && (
                  <Link href="/my-bookings" className="text-gray-700 hover:text-blue-600 hover:bg-blue-50 block px-3 py-2 rounded-md text-base font-medium transition-colors">
                    การจองของฉัน
                  </Link>
                )}
                <Link href="/about" className="text-gray-700 hover:text-blue-600 hover:bg-blue-50 block px-3 py-2 rounded-md text-base font-medium transition-colors">
                  เกี่ยวกับอาคาร
                </Link>
                {isAdmin() && (
                  <Link href="/admin" className="text-gray-700 hover:text-blue-600 hover:bg-blue-50 block px-3 py-2 rounded-md text-base font-medium transition-colors">
                    Admin Dashboard
                  </Link>
                )}

                {/* โปรไฟล์ */}
                {user && ( 
                  <>
                    <Link 
                      href="/porfile" 
                      onClick={() => setIsMenuOpen(false)}
                      className="text-gray-700 hover:text-blue-600 hover:bg-blue-50 block px-3 py-2 rounded-md text-base font-medium transition-colors"
                    >
                      โปรไฟล์
                    </Link>
                    <button
                      onClick={() => {
                        handleLogout()
                        setIsMenuOpen(false)
                      }}
                      className="w-full text-left text-gray-700 hover:text-red-600 hover:bg-red-50 block px-3 py-2 rounded-md text-base font-medium transition-colors"
                    >
                      ออกจากระบบ
                    </button>
                  </>
                )}
                
                {/* Login */}
                {!user && (
                  <Link href="/login" className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:from-blue-700 hover:to-indigo-700 block transition-all duration-300 shadow-lg">
                    Login
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>

  )
}
