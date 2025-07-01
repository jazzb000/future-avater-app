import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// 동적 렌더링 강제 (빌드 시 정적 생성 방지)
export const dynamic = 'force-dynamic'
// API 응답 캐싱 설정 (30초간 캐시)
export const revalidate = 30

// Supabase 클라이언트 초기화 (Service Role Key 사용하여 RLS 우회)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ 환경 변수 누락:", {
    hasUrl: !!supabaseUrl,
    hasServiceKey: !!supabaseServiceKey
  })
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(req: Request) {
  try {
    console.log("🚀 갤러리 API 시작")
    console.log("🔑 환경 변수 확인:", {
      hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      url: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + "..."
    })

    // 쿼리 파라미터 파싱
    const url = new URL(req.url)
    const page = Number.parseInt(url.searchParams.get("page") || "1")
    const limit = Math.min(Number.parseInt(url.searchParams.get("limit") || "16"), 50) // 최대 50개로 제한
    const filter = url.searchParams.get("filter") || "latest"
    const job = url.searchParams.get("job")
    const style = url.searchParams.get("style")
    const type = url.searchParams.get("type") || "avatar" // avatar 또는 doodle

    console.log("📋 요청 파라미터:", { type, filter, page, limit, job, style })

    // 페이지네이션 계산
    const from = (page - 1) * limit
    const to = from + limit - 1

    console.log("📄 페이지네이션:", { from, to })

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
          is_public
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
      if (filter === "popular") {
        query = query.order("created_at", { ascending: false })
      } else {
        // 기본값: latest
        query = query.order("created_at", { ascending: false })
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
    is_public
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
      if (filter === "popular") {
        query = query.order("created_at", { ascending: false })
      } else {
        // 기본값: latest
        query = query.order("created_at", { ascending: false })
      }
    }

    console.log("🔍 쿼리 실행 중...")
    console.log("📝 실행할 쿼리 조건:", { type, filter, is_public: true })
    
    const { data, error, count } = await query
    
    console.log("📊 쿼리 결과:", {
      dataLength: data?.length || 0,
      totalCount: count,
      error: error?.message,
      firstItem: data?.[0]
    })

    // 디버깅 로그 추가
    console.log(`🔍 갤러리 API 호출 - 타입: ${type}, 필터: ${filter}, 페이지: ${page}`)
    console.log(`📊 결과 개수: ${data?.length || 0}, 전체: ${count}`)
    


    if (error) {
      console.error(`❌ 갤러리 API 오류:`, error)
      return NextResponse.json(
        {
          success: false,
          error: "갤러리 이미지를 가져오는 중 오류가 발생했습니다",
        },
        { status: 500 },
      )
    }

    // 데이터 가공 (사용자 정보만 추가)
    const processedData = data?.map((item: any) => ({
      ...item,
      profiles: { username: "사용자" }, // 기본 사용자 이름 설정
    }))

    // 사용자 ID가 있는 이미지에 대해 프로필 정보 가져오기
    if (processedData && processedData.length > 0) {
      const userIds = processedData.map((item: any) => item.user_id).filter(Boolean)
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase.from("profiles").select("id, username").in("id", userIds)

        if (profilesData) {
          // 프로필 정보를 이미지 데이터에 매핑
          processedData.forEach((item: any) => {
            const profile = profilesData.find((p: any) => p.id === item.user_id)
            if (profile) {
              item.profiles = { username: profile.username }
            }
          })
        }
      }
    }

    // 응답 헤더에 캐시 설정 추가
    const response = NextResponse.json({
      success: true,
      images: processedData,
      total: count || 0,
      page,
      limit,
      hasMore: count ? from + limit < count : false,
    })
    
    // 브라우저 캐시 헤더 설정 (30초)
    response.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60')
    
    return response
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
