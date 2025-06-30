-- DB 스타일명 영어 → 한국어 번역 SQL

-- 1. generated_images 테이블의 스타일 업데이트 (avatar_images → generated_images로 수정)
UPDATE public.generated_images 
SET style = CASE 
  WHEN style = 'realistic' THEN '사실적인 이미지'
  WHEN style = 'anime' THEN '애니메이션 스타일'
  WHEN style = 'cartoon' THEN '만화 스타일'
  WHEN style = 'watercolor' THEN '수채화 스타일'
  WHEN style = 'oil_painting' THEN '유화 스타일'
  WHEN style = 'sketch' THEN '스케치 스타일'
  WHEN style = 'pixel_art' THEN '픽셀 아트'
  WHEN style = 'impressionist' THEN '인상주의 스타일'
  WHEN style = 'abstract' THEN '추상화 스타일'
  WHEN style = 'minimalist' THEN '미니멀 스타일'
  WHEN style = 'vintage' THEN '빈티지 스타일'
  WHEN style = 'cyberpunk' THEN '사이버펑크 스타일'
  WHEN style = 'fantasy' THEN '판타지 스타일'
  WHEN style = 'steampunk' THEN '스팀펑크 스타일'
  WHEN style = 'gothic' THEN '고딕 스타일'
  ELSE style
END
WHERE style IN (
  'realistic', 'anime', 'cartoon', 'watercolor', 'oil_painting', 
  'sketch', 'pixel_art', 'impressionist', 'abstract', 'minimalist',
  'vintage', 'cyberpunk', 'fantasy', 'steampunk', 'gothic'
);

-- 2. doodle_images 테이블의 스타일 업데이트
UPDATE public.doodle_images 
SET style = CASE 
  WHEN style = 'realistic' THEN '사실적인 이미지'
  WHEN style = 'anime' THEN '애니메이션 스타일'
  WHEN style = 'cartoon' THEN '만화 스타일'
  WHEN style = 'watercolor' THEN '수채화 스타일'
  WHEN style = 'oil_painting' THEN '유화 스타일'
  WHEN style = 'sketch' THEN '스케치 스타일'
  WHEN style = 'pixel_art' THEN '픽셀 아트'
  WHEN style = 'impressionist' THEN '인상주의 스타일'
  WHEN style = 'abstract' THEN '추상화 스타일'
  WHEN style = 'minimalist' THEN '미니멀 스타일'
  WHEN style = 'vintage' THEN '빈티지 스타일'
  WHEN style = 'cyberpunk' THEN '사이버펑크 스타일'
  WHEN style = 'fantasy' THEN '판타지 스타일'
  WHEN style = 'steampunk' THEN '스팀펑크 스타일'
  WHEN style = 'gothic' THEN '고딕 스타일'
  ELSE style
END
WHERE style IN (
  'realistic', 'anime', 'cartoon', 'watercolor', 'oil_painting', 
  'sketch', 'pixel_art', 'impressionist', 'abstract', 'minimalist',
  'vintage', 'cyberpunk', 'fantasy', 'steampunk', 'gothic'
);

-- 3. 확인용 쿼리 - generated_images의 스타일 분포
SELECT style, COUNT(*) as count 
FROM public.generated_images 
GROUP BY style 
ORDER BY count DESC;

-- 4. 확인용 쿼리 - doodle_images의 스타일 분포
SELECT style, COUNT(*) as count 
FROM public.doodle_images 
GROUP BY style 
ORDER BY count DESC;

-- 5. 업데이트 결과 확인
SELECT 
  'generated_images' as table_name,
  COUNT(*) as total_updated
FROM public.generated_images 
WHERE style LIKE '%스타일%' OR style LIKE '%이미지%' OR style LIKE '%아트%'

UNION ALL

SELECT 
  'doodle_images' as table_name,
  COUNT(*) as total_updated
FROM public.doodle_images 
WHERE style LIKE '%스타일%' OR style LIKE '%이미지%' OR style LIKE '%아트%'; 