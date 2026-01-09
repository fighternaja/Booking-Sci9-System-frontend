'use client'

import { GoogleOAuthProvider } from '@react-oauth/google'
import { Inter } from 'next/font/google'
import Footer from './components/Footer'
import Navbar from './components/Navbar'
import { AuthProvider } from './contexts/AuthContext'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({ children }) {
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''

  // Only wrap with GoogleOAuthProvider if clientId is provided
  const content = (
    <AuthProvider>
      <Navbar />
      <main className="min-h-screen">
        {children}
      </main>
      <Footer />
    </AuthProvider>
  )

  return (
    <html lang="th">
      <body className={inter.className}>
        {googleClientId ? (
          <GoogleOAuthProvider clientId={googleClientId}>
            {content}
          </GoogleOAuthProvider>
        ) : (
          content
        )}
      </body>
    </html>
  )
}