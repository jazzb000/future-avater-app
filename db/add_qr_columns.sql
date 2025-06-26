-- QR코드 기능을 위한 컬럼 추가

-- generated_images 테이블에 원본 이미지 URL 컬럼 추가
ALTER TABLE generated_images 
ADD COLUMN IF NOT EXISTS original_image_url TEXT;

-- doodle_images 테이블에 원본 결과 이미지 URL 컬럼 추가
ALTER TABLE doodle_images 
ADD COLUMN IF NOT EXISTS original_result_url TEXT;

-- 기존 데이터를 위한 업데이트 (image_url을 original_image_url로 복사)
UPDATE generated_images 
SET original_image_url = image_url 
WHERE original_image_url IS NULL;

UPDATE doodle_images 
SET original_result_url = result_image_url 
WHERE original_result_url IS NULL;

-- 인덱스 추가 (성능 향상)
CREATE INDEX IF NOT EXISTS idx_generated_images_user_id ON generated_images(user_id);
CREATE INDEX IF NOT EXISTS idx_doodle_images_user_id ON doodle_images(user_id);

-- 업데이트된 시간 추가 (generated_images에는 이미 있지만 doodle_images에는 없음)
ALTER TABLE doodle_images 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- updated_at 자동 업데이트 트리거 함수 생성
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- doodle_images 테이블에 트리거 추가
DROP TRIGGER IF EXISTS update_doodle_images_updated_at ON doodle_images;
CREATE TRIGGER update_doodle_images_updated_at
BEFORE UPDATE ON doodle_images
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- generated_images 테이블에도 트리거 추가 (만약 없다면)
DROP TRIGGER IF EXISTS update_generated_images_updated_at ON generated_images;
CREATE TRIGGER update_generated_images_updated_at
BEFORE UPDATE ON generated_images
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 