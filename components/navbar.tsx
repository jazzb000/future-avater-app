"use client"

import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import { useTicket } from "@/contexts/ticket-context"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Ticket, User, LogOut, CreditCard, ImageIcon, Pencil } from "lucide-react"

export function Navbar() {
  const { user, signOut } = useAuth()
  const { remainingTickets } = useTicket()

  return (
    <nav className="bg-white border-b-2 border-purple-200 py-3 px-4 md:px-8">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-6">
          <Link href="/" className="flex items-center">
            <span className="text-2xl font-bold text-purple-600 font-display">미래의 나</span>
          </Link>

          <div className="hidden md:flex space-x-4">
            <Link href="/gallery" className="text-purple-600 hover:text-purple-800">
              갤러리
            </Link>
            <Link href="/doodle-to-reality" className="text-teal-600 hover:text-teal-800">
              낙서 현실화
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <>
              <div className="hidden md:flex items-center gap-2 bg-purple-100 px-3 py-1 rounded-full">
                <Ticket className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-700">티켓: {remainingTickets}개</span>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="rounded-full h-10 w-10 p-0">
                    <Avatar>
                      <AvatarFallback className="bg-purple-200 text-purple-700">
                        {user.email?.charAt(0).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="p-2">
                    <p className="text-sm font-medium">{user.email}</p>
                    <p className="text-xs text-gray-500">티켓: {remainingTickets}개</p>
                  </div>
                  <DropdownMenuSeparator />
                  <Link href="/profile">
                    <DropdownMenuItem>
                      <User className="mr-2 h-4 w-4" />
                      <span>프로필</span>
                    </DropdownMenuItem>
                  </Link>
                  <Link href="/gallery">
                    <DropdownMenuItem>
                      <ImageIcon className="mr-2 h-4 w-4" />
                      <span>갤러리</span>
                    </DropdownMenuItem>
                  </Link>
                  <Link href="/doodle-to-reality">
                    <DropdownMenuItem>
                      <Pencil className="mr-2 h-4 w-4" />
                      <span>낙서 현실화</span>
                    </DropdownMenuItem>
                  </Link>
                  <Link href="/tickets">
                    <DropdownMenuItem>
                      <CreditCard className="mr-2 h-4 w-4" />
                      <span>티켓 구매</span>
                    </DropdownMenuItem>
                  </Link>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut()}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>로그아웃</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="flex gap-2">
              <Link href="/login">
                <Button variant="outline" className="rounded-full border-2 border-purple-300 hover:bg-purple-100">
                  로그인
                </Button>
              </Link>
              <Link href="/signup">
                <Button className="rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white">
                  회원가입
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
