import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Gaegu } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/contexts/auth-context"
import { TicketProvider } from "@/contexts/ticket-context"
import { Navbar } from "@/components/navbar"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ["latin"] })
const gaegu = Gaegu({ weight: ["400", "700"], subsets: ["latin"], variable: "--font-display" })

export const metadata: Metadata = {
  title: "Future Avatar",
  description: "AI로 생성하는 미래의 나",
  icons: {
    icon: "/favicon.ico",
  },
  generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko">
      <body className={`${inter.className} ${gaegu.variable}`}>
          <AuthProvider>
            <TicketProvider>
              <Navbar />
              {children}
            </TicketProvider>
          </AuthProvider>
      </body>
    </html>
  )
}
