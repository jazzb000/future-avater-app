import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const imageId = params.id
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')

    console.log("🔍 이미지 상태 조회 API 호출:", { imageId })

    if (!imageId) {
      return NextResponse.json(
        {
          success: false,
          error: "이미지 ID가 필요합니다",
        },
        { status: 400 },
      )
    }

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: "사용자 ID가 필요합니다",
        },
        { status: 400 },
      )
    }

    const supabase = supabaseAdmin()

    console.log("🔍 데이터베이스 조회 시작:", { imageId, userId: userId.substring(0, 8) + "..." })

    // 이미지 상태 확인 (사용자 ID로 필터링)
    const { data, error } = await supabase
      .from("generated_images")
      .select("id, image_url, status, error_message, completed_at")
      .eq("id", imageId)
      .eq("user_id", userId)
      .single()

    console.log("🔍 조회 결과:", { dataCount: data ? 1 : 0, hasError: !!error, error: error?.message })

    if (error) {
      console.error("❌ 이미지 상태 조회 오류:", error)
      return NextResponse.json(
        {
          success: false,
          error: "이미지 정보를 찾을 수 없습니다",
        },
        { status: 404 },
      )
    }

    console.log("✅ 이미지 상태 조회 성공:", { 
      id: data.id, 
      status: data.status, 
      hasImageUrl: !!data.image_url 
    })

    return NextResponse.json({
      success: true,
      imageId: data.id,
      imageUrl: data.image_url,
      status: data.status,
      errorMessage: data.error_message,
      completedAt: data.completed_at,
    })
  } catch (error: any) {
    console.error("이미지 상태 확인 중 오류:", error)
    return NextResponse.json(
      {
        success: false,
        error: `이미지 상태 확인 중 오류가 발생했습니다: ${error.message || "알 수 없는 오류"}`,
      },
      { status: 500 },
    )
  }
}
