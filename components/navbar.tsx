"use client"

import Link from "next/link"
import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useTicket } from "@/contexts/ticket-context"
import { forceClearSession } from "@/lib/auth-utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Ticket, User, LogOut, CreditCard, ImageIcon, Pencil, Menu, Sparkles, Bug } from "lucide-react"

export function Navbar() {
  const { user, signOut } = useAuth()
  const { remainingTickets } = useTicket()
  const [isOpen, setIsOpen] = useState(false)

  const handleMobileMenuClose = () => {
    setIsOpen(false)
  }

  return (
    <nav className="bg-white border-b-2 border-purple-200 py-3 px-4 md:px-8">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-6">
          <Link href="/" className="flex items-center">
            <span className="text-2xl font-bold text-purple-600 font-display">돌핀인캘리 AI</span>
          </Link>

          <div className="hidden md:flex space-x-4">
            <Link href="/future-me" className="text-purple-600 hover:text-purple-800">
              시간버스
            </Link>
            <Link href="/doodle-to-reality" className="text-teal-600 hover:text-teal-800">
              낙서 현실화
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* 데스크톱 버전 */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <>
                <div className="flex items-center gap-2 bg-purple-100 px-3 py-1 rounded-full">
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
                    <Link href="/future-me">
                      <DropdownMenuItem>
                        <Sparkles className="mr-2 h-4 w-4" />
                        <span>시간버스</span>
                      </DropdownMenuItem>
                    </Link>
                    <Link href="/doodle-to-reality">
                      <DropdownMenuItem>
                        <Pencil className="mr-2 h-4 w-4" />
                        <span>낙서 현실화</span>
                      </DropdownMenuItem>
                    </Link>
                    <DropdownMenuItem disabled className="cursor-not-allowed opacity-50">
                      <CreditCard className="mr-2 h-4 w-4" />
                      <span>티켓 구매 (준비중)</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {/* 개발 환경에서만 표시되는 디버깅 메뉴 */}
                    {process.env.NODE_ENV === 'development' && (
                      <DropdownMenuItem onClick={() => {
                        console.log("🐛 강제 세션 정리 실행")
                        forceClearSession()
                      }}>
                        <Bug className="mr-2 h-4 w-4" />
                        <span>강제 세션 정리 (개발용)</span>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={async () => {
                      try {
                        console.log("🔄 네비게이션 로그아웃 시작...")
                        await signOut()
                        console.log("✅ 네비게이션 로그아웃 완료")
                      } catch (error) {
                        console.error("❌ 네비게이션 로그아웃 오류:", error)
                        // 에러가 발생해도 강제로 홈페이지로 이동
                        if (typeof window !== 'undefined') {
                          window.location.href = '/'
                        }
                      }
                    }}>
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

          {/* 모바일 버전 햄버거 메뉴 */}
          <div className="md:hidden">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-purple-600">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                <SheetHeader>
                  <SheetTitle className="text-purple-600 font-display">돌핀인캘리 AI</SheetTitle>
                </SheetHeader>
                
                <div className="flex flex-col gap-4 mt-6">
                  {/* 네비게이션 메뉴 */}
                  <div className="flex flex-col gap-3">
                    <Link 
                      href="/future-me" 
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-purple-50 text-purple-600 hover:text-purple-800"
                      onClick={handleMobileMenuClose}
                    >
                      <Sparkles className="h-5 w-5" />
                      <span className="font-medium">시간버스</span>
                    </Link>
                    
                    <Link 
                      href="/doodle-to-reality" 
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-teal-50 text-teal-600 hover:text-teal-800"
                      onClick={handleMobileMenuClose}
                    >
                      <Pencil className="h-5 w-5" />
                      <span className="font-medium">낙서 현실화</span>
                    </Link>
                  </div>

                  <div className="border-t pt-4">
                    {user ? (
                      <div className="flex flex-col gap-3">
                        {/* 사용자 정보 */}
                        <div className="bg-purple-50 p-4 rounded-lg">
                          <div className="flex items-center gap-3 mb-2">
                            <Avatar>
                              <AvatarFallback className="bg-purple-200 text-purple-700">
                                {user.email?.charAt(0).toUpperCase() || "U"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{user.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-purple-700">
                            <Ticket className="h-4 w-4" />
                            <span>티켓: {remainingTickets}개</span>
                          </div>
                        </div>

                        {/* 사용자 메뉴 */}
                        <Link 
                          href="/profile" 
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50"
                          onClick={handleMobileMenuClose}
                        >
                          <User className="h-5 w-5 text-gray-600" />
                          <span>프로필</span>
                        </Link>

                        <div className="flex items-center gap-3 p-3 rounded-lg cursor-not-allowed opacity-50">
                          <CreditCard className="h-5 w-5 text-gray-600" />
                          <span>티켓 구매 (준비중)</span>
                        </div>

                        <button 
                          onClick={async () => {
                            try {
                              console.log("🔄 모바일 로그아웃 시작...")
                              await signOut()
                              handleMobileMenuClose()
                              console.log("✅ 모바일 로그아웃 완료")
                            } catch (error) {
                              console.error("❌ 모바일 로그아웃 오류:", error)
                              handleMobileMenuClose()
                              // 에러가 발생해도 강제로 홈페이지로 이동
                              if (typeof window !== 'undefined') {
                                window.location.href = '/'
                              }
                            }
                          }}
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 text-left w-full"
                        >
                          <LogOut className="h-5 w-5 text-gray-600" />
                          <span>로그아웃</span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        <Link 
                          href="/login" 
                          className="flex items-center justify-center gap-2 p-3 rounded-lg border-2 border-purple-300 hover:bg-purple-50 text-purple-600"
                          onClick={handleMobileMenuClose}
                          >
                            로그인
                        </Link>
                        <Link 
                          href="/signup" 
                          className="flex items-center justify-center gap-2 p-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                          onClick={handleMobileMenuClose}
                        >
                            회원가입
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  )
}
