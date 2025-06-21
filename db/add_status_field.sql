-- generated_images 테이블에 상태 필드 추가
ALTER TABLE generated_images ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'completed';
ALTER TABLE generated_images ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE generated_images ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;
