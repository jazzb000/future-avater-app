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
  title: "돌핀인캘리 AI",
  description: "AI로 상상하는 미래와 창작하는 현실을 경험해보세요",
  icons: {
    icon: "/favicon.ico",
  },
  generator: 'dolphinincali'
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
