'use client'

import { Inter } from 'next/font/google'
import Footer from './components/Footer'
import Navbar from './components/Navbar'
import { AuthProvider } from './contexts/AuthContext'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

import { usePathname } from 'next/navigation'

export default function RootLayout({ children }) {
  const pathname = usePathname()
  const isAdminPage = pathname?.startsWith('/admin')

  return (
    <html lang="th">
      <body className={inter.className}>
        <AuthProvider>
          <Navbar />
          <main className="min-h-screen">
            {children}
          </main>
          {!isAdminPage && <Footer />}
        </AuthProvider>
      </body>
    </html>
  )
}