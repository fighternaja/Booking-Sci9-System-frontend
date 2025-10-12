import { Inter } from 'next/font/google'
import Footer from './components/Footer'
import Navbar from './components/Navbar'
import { AuthProvider } from './contexts/AuthContext'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'ระบบจองห้อง',
  description: 'ระบบจองห้องออนไลน์',
}


export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body className={inter.className}>
        <AuthProvider>
          <Navbar />
          <main className="min-h-screen">
            {children}
          </main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  )
}