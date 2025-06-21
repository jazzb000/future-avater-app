import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { cookies } from "next/headers"
import { createClient } from "@supabase/supabase-js"

// Supabase 클라이언트 초기화 (쿠키 사용)
const getSupabaseClient = () => {
  const cookieStore = cookies()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  return createClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
    },
  })
}

export async function GET(req: Request) {
  try {
    const supabase = getSupabaseClient()

    // 현재 사용자 가져오기
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: "인증되지 않은 사용자입니다",
        },
        { status: 401 },
      )
    }

    // 사용자 티켓 정보 가져오기
    const { data: tickets, error: ticketsError } = await supabase
      .from("user_tickets")
      .select("*")
      .eq("user_id", user.id)
      .single()

    if (ticketsError && ticketsError.code !== "PGRST116") {
      return NextResponse.json(
        {
          success: false,
          error: "티켓 정보를 가져오는 중 오류가 발생했습니다",
        },
        { status: 500 },
      )
    }

    // 티켓 패키지 정보 가져오기
    const { data: packages, error: packagesError } = await supabase
      .from("ticket_packages")
      .select("*")
      .eq("is_active", true)
      .order("ticket_count", { ascending: true })

    if (packagesError) {
      return NextResponse.json(
        {
          success: false,
          error: "티켓 패키지 정보를 가져오는 중 오류가 발생했습니다",
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      tickets: tickets || { user_id: user.id, remaining_tickets: 0 },
      packages,
    })
  } catch (error) {
    console.error("티켓 정보를 가져오는 중 오류가 발생했습니다:", error)
    return NextResponse.json(
      {
        success: false,
        error: "서버 오류가 발생했습니다",
      },
      { status: 500 },
    )
  }
}

export async function POST(req: Request) {
  try {
    const supabase = getSupabaseClient()
    const adminClient = supabaseAdmin()

    // 현재 사용자 가져오기
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: "인증되지 않은 사용자입니다",
        },
        { status: 401 },
      )
    }

    // 요청 본문 가져오기
    const { packageId, paymentMethod } = await req.json()

    if (!packageId || !paymentMethod) {
      return NextResponse.json(
        {
          success: false,
          error: "필수 항목이 누락되었습니다",
        },
        { status: 400 },
      )
    }

    // 패키지 정보 가져오기
    const { data: packageData, error: packageError } = await supabase
      .from("ticket_packages")
      .select("*")
      .eq("id", packageId)
      .eq("is_active", true)
      .single()

    if (packageError || !packageData) {
      return NextResponse.json(
        {
          success: false,
          error: "유효하지 않은 패키지입니다",
        },
        { status: 400 },
      )
    }

    // 거래 내역 생성
    const { error: transactionError } = await adminClient.from("transactions").insert({
      user_id: user.id,
      package_id: packageId,
      amount: packageData.price,
      ticket_count: packageData.ticket_count,
      payment_method: paymentMethod,
      payment_status: "completed",
      payment_id: `manual-${Date.now()}`,
    })

    if (transactionError) {
      return NextResponse.json(
        {
          success: false,
          error: "거래 내역 생성 중 오류가 발생했습니다",
        },
        { status: 500 },
      )
    }

    // 티켓 추가
    const { error: ticketError } = await adminClient.rpc("add_tickets", {
      user_id_param: user.id,
      ticket_count_param: packageData.ticket_count,
    })

    if (ticketError) {
      return NextResponse.json(
        {
          success: false,
          error: "티켓 추가 중 오류가 발생했습니다",
        },
        { status: 500 },
      )
    }

    // 업데이트된 티켓 정보 가져오기
    const { data: updatedTickets, error: updatedTicketsError } = await supabase
      .from("user_tickets")
      .select("*")
      .eq("user_id", user.id)
      .single()

    if (updatedTicketsError) {
      return NextResponse.json(
        {
          success: false,
          error: "업데이트된 티켓 정보를 가져오는 중 오류가 발생했습니다",
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      tickets: updatedTickets,
    })
  } catch (error) {
    console.error("티켓 구매 중 오류가 발생했습니다:", error)
    return NextResponse.json(
      {
        success: false,
        error: "서버 오류가 발생했습니다",
      },
      { status: 500 },
    )
  }
}
