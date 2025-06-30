-- 데이터베이스 스키마 문제 해결 SQL

-- 1. profiles 테이블에 email 컬럼 추가
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. avatar_images 테이블은 실제로는 generated_images 테이블을 의미하므로 
--    style-translation.sql 파일의 테이블명을 수정해야 함

-- 3. user_tickets 테이블의 user_id에 UNIQUE 제약조건 추가 (ON CONFLICT 사용을 위해)
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_tickets_user_id_unique ON public.user_tickets(user_id);

-- 4. profiles 테이블에서 기존 사용자들의 email 업데이트
UPDATE public.profiles 
SET email = (
  SELECT email 
  FROM auth.users 
  WHERE auth.users.id = profiles.id
)
WHERE email IS NULL;

-- 5. 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_tickets_user_id ON public.user_tickets(user_id);

-- 6. 업데이트된 스키마 확인을 위한 쿼리
-- SELECT 
--   table_name, 
--   column_name, 
--   data_type 
-- FROM information_schema.columns 
-- WHERE table_schema = 'public' 
--   AND table_name IN ('profiles', 'user_tickets', 'generated_images', 'doodle_images')
-- ORDER BY table_name, ordinal_position; 