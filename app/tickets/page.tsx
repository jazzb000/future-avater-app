"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { useTicket } from "@/contexts/ticket-context"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Ticket, Check } from "lucide-react"

type TicketPackage = {
  id: number
  name: string
  description: string
  ticket_count: number
  price: number
}

export default function TicketsPage() {
  const { user } = useAuth()
  const { remainingTickets, refreshTickets } = useTicket()
  const [packages, setPackages] = useState<TicketPackage[]>([])
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState<number | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (!user) {
      router.push("/login")
      return
    }

    const fetchPackages = async () => {
      try {
        const { data, error } = await supabase
          .from("ticket_packages")
          .select("*")
          .eq("is_active", true)
          .order("ticket_count", { ascending: true })

        if (error) throw error
        setPackages(data || [])
      } catch (error) {
        console.error("티켓 패키지를 가져오는 중 오류가 발생했습니다:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchPackages()
  }, [user, router])

  const handlePurchase = async (packageId: number, ticketCount: number, amount: number) => {
    if (!user) return

    setPurchasing(packageId)
    try {
      // 실제 결제 처리는 여기서 구현 (예: PG사 연동)
      // 지금은 바로 성공했다고 가정

      // 결제 성공 후 트랜잭션 기록 및 티켓 추가
      const { error: transactionError } = await supabase.from("transactions").insert({
        user_id: user.id,
        package_id: packageId,
        amount: amount,
        ticket_count: ticketCount,
        payment_method: "카드",
        payment_status: "완료",
        payment_id: `test-${Date.now()}`,
      })

      if (transactionError) throw transactionError

      // 사용자 티켓 업데이트
      const { error: ticketError } = await supabase.rpc("add_tickets", {
        user_id_param: user.id,
        ticket_count_param: ticketCount,
      })

      if (ticketError) throw ticketError

      // 티켓 정보 갱신
      await refreshTickets()

      alert("티켓 구매가 완료되었습니다!")
    } catch (error) {
      console.error("티켓 구매 중 오류가 발생했습니다:", error)
      alert("티켓 구매 중 오류가 발생했습니다. 다시 시도해주세요.")
    } finally {
      setPurchasing(null)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-purple-600">로딩 중...</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-purple-600 mb-2">티켓 구매</h1>
        <p className="text-lg text-purple-500">미래의 나를 만들기 위한 티켓을 구매하세요</p>
      </div>

      <div className="bg-purple-100 rounded-xl p-4 mb-8 flex items-center justify-between">
        <div className="flex items-center">
          <Ticket className="h-6 w-6 text-purple-600 mr-2" />
          <div>
            <p className="font-medium text-purple-700">현재 보유 티켓</p>
            <p className="text-sm text-purple-600">이미지 1개 생성에 티켓 1개가 사용됩니다</p>
          </div>
        </div>
        <div className="text-2xl font-bold text-purple-700">{remainingTickets}개</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {packages.map((pkg) => (
          <Card key={pkg.id} className="border-3 border-purple-200 rounded-xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
              <CardTitle>{pkg.name}</CardTitle>
              <CardDescription className="text-white opacity-90">{pkg.description}</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-purple-700">{pkg.ticket_count}개</p>
                <p className="text-sm text-gray-500">티켓</p>
              </div>
              <div className="mt-4">
                <ul className="space-y-2">
                  <li className="flex items-center">
                    <Check className="h-4 w-4 text-green-500 mr-2" />
                    <span className="text-sm">이미지 {pkg.ticket_count}개 생성 가능</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="h-4 w-4 text-green-500 mr-2" />
                    <span className="text-sm">고품질 이미지 제공</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="h-4 w-4 text-green-500 mr-2" />
                    <span className="text-sm">다운로드 및 공유 가능</span>
                  </li>
                </ul>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col">
              <div className="text-center w-full mb-4">
                <p className="text-2xl font-bold text-purple-700">{pkg.price.toLocaleString()}원</p>
              </div>
              <Button
                onClick={() => handlePurchase(pkg.id, pkg.ticket_count, pkg.price)}
                disabled={purchasing === pkg.id}
                className="w-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
              >
                {purchasing === pkg.id ? "처리 중..." : "구매하기"}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}
