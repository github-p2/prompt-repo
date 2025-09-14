import './globals.css'
import { Inter } from 'next/font/google'
import { Providers } from '@/components/providers'
import { Toaster } from 'sonner'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Prompt Repository - Share & Discover AI Prompts',
  description: 'A gamified platform for sharing and discovering high-quality AI prompts',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          {children}
          <Toaster position="top-right" />
        </Providers>
      </body>
    </html>
  )
}