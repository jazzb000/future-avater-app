-- generated_images 테이블에 공개 여부 필드 추가
ALTER TABLE generated_images ADD COLUMN is_public BOOLEAN DEFAULT FALSE;

-- 이미지 좋아요 테이블 추가
CREATE TABLE IF NOT EXISTS image_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  image_id UUID REFERENCES generated_images(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, image_id)
);

-- 이미지 댓글 테이블 추가
CREATE TABLE IF NOT EXISTS image_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  image_id UUID REFERENCES generated_images(id) NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 이미지 조회수 테이블 추가
CREATE TABLE IF NOT EXISTS image_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  image_id UUID REFERENCES generated_images(id) NOT NULL,
  view_count INTEGER DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- RLS 정책 설정
ALTER TABLE image_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE image_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE image_views ENABLE ROW LEVEL SECURITY;

-- 좋아요 정책
CREATE POLICY "Users can view all image likes" 
ON image_likes FOR SELECT 
USING (TRUE);

CREATE POLICY "Users can add their own likes" 
ON image_likes FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own likes" 
ON image_likes FOR DELETE 
USING (auth.uid() = user_id);

-- 댓글 정책
CREATE POLICY "Users can view all comments" 
ON image_comments FOR SELECT 
USING (TRUE);

CREATE POLICY "Users can add their own comments" 
ON image_comments FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments" 
ON image_comments FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" 
ON image_comments FOR DELETE 
USING (auth.uid() = user_id);

-- 조회수 정책
CREATE POLICY "Anyone can view image views" 
ON image_views FOR SELECT 
USING (TRUE);

-- generated_images 테이블 정책 수정
DROP POLICY IF EXISTS "Users can view their own images" ON generated_images;

CREATE POLICY "Users can view their own images" 
ON generated_images FOR SELECT 
USING (auth.uid() = user_id OR is_public = TRUE);

-- 이미지 조회수 증가 함수
CREATE OR REPLACE FUNCTION increment_image_view(image_id_param UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO image_views (image_id, view_count)
  VALUES (image_id_param, 1)
  ON CONFLICT (image_id)
  DO UPDATE SET 
    view_count = image_views.view_count + 1,
    last_updated = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
