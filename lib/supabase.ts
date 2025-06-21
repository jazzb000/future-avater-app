import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { createClient } from "@supabase/supabase-js"

// 환경 변수에서 Supabase URL과 익명 키 가져오기
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// 환경 변수 검증
if (!supabaseUrl) {
  throw new Error(
    'NEXT_PUBLIC_SUPABASE_URL 환경 변수가 설정되지 않았습니다. .env.local 파일에 NEXT_PUBLIC_SUPABASE_URL을 추가해주세요.'
  )
}

if (!supabaseAnonKey) {
  throw new Error(
    'NEXT_PUBLIC_SUPABASE_ANON_KEY 환경 변수가 설정되지 않았습니다. .env.local 파일에 NEXT_PUBLIC_SUPABASE_ANON_KEY을 추가해주세요.'
  )
}

// 클라이언트 측 Supabase 클라이언트 (단일 인스턴스)
export const supabase = createClientComponentClient()

// 서버 측 Supabase 클라이언트 생성 (서비스 역할 키 사용)
export const supabaseAdmin = () => {
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseServiceKey) {
    throw new Error("서버용 Supabase 환경 변수가 설정되지 않았습니다.")
  }
  // 서버 클라이언트는 매번 새로 생성해야 합니다. (요청별 컨텍스트)
  return createClient(supabaseUrl, supabaseServiceKey)
}

export const supabaseClient = () => {
  return createClient(supabaseUrl, supabaseAnonKey)
}

// Supabase Storage 유틸리티 함수들
export const uploadImageToStorage = async (
  imageBuffer: Buffer, 
  fileName: string, 
  bucket: string = 'generated-images'
): Promise<{ url: string | null; error: string | null }> => {
  try {
    const supabaseAdmin = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    
    // 파일 업로드 - Buffer를 Uint8Array로 변환
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(fileName, new Uint8Array(imageBuffer), {
        contentType: 'image/png',
        upsert: false
      })

    if (error) {
      console.error('Storage 업로드 오류:', error)
      return { url: null, error: error.message }
    }

    // 공개 URL 생성
    const { data: publicUrlData } = supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(data.path)

    return { url: publicUrlData.publicUrl, error: null }
  } catch (error) {
    console.error('이미지 업로드 중 오류:', error)
    return { url: null, error: error instanceof Error ? error.message : '알 수 없는 오류' }
  }
}

// base64 문자열을 Buffer로 변환하는 유틸리티 함수
export const base64ToBuffer = (base64String: string): Buffer => {
  // data:image/png;base64, 부분 제거
  const base64Data = base64String.replace(/^data:image\/[a-z]+;base64,/, '')
  return Buffer.from(base64Data, 'base64')
}

// 고유한 파일명 생성 함수
export const generateUniqueFileName = (userId: string, prefix: string = 'img'): string => {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 15)
  return `${prefix}_${userId}_${timestamp}_${random}.png`
}
