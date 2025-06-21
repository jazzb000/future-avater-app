import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId, isPublic } = await req.json()
    const imageId = params.id

    if (!userId || typeof isPublic !== "boolean") {
      return NextResponse.json(
        {
          success: false,
          error: "필수 매개변수가 누락되었습니다",
        },
        { status: 400 }
      )
    }

    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user || user.id !== userId) {
      return NextResponse.json(
        {
          success: false,
          error: "인증되지 않은 사용자입니다",
        },
        { status: 401 }
      )
    }

    // 이미지 소유권 확인 및 공개 설정 업데이트
      const { error: updateError } = await supabase
        .from("doodle_images")
        .update({ is_public: isPublic })
        .eq("id", imageId)
      .eq("user_id", userId)

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
      message: `이미지가 ${isPublic ? "공개" : "비공개"}로 설정되었습니다`,
    })
  } catch (error) {
    console.error("낙서 이미지 공개 설정 변경 중 오류:", error)
    return NextResponse.json(
      {
        success: false,
        error: "서버 오류가 발생했습니다",
      },
      { status: 500 }
    )
  }
}
