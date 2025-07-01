import { createClient } from '@supabase/supabase-js'
import { isMobile } from './utils'

const STORAGE_KEY = 'app_session_state'
const SESSION_RECOVERY_ATTEMPTS = 'session_recovery_attempts'
const MAX_RECOVERY_ATTEMPTS = 3

interface SessionState {
  lastActive: number
  deviceId: string
  theme: string
  language: string
  preferences: Record<string, any>
}

class SessionManager {
  private static instance: SessionManager
  private recoveryAttempts: number = 0

  private constructor() {
    this.initializeRecoveryAttempts()
  }

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager()
    }
    return SessionManager.instance
  }

  private initializeRecoveryAttempts() {
    const attempts = sessionStorage.getItem(SESSION_RECOVERY_ATTEMPTS)
    this.recoveryAttempts = attempts ? parseInt(attempts, 10) : 0
  }

  private incrementRecoveryAttempts() {
    this.recoveryAttempts++
    sessionStorage.setItem(SESSION_RECOVERY_ATTEMPTS, this.recoveryAttempts.toString())
  }

  private resetRecoveryAttempts() {
    this.recoveryAttempts = 0
    sessionStorage.removeItem(SESSION_RECOVERY_ATTEMPTS)
  }

  async saveSessionState(state: Partial<SessionState>) {
    try {
      const currentState = await this.getSessionState()
      const newState = { ...currentState, ...state, lastActive: Date.now() }

      if (isMobile()) {
        // 모바일에서는 중요한 데이터만 저장
        const { theme, language } = newState
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ theme, language }))
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newState))
      }

      return true
    } catch (error) {
      console.error('세션 상태 저장 중 오류:', error)
      return false
    }
  }

  async getSessionState(): Promise<SessionState> {
    try {
      const storedState = localStorage.getItem(STORAGE_KEY)
      if (!storedState) return this.getDefaultState()

      const state = JSON.parse(storedState)
      return { ...this.getDefaultState(), ...state }
    } catch (error) {
      console.error('세션 상태 조회 중 오류:', error)
      return this.getDefaultState()
    }
  }

  private getDefaultState(): SessionState {
    return {
      lastActive: Date.now(),
      deviceId: this.generateDeviceId(),
      theme: 'system',
      language: 'ko',
      preferences: {}
    }
  }

  private generateDeviceId(): string {
    const existingId = localStorage.getItem('device_id')
    if (existingId) return existingId

    const newId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    localStorage.setItem('device_id', newId)
    return newId
  }

  async recoverSession(): Promise<boolean> {
    if (this.recoveryAttempts >= MAX_RECOVERY_ATTEMPTS) {
      console.warn('최대 복구 시도 횟수 초과')
      return false
    }

    try {
      this.incrementRecoveryAttempts()
      
      const state = await this.getSessionState()
      if (!state.lastActive) return false

      // 세션 만료 체크 (12시간)
      const sessionExpired = Date.now() - state.lastActive > 12 * 60 * 60 * 1000
      if (sessionExpired) {
        await this.clearSession()
        return false
      }

      // 디바이스 ID 검증
      const currentDeviceId = this.generateDeviceId()
      if (state.deviceId !== currentDeviceId) {
        console.warn('디바이스 ID 불일치')
        return false
      }

      // 성공적인 복구 후 카운터 리셋
      this.resetRecoveryAttempts()
      return true
    } catch (error) {
      console.error('세션 복구 중 오류:', error)
      return false
    }
  }

  async clearSession(preservePreferences: boolean = true): Promise<void> {
    try {
      if (preservePreferences) {
        const state = await this.getSessionState()
        const preferences = {
          theme: state.theme,
          language: state.language
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
      } else {
        localStorage.removeItem(STORAGE_KEY)
      }
      
      this.resetRecoveryAttempts()
    } catch (error) {
      console.error('세션 클리어 중 오류:', error)
    }
  }

  isSessionValid(): boolean {
    try {
      const storedState = localStorage.getItem(STORAGE_KEY)
      if (!storedState) return false

      const state = JSON.parse(storedState)
      const sessionExpired = Date.now() - state.lastActive > 12 * 60 * 60 * 1000
      
      return !sessionExpired && state.deviceId === this.generateDeviceId()
    } catch {
      return false
    }
  }
}

export const sessionManager = SessionManager.getInstance(); 