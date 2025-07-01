import { NextResponse } from "next/server"
import { supabaseServerClient } from "@/lib/supabase-server"

// 동적 렌더링 강제 (빌드 시 정적 생성 방지)
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
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

    // Parse query parameters
    const url = new URL(req.url)
    const type = url.searchParams.get("type") || "all" // all, avatar, doodle

    let avatarImages = []
    let doodleImages = []

    // Get avatar images
    if (type === "all" || type === "avatar") {
      const { data: avatars, error: avatarsError } = await supabase
        .from("generated_images")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (avatarsError) {
        console.error("Error fetching avatar images:", avatarsError)
      } else {
        avatarImages = avatars || []
      }
    }

    // Get doodle images
    if (type === "all" || type === "doodle") {
      const { data: doodles, error: doodlesError } = await supabase
        .from("doodle_images")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (doodlesError) {
        console.error("Error fetching doodle images:", doodlesError)
      } else {
        doodleImages = doodles || []
      }
    }

    return NextResponse.json({
      success: true,
      avatarImages,
      doodleImages,
    })
  } catch (error) {
    console.error("Error fetching user images:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 },
    )
  }
}
