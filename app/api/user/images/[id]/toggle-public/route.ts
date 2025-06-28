import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Supabase 클라이언트 초기화 (Service Role Key 사용)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId, isPublic } = await req.json()
    const imageId = params.id

    if (!userId || typeof isPublic !== "boolean" || !imageId) {
      return NextResponse.json(
        {
          success: false,
          error: "필수 매개변수가 누락되었습니다",
        },
        { status: 400 }
      )
    }

    // 이미지 소유자 확인
    const { data: imageData, error: imageError } = await supabase
      .from("doodle_images")
      .select("user_id")
      .eq("id", imageId)
      .single()

    if (imageError) {
      console.error("낙서 이미지 조회 오류:", imageError)
      return NextResponse.json(
        {
          success: false,
          error: "이미지를 찾을 수 없습니다",
        },
        { status: 404 }
      )
    }

    if (imageData.user_id !== userId) {
      return NextResponse.json(
        {
          success: false,
          error: "이 이미지를 수정할 권한이 없습니다",
        },
        { status: 403 }
      )
    }

    // 이미지 공개 설정 업데이트
    const { error: updateError } = await supabase
      .from("doodle_images")
      .update({ is_public: isPublic })
      .eq("id", imageId)

    if (updateError) {
      console.error("낙서 이미지 공개 설정 업데이트 오류:", updateError)
      return NextResponse.json(
        {
          success: false,
          error: "이미지 공개 설정 변경에 실패했습니다",
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      isPublic,
    })
  } catch (error) {
    console.error("낙서 이미지 공개 설정 변경 중 오류:", error)
    return NextResponse.json(
      {
        success: false,
        error: "이미지 공개 설정 중 오류가 발생했습니다",
      },
      { status: 500 }
    )
  }
}
