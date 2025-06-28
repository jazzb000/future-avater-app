require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

// 환경 변수 확인
console.log('🔍 환경 변수 확인:')
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ 설정됨' : '❌ 없음')
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ 설정됨' : '❌ 없음')

// Supabase 클라이언트 생성 시도
try {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('환경 변수가 설정되지 않았습니다')
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  
  console.log('🚀 Supabase 클라이언트 생성 성공')
  
  // 간단한 쿼리 테스트
  supabase
    .from('doodle_images')
    .select('id, is_public, style')
    .eq('is_public', true)
    .limit(3)
    .then(({ data, error }) => {
      if (error) {
        console.error('❌ 쿼리 오류:', error)
      } else {
        console.log('✅ 쿼리 성공:', data)
        console.log('📊 공개된 낙서현실화 이미지 개수:', data?.length || 0)
      }
      process.exit(0)
    })
    
} catch (error) {
  console.error('❌ 오류:', error.message)
  process.exit(1)
} 