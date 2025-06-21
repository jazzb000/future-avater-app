import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    })

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

    const imageId = params.id
    const { type = "avatar" } = await req.json()

    if (type === "doodle") {
      // Add like to doodle
      const { error } = await supabase.from("doodle_likes").insert({
        doodle_id: imageId,
        user_id: user.id,
      })

      if (error && error.code === "23505") {
        // Already liked, ignore
      } else if (error) {
        return NextResponse.json(
          {
            success: false,
            error: "Failed to add like",
          },
          { status: 500 },
        )
      }

      // Get updated likes count
      const { count, error: countError } = await supabase
        .from("doodle_likes")
        .select("*", { count: "exact" })
        .eq("doodle_id", imageId)

      if (countError) {
        return NextResponse.json(
          {
            success: false,
            error: "Failed to get likes count",
          },
          { status: 500 },
        )
      }

      return NextResponse.json({
        success: true,
        likes: count || 0,
        userLiked: true,
      })
    } else {
      // Add like to avatar image
      const { error } = await supabase.from("image_likes").insert({
        image_id: imageId,
        user_id: user.id,
      })

      if (error && error.code === "23505") {
        // Already liked, ignore
      } else if (error) {
        return NextResponse.json(
          {
            success: false,
            error: "Failed to add like",
          },
          { status: 500 },
        )
      }

      // Get updated likes count
      const { count, error: countError } = await supabase
        .from("image_likes")
        .select("*", { count: "exact" })
        .eq("image_id", imageId)

      if (countError) {
        return NextResponse.json(
          {
            success: false,
            error: "Failed to get likes count",
          },
          { status: 500 },
        )
      }

      return NextResponse.json({
        success: true,
        likes: count || 0,
        userLiked: true,
      })
    }
  } catch (error) {
    console.error("Error adding like:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 },
    )
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    })

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

    const imageId = params.id
    const url = new URL(req.url)
    const type = url.searchParams.get("type") || "avatar"

    if (type === "doodle") {
      // Remove like from doodle
      const { error } = await supabase.from("doodle_likes").delete().eq("doodle_id", imageId).eq("user_id", user.id)

      if (error) {
        return NextResponse.json(
          {
            success: false,
            error: "Failed to remove like",
          },
          { status: 500 },
        )
      }

      // Get updated likes count
      const { count, error: countError } = await supabase
        .from("doodle_likes")
        .select("*", { count: "exact" })
        .eq("doodle_id", imageId)

      if (countError) {
        return NextResponse.json(
          {
            success: false,
            error: "Failed to get likes count",
          },
          { status: 500 },
        )
      }

      return NextResponse.json({
        success: true,
        likes: count || 0,
        userLiked: false,
      })
    } else {
      // Remove like from avatar image
      const { error } = await supabase.from("image_likes").delete().eq("image_id", imageId).eq("user_id", user.id)

      if (error) {
        return NextResponse.json(
          {
            success: false,
            error: "Failed to remove like",
          },
          { status: 500 },
        )
      }

      // Get updated likes count
      const { count, error: countError } = await supabase
        .from("image_likes")
        .select("*", { count: "exact" })
        .eq("image_id", imageId)

      if (countError) {
        return NextResponse.json(
          {
            success: false,
            error: "Failed to get likes count",
          },
          { status: 500 },
        )
      }

      return NextResponse.json({
        success: true,
        likes: count || 0,
        userLiked: false,
      })
    }
  } catch (error) {
    console.error("Error removing like:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 },
    )
  }
}
