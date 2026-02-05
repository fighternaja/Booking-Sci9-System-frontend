'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { API_URL } from '../lib/api'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState(null)

  useEffect(() => {
    const storedToken = localStorage.getItem('token')
    const storedUser = localStorage.getItem('user')

    if (storedToken && storedUser) {
      setToken(storedToken)
      setUser(JSON.parse(storedUser))
    }
    setLoading(false)
  }, [])

  const login = async (email, password) => {
    try {
      const response = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      // Check if response is ok ตรวจสอบการตอบสนองจาก server
      if (!response.ok) {
        // ถ้าเป็น 401 หรือ 500 แสดงว่าอีเมลหรือรหัสผ่านไม่ถูกต้อง
        if (response.status === 401 || response.status === 500) {
          return { success: false, message: 'รหัสผ่านไม่ถูกต้อง' }
        }
        return { success: false, message: `HTTP Error: ${response.status}` }
      }

      // Check if response is JSON ตรวจสอบการตอบสนองจาก server
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        console.error('Non-JSON response:', text)
        return { success: false, message: 'Server returned invalid response format' }
      }

      const data = await response.json()

      if (data.success) {
        setUser(data.data.user)
        setToken(data.data.token)
        localStorage.setItem('token', data.data.token)
        localStorage.setItem('user', JSON.stringify(data.data.user))
        return { success: true }
      } else {
        return { success: false, message: data.message }
      }
    } catch (error) {
      console.error('Login error:', error)
      return { success: false, message: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ: ' + error.message }
    }
  }

  const register = async (name, email, password, password_confirmation) => {
    try {
      const response = await fetch(`${API_URL}/api/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ name, email, password, password_confirmation }),
      })

      // Check if response is ok ตรวจสอบการตอบสนองจาก server
      if (!response.ok) {
        return { success: false, message: `HTTP Error: ${response.status}` }
      }

      // Check if response is JSON ตรวจสอบการตอบสนองจาก server
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        console.error('Non-JSON response:', text)
        return { success: false, message: 'Server returned invalid response format' }
      }

      const data = await response.json()

      if (data.success) {
        setUser(data.data.user)
        setToken(data.data.token)
        localStorage.setItem('token', data.data.token)
        localStorage.setItem('user', JSON.stringify(data.data.user))
        return { success: true }
      } else {
        return { success: false, message: data.message }
      }
    } catch (error) {
      console.error('Register error:', error)
      return { success: false, message: 'เกิดข้อผิดพลาดในการสมัครสมาชิก: ' + error.message }
    }
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  const isAdmin = () => {
    return user && user.role === 'admin'
  }

  const getProfile = async () => {
    try {
      const authToken = localStorage.getItem('token')
      const response = await fetch(`${API_URL}/api/user`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
      })

      if (!response.ok) {
        return null
      }

      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        console.error('Non-JSON response:', text)
        return null
      }

      const data = await response.json()
      setUser(data)
      localStorage.setItem('user', JSON.stringify(data))
      return data
    } catch (error) {
      console.error('Get profile error:', error)
      return null
    }
  }

  //อัปเดตโปรไฟล์
  const updateProfile = async (profileData) => {
    try {
      const authToken = localStorage.getItem('token')

      // สร้าง FormData สำหรับรองรับการอัปโหลดไฟล์
      const formData = new FormData()

      if (profileData.name) formData.append('name', profileData.name)
      if (profileData.email) formData.append('email', profileData.email)
      if (profileData.phone) formData.append('phone', profileData.phone)
      if (profileData.password) formData.append('password', profileData.password)
      if (profileData.profile_picture) formData.append('profile_picture', profileData.profile_picture)

      const response = await fetch(`${API_URL}/api/user/update`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: formData,
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Error updating user: HTTP', response.status, errorText)
        return { success: false, message: `HTTP Error: ${response.status}` }
      }

      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        console.error('Non-JSON response:', text)
        return { success: false, message: 'Server returned invalid response format' }
      }

      const data = await response.json()

      if (response.ok) {
        setUser(data.user)
        localStorage.setItem('user', JSON.stringify(data.user))
        return { success: true, message: data.message || 'อัปเดตโปรไฟล์สำเร็จ' }
      } else {
        return { success: false, message: data.message || 'เกิดข้อผิดพลาดในการอัปเดตโปรไฟล์' }
      }
    } catch (error) {
      console.error('Update profile error:', error)
      return { success: false, message: 'เกิดข้อผิดพลาดในการอัปเดตโปรไฟล์: ' + error.message }
    }
  }

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    isAdmin,
    getProfile,
    updateProfile
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
