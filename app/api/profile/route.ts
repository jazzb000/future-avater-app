import { NextResponse } from "next/server"
import { supabaseServerClient } from "@/lib/supabase-server"

// 동적 렌더링 강제 (빌드 시 정적 생성 방지)
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = supabaseServerClient()

    // 현재 사용자 인증 확인
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 사용자 프로필 조회
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error) throw error

    return NextResponse.json(profile)
  } catch (error) {
    console.error('프로필 조회 중 오류:', error)
    return new NextResponse('프로필을 불러오는데 실패했습니다.', { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const supabase = supabaseServerClient()

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 401 },
      )
    }

    // Get the request body
    const { username, full_name, avatar_url } = await req.json()

    // Update the profile
    const { data, error } = await supabase
      .from("profiles")
      .update({
        username,
        full_name,
        avatar_url,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      profile: data,
    })
  } catch (error) {
    console.error("Error updating profile:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 },
    )
  }
}
