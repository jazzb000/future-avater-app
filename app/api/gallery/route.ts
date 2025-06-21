import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@supabase/supabase-js"

// 동적 렌더링 강제 (빌드 시 정적 생성 방지)
export const dynamic = 'force-dynamic'

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

    // 쿼리 파라미터 파싱
    const url = new URL(req.url)
    const page = Number.parseInt(url.searchParams.get("page") || "1")
    const limit = Number.parseInt(url.searchParams.get("limit") || "12")
    const filter = url.searchParams.get("filter") || "latest"
    const job = url.searchParams.get("job")
    const style = url.searchParams.get("style")
    const type = url.searchParams.get("type") || "avatar" // avatar 또는 doodle

    // 페이지네이션 계산
    const from = (page - 1) * limit
    const to = from + limit - 1

    let query

    if (type === "doodle") {
      // 낙서 이미지 쿼리
      query = supabase
        .from("doodle_images")
        .select(
          `
          id, 
          original_image_url,
          result_image_url, 
          style, 
          created_at,
          user_id,
          profiles (username),
          likes_count: doodle_likes (count),
          comments_count: doodle_comments (count),
          views_count: doodle_views (view_count)
        `,
          { count: "exact" },
        )
        .eq("is_public", true)
        .range(from, to)

      // 스타일 필터 적용
      if (style) {
        query = query.eq("style", style)
      }

      // 정렬 적용
      switch (filter) {
        case "latest":
          query = query.order("created_at", { ascending: false })
          break
        case "popular":
          query = query.order("likes_count", { ascending: false }).order("created_at", { ascending: false })
          break
        case "views":
          query = query.order("views_count", { ascending: false }).order("created_at", { ascending: false })
          break
      }
    } else {
      // 아바타 이미지 쿼리
      query = supabase
        .from("generated_images")
        .select(
          `
    id, 
    image_url, 
    job, 
    age, 
    style, 
    created_at,
    user_id,
    likes_count: image_likes (count),
    comments_count: image_comments (count),
    views_count: image_views (view_count)
  `,
          { count: "exact" },
        )
        .eq("is_public", true)
        .range(from, to)

      // 직업 필터 적용
      if (job) {
        query = query.eq("job", job)
      }

      // 스타일 필터 적용
      if (style) {
        query = query.eq("style", style)
      }

      // 정렬 적용
      switch (filter) {
        case "latest":
          query = query.order("created_at", { ascending: false })
          break
        case "popular":
          query = query.order("likes_count", { ascending: false }).order("created_at", { ascending: false })
          break
        case "views":
          query = query.order("views_count", { ascending: false }).order("created_at", { ascending: false })
          break
      }
    }

    const { data, error, count } = await query

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: "갤러리 이미지를 가져오는 중 오류가 발생했습니다",
        },
        { status: 500 },
      )
    }

    // 데이터 가공 (카운트 필드 정규화)
    const processedData = data?.map((item) => ({
      ...item,
      profiles: { username: "사용자" }, // 기본 사용자 이름 설정
      likes_count: item.likes_count?.[0]?.count || 0,
      comments_count: item.comments_count?.[0]?.count || 0,
      views_count: item.views_count?.[0]?.view_count || 0,
    }))

    // 사용자 ID가 있는 이미지에 대해 프로필 정보 가져오기
    if (processedData && processedData.length > 0) {
      const userIds = processedData.map((item) => item.user_id).filter(Boolean)
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase.from("profiles").select("id, username").in("id", userIds)

        if (profilesData) {
          // 프로필 정보를 이미지 데이터에 매핑
          processedData.forEach((item) => {
            const profile = profilesData.find((p) => p.id === item.user_id)
            if (profile) {
              item.profiles = { username: profile.username }
            }
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      images: processedData,
      total: count || 0,
      page,
      limit,
      hasMore: count ? from + limit < count : false,
    })
  } catch (error) {
    console.error("갤러리를 가져오는 중 오류가 발생했습니다:", error)
    return NextResponse.json(
      {
        success: false,
        error: "서버 오류가 발생했습니다",
      },
      { status: 500 },
    )
  }
}
