import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

// 빌드 환경에서 더 안정적인 Supabase 클라이언트
let supabaseClient: ReturnType<typeof createClientComponentClient> | null = null

export const getSupabaseClient = () => {
  if (!supabaseClient) {
    try {
      supabaseClient = createClientComponentClient()
      console.log("✅ Supabase 클라이언트 초기화 완료")
    } catch (error) {
      console.error("❌ Supabase 클라이언트 초기화 실패:", error)
      throw error
    }
  }
  return supabaseClient
}

// 클라이언트 재설정 (로그아웃 후 사용)
export const resetSupabaseClient = () => {
  supabaseClient = null
  console.log("🔄 Supabase 클라이언트 재설정됨")
}

// 안전한 로그아웃 함수
export const safeSignOut = async (): Promise<void> => {
  try {
    const client = getSupabaseClient()
    const { error } = await client.auth.signOut()
    
    if (error) {
      console.error("❌ 안전한 로그아웃 오류:", error)
      throw error
    }
    
    // 클라이언트 재설정
    resetSupabaseClient()
    
    console.log("✅ 안전한 로그아웃 완료")
  } catch (error) {
    console.error("❌ 안전한 로그아웃 중 예외:", error)
    // 에러가 발생해도 클라이언트 재설정
    resetSupabaseClient()
    throw error
  }
} 