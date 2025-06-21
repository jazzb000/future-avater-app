import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    })

    const imageId = params.id
    const url = new URL(req.url)
    const type = url.searchParams.get("type") || "avatar" // avatar or doodle

    // Get the current user (optional)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Increment view count
    if (type === "doodle") {
      await supabase.rpc("increment_doodle_view", { doodle_id_param: imageId })
    } else {
      await supabase.rpc("increment_image_view", { image_id_param: imageId })
    }

    let imageData,
      commentsData,
      likesCount,
      userLiked = false

    if (type === "doodle") {
      // Get doodle image details
      const { data: doodle, error: doodleError } = await supabase
        .from("doodle_images")
        .select(`*, profiles (username, avatar_url)`)
        .eq("id", imageId)
        .single()

      if (doodleError) {
        return NextResponse.json(
          {
            success: false,
            error: "Doodle not found",
          },
          { status: 404 },
        )
      }

      // Get doodle comments
      const { data: comments, error: commentsError } = await supabase
        .from("doodle_comments")
        .select(`*, profiles (username, avatar_url)`)
        .eq("doodle_id", imageId)
        .order("created_at", { ascending: false })

      if (commentsError) {
        console.error("Error fetching doodle comments:", commentsError)
      }

      // Get likes count
      const { count: likes, error: likesError } = await supabase
        .from("doodle_likes")
        .select("*", { count: "exact" })
        .eq("doodle_id", imageId)

      if (likesError) {
        console.error("Error fetching doodle likes:", likesError)
      }

      // Check if user liked the doodle
      if (user) {
        const { data: userLike, error: userLikeError } = await supabase
          .from("doodle_likes")
          .select("id")
          .eq("doodle_id", imageId)
          .eq("user_id", user.id)
          .single()

        if (!userLikeError && userLike) {
          userLiked = true
        }
      }

      // Get view count
      const { data: viewData, error: viewError } = await supabase
        .from("doodle_views")
        .select("view_count")
        .eq("doodle_id", imageId)
        .single()

      if (viewError && viewError.code !== "PGRST116") {
        console.error("Error fetching doodle views:", viewError)
      }

      imageData = doodle
      commentsData = comments || []
      likesCount = likes || 0
    } else {
      // Get avatar image details
      const { data: image, error: imageError } = await supabase
        .from("generated_images")
        .select(`*, profiles (username, avatar_url)`)
        .eq("id", imageId)
        .single()

      if (imageError) {
        return NextResponse.json(
          {
            success: false,
            error: "Image not found",
          },
          { status: 404 },
        )
      }

      // Get image comments
      const { data: comments, error: commentsError } = await supabase
        .from("image_comments")
        .select(`*, profiles (username, avatar_url)`)
        .eq("image_id", imageId)
        .order("created_at", { ascending: false })

      if (commentsError) {
        console.error("Error fetching image comments:", commentsError)
      }

      // Get likes count
      const { count: likes, error: likesError } = await supabase
        .from("image_likes")
        .select("*", { count: "exact" })
        .eq("image_id", imageId)

      if (likesError) {
        console.error("Error fetching image likes:", likesError)
      }

      // Check if user liked the image
      if (user) {
        const { data: userLike, error: userLikeError } = await supabase
          .from("image_likes")
          .select("id")
          .eq("image_id", imageId)
          .eq("user_id", user.id)
          .single()

        if (!userLikeError && userLike) {
          userLiked = true
        }
      }

      // Get view count
      const { data: viewData, error: viewError } = await supabase
        .from("image_views")
        .select("view_count")
        .eq("image_id", imageId)
        .single()

      if (viewError && viewError.code !== "PGRST116") {
        console.error("Error fetching image views:", viewError)
      }

      imageData = image
      commentsData = comments || []
      likesCount = likes || 0
    }

    return NextResponse.json({
      success: true,
      image: imageData,
      comments: commentsData,
      likes: likesCount,
      userLiked,
      views: imageData.views_count || 0,
      type,
    })
  } catch (error) {
    console.error("Error fetching image details:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 },
    )
  }
}
