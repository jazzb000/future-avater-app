import { supabase } from './supabase'
import { safeSignOut, resetSupabaseClient } from './supabase-client'

/**
 * 강화된 로그아웃 함수
 * Supabase 세션 정리 + 로컬 상태 정리 + 리다이렉션
 */
export const enhancedSignOut = async (): Promise<void> => {
  try {
    console.log("🚪 강화된 로그아웃 시작...")
    
    // 1. 안전한 Supabase 세션 정리
    await safeSignOut()
    
    // 2. 로컬 스토리지 정리
    if (typeof window !== 'undefined') {
      // Supabase 관련 토큰들 정리
      localStorage.removeItem('supabase.auth.token')
      localStorage.removeItem('sb-access-token')
      localStorage.removeItem('sb-refresh-token')
      
      // 세션 스토리지 정리
      sessionStorage.clear()
      
      // 쿠키 정리 (Supabase 관련)
      document.cookie.split(";").forEach(function(c) { 
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
      });
    }
    
    console.log("✅ 강화된 로그아웃 완료")
    
    // 3. 홈페이지로 리다이렉션
    if (typeof window !== 'undefined') {
      // 현재 URL이 홈페이지가 아닌 경우에만 리다이렉션
      if (window.location.pathname !== '/') {
        window.location.href = '/'
      } else {
        // 홈페이지에 있는 경우 페이지 새로고침
        window.location.reload()
      }
      
      // 추가 안전장치: 3초 후에도 여전히 로그인 상태라면 강제 새로고침
      setTimeout(() => {
        if (window.location.pathname !== '/') {
          console.log("⚠️ 3초 후 강제 홈페이지 이동")
          window.location.href = '/'
        }
      }, 3000)
    }
    
  } catch (error) {
    console.error("❌ 강화된 로그아웃 중 오류:", error)
    
    // 에러가 발생해도 강제로 정리
    if (typeof window !== 'undefined') {
      localStorage.clear()
      sessionStorage.clear()
      window.location.href = '/'
    }
  }
}

/**
 * 세션 상태 확인 함수
 */
export const checkSessionStatus = async (): Promise<{
  isAuthenticated: boolean
  user: any
  error?: string
}> => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error("세션 확인 오류:", error)
      return { isAuthenticated: false, user: null, error: error.message }
    }
    
    return {
      isAuthenticated: !!session,
      user: session?.user || null
    }
  } catch (error) {
    console.error("세션 확인 중 예외:", error)
    return { 
      isAuthenticated: false, 
      user: null, 
      error: error instanceof Error ? error.message : '알 수 없는 오류' 
    }
  }
}

/**
 * 강제 세션 정리 함수 (디버깅용)
 */
export const forceClearSession = (): void => {
  if (typeof window === 'undefined') return
  
  console.log("🧹 강제 세션 정리 시작...")
  
  // 모든 로컬 스토리지 정리
  localStorage.clear()
  
  // 모든 세션 스토리지 정리
  sessionStorage.clear()
  
  // 모든 쿠키 정리
  document.cookie.split(";").forEach(function(c) { 
    document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
  });
  
  console.log("✅ 강제 세션 정리 완료")
  
  // 페이지 새로고침
  window.location.reload()
} 