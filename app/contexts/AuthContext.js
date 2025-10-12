'use client'

import { createContext, useContext, useEffect, useState } from 'react'

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
      const response = await fetch('http://127.0.0.1:8000/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      // Check if response is ok
      if (!response.ok) {
        return { success: false, message: `HTTP Error: ${response.status}` }
      }

      // Check if response is JSON
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
      const response = await fetch('http://127.0.0.1:8000/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ name, email, password, password_confirmation }),
      })

      // Check if response is ok
      if (!response.ok) {
        return { success: false, message: `HTTP Error: ${response.status}` }
      }

      // Check if response is JSON
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

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    isAdmin
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
