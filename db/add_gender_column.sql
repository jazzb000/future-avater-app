-- Add gender column to generated_images table

-- Add gender column
ALTER TABLE generated_images ADD COLUMN IF NOT EXISTS gender VARCHAR(10);

-- Add comment to the column
COMMENT ON COLUMN generated_images.gender IS '성별 (male, female)';

-- Update trigger function to handle the new column (optional - 트리거가 있다면)
-- CREATE OR REPLACE FUNCTION update_updated_at_column()
-- RETURNS TRIGGER AS $$
-- BEGIN
--     NEW.updated_at = CURRENT_TIMESTAMP;
--     RETURN NEW;
-- END;
-- $$ language 'plpgsql'; 