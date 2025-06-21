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
    const { comment, type = "avatar" } = await req.json()

    if (!comment || comment.trim() === "") {
      return NextResponse.json(
        {
          success: false,
          error: "Comment cannot be empty",
        },
        { status: 400 },
      )
    }

    let newComment

    if (type === "doodle") {
      // Add comment to doodle
      const { data, error } = await supabase
        .from("doodle_comments")
        .insert({
          doodle_id: imageId,
          user_id: user.id,
          comment: comment.trim(),
        })
        .select(`*, profiles (username, avatar_url)`)
        .single()

      if (error) {
        return NextResponse.json(
          {
            success: false,
            error: "Failed to add comment",
          },
          { status: 500 },
        )
      }

      newComment = data
    } else {
      // Add comment to avatar image
      const { data, error } = await supabase
        .from("image_comments")
        .insert({
          image_id: imageId,
          user_id: user.id,
          comment: comment.trim(),
        })
        .select(`*, profiles (username, avatar_url)`)
        .single()

      if (error) {
        return NextResponse.json(
          {
            success: false,
            error: "Failed to add comment",
          },
          { status: 500 },
        )
      }

      newComment = data
    }

    return NextResponse.json({
      success: true,
      comment: newComment,
    })
  } catch (error) {
    console.error("Error adding comment:", error)
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
    const commentId = url.searchParams.get("commentId")
    const type = url.searchParams.get("type") || "avatar"

    if (!commentId) {
      return NextResponse.json(
        {
          success: false,
          error: "Comment ID is required",
        },
        { status: 400 },
      )
    }

    if (type === "doodle") {
      // Delete doodle comment
      const { error } = await supabase.from("doodle_comments").delete().eq("id", commentId).eq("user_id", user.id)

      if (error) {
        return NextResponse.json(
          {
            success: false,
            error: "Failed to delete comment",
          },
          { status: 500 },
        )
      }
    } else {
      // Delete avatar image comment
      const { error } = await supabase.from("image_comments").delete().eq("id", commentId).eq("user_id", user.id)

      if (error) {
        return NextResponse.json(
          {
            success: false,
            error: "Failed to delete comment",
          },
          { status: 500 },
        )
      }
    }

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error("Error deleting comment:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 },
    )
  }
}
