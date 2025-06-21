"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useAuth } from "./auth-context"
import { supabase } from "@/lib/supabase"

type TicketContextType = {
  remainingTickets: number
  refreshTickets: () => Promise<void>
}

const TicketContext = createContext<TicketContextType>({
  remainingTickets: 0,
  refreshTickets: async () => {},
})

export const useTicket = () => useContext(TicketContext)

export const TicketProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth()
  const [remainingTickets, setRemainingTickets] = useState(0)

  const refreshTickets = async () => {
    if (!user) {
      setRemainingTickets(0)
      return
    }

    let retries = 0
    const maxRetries = 3

    while (retries < maxRetries) {
      try {
        const { data, error, status } = await supabase
          .from("user_tickets")
          .select("remaining_tickets")
          .eq("user_id", user.id)
          .maybeSingle()

        // 429 또는 네트워크 오류는 재시도
        if (status === 429) {
          throw new Error("RATE_LIMIT")
        }

        if (error && error.code !== "PGRST116") {
          throw error
        }

        setRemainingTickets(data?.remaining_tickets ?? 0)
        return // 성공 시 함수 종료
      } catch (err: any) {
        retries += 1
        const backoff = 500 * retries ** 2
        if (retries >= maxRetries) {
          console.warn("티켓 정보 조회 실패: ", err?.message ?? err)
          setRemainingTickets(0)
          return
        }
        await new Promise((r) => setTimeout(r, backoff))
      }
    }
  }

  useEffect(() => {
    let mounted = true

    const fetchTickets = async () => {
      if (mounted) {
        await refreshTickets()
      }
    }

    if (user) {
      fetchTickets()

      // 실시간 구독 설정
      const subscription = supabase
        .channel(`user_tickets_${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "user_tickets",
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            if (mounted) {
              fetchTickets()
            }
          },
        )
        .subscribe()

      return () => {
        mounted = false
        supabase.removeChannel(subscription)
      }
    }

    return () => {
      mounted = false
    }
  }, [user, refreshTickets])

  return <TicketContext.Provider value={{ remainingTickets, refreshTickets }}>{children}</TicketContext.Provider>
}
