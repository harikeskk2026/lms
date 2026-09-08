import './globals.css'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/context/AuthContext'
import ChunkErrorHandler from '@/components/shared/ChunkErrorHandler'

export const metadata = {
  title: 'CareerLabs LMS',
  description: 'Launch Your IT Career — CareerLabs Learning Management System, Madurai',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ChunkErrorHandler />
        <AuthProvider>
          {children}
          <Toaster
            position="top-right"
            reverseOrder={false}
            gutter={8}
            containerStyle={{
              top: 24,
              right: 24,
              zIndex: 99999,
            }}
            toastOptions={{
              duration: 3500,
              style: {
                borderRadius: '12px',
                fontFamily: 'Plus Jakarta Sans, sans-serif',
                fontSize: '14px',
                fontWeight: '500',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
              },
              success: {
                iconTheme: { primary: '#6d28d9', secondary: '#fff' },
                style: { border: '1px solid #ede9fe' }
              },
              error: {
                iconTheme: { primary: '#ef4444', secondary: '#fff' },
                style: { border: '1px solid #fee2e2' }
              }
            }}
          />
        </AuthProvider>
      </body>
    </html>
  )
}
