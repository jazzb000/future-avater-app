-- 낙서 이미지 테이블 생성
CREATE TABLE IF NOT EXISTS doodle_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  original_image_url TEXT NOT NULL,
  result_image_url TEXT NOT NULL,
  style TEXT NOT NULL,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- RLS 정책 설정
ALTER TABLE doodle_images ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 이미지를 볼 수 있음
CREATE POLICY "Users can view their own doodle images" 
ON doodle_images FOR SELECT 
USING (auth.uid() = user_id OR is_public = TRUE);

-- 사용자는 자신의 이미지를 업데이트할 수 있음
CREATE POLICY "Users can update their own doodle images" 
ON doodle_images FOR UPDATE 
USING (auth.uid() = user_id);

-- 사용자는 자신의 이미지를 삭제할 수 있음
CREATE POLICY "Users can delete their own doodle images" 
ON doodle_images FOR DELETE 
USING (auth.uid() = user_id);

-- 사용자는 새 이미지를 추가할 수 있음
CREATE POLICY "Users can insert their own doodle images" 
ON doodle_images FOR INSERT 
WITH CHECK (auth.uid() = user_id);
