-- doodle_images 테이블 업데이트
-- updated_at 컬럼 추가
ALTER TABLE doodle_images 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- status 컬럼 추가
ALTER TABLE doodle_images 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'processing';

-- error_message 컬럼 추가
ALTER TABLE doodle_images 
ADD COLUMN IF NOT EXISTS error_message TEXT;

-- updated_at을 자동으로 업데이트하는 트리거 함수 생성
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
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 