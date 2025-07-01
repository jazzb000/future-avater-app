"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import type { User } from "@supabase/supabase-js"

// 상수 및 타입 정의
const AUTH_STORAGE_KEYS = {
  session: 'sb-session',        // Supabase 세션
  user: 'user-preferences',     // 사용자 설정
  theme: 'theme-preference',    // 테마 설정 (유지)
  language: 'lang-preference'   // 언어 설정 (유지)
} as const

type LogoutStatus = {
  step: 'initial' | 'clearing_auth' | 'clearing_cache' | 'redirecting' | 'error'
  message: string
  error?: any
}

type AuthContextType = {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signUp: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => Promise<void>
  logoutStatus: LogoutStatus
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [logoutStatus, setLogoutStatus] = useState<LogoutStatus>({ 
    step: 'initial', 
    message: '' 
  })

  // 인증 데이터 정리 함수
  const clearAuthData = useCallback(async () => {
    try {
      setLogoutStatus({ 
        step: 'clearing_auth', 
        message: '로그아웃 처리 중...' 
      })

      // 선택적으로 데이터 삭제
      Object.entries(AUTH_STORAGE_KEYS).forEach(([key, value]) => {
        if (!['theme', 'language'].includes(key)) {
          localStorage.removeItem(value)
          sessionStorage.removeItem(value)
        }
      })

      // Supabase 관련 모든 키 삭제
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-')) {
          localStorage.removeItem(key)
        }
      })

      return true
    } catch (error) {
      console.error('인증 데이터 정리 중 오류:', error)
      throw error
    }
  }, [])

  // 캐시 정리 함수
  const clearAuthCache = useCallback(async () => {
    try {
      setLogoutStatus({ 
        step: 'clearing_cache', 
        message: '캐시 데이터 정리 중...' 
      })

      if ('caches' in window) {
        const cacheKeys = await caches.keys()
        await Promise.all(
          cacheKeys
            .filter(key => key.startsWith('auth-') || key.startsWith('user-'))
            .map(key => caches.delete(key))
        )
      }

      return true
    } catch (error) {
      console.warn('캐시 정리 중 오류:', error)
      // 캐시 정리 실패는 치명적이지 않으므로 진행
      return true
    }
  }, [])

  // 로그아웃 함수
  const signOut = useCallback(async () => {
    try {
      console.log("🚪 로그아웃 시작...")
      
      // 1. Supabase 로그아웃
      const { error: supabaseError } = await supabase.auth.signOut()
      if (supabaseError) throw supabaseError

      // 2. 로컬 상태 초기화
      setUser(null)
      
      // 3. 인증 데이터 정리
      await clearAuthData()
      
      // 4. 캐시 정리
      await clearAuthCache()
      
      // 5. 리다이렉션 준비
      setLogoutStatus({ 
        step: 'redirecting', 
        message: '로그아웃 완료. 홈으로 이동합니다...' 
      })

      // 6. 약간의 지연 후 리다이렉션 (사용자에게 상태 표시를 위해)
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.location.href = '/'
        }
      }, 500)

    } catch (error) {
      console.error("❌ 로그아웃 오류:", error)
      
      setLogoutStatus({ 
        step: 'error', 
        message: '로그아웃 중 오류가 발생했습니다. 페이지를 새로고침해주세요.', 
        error 
      })

      // 오류 발생해도 강제로 상태 초기화
      setUser(null)
      setLoading(false)
      
      // 심각한 오류 시 새로고침
      if (typeof window !== 'undefined') {
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      }
    }
  }, [clearAuthData, clearAuthCache])

  useEffect(() => {
    // 현재 세션 확인
    const getSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      setLoading(false)
    }

    getSession()

    // 인증 상태 변경 리스너
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password })
    return { error }
  }

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        loading, 
        signIn, 
        signUp, 
        signOut,
        logoutStatus
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
