-- 안전한 테스트 계정 생성 및 티켓 충전 SQL (중복 키 오류 방지)

-- 1. 기존 테스트 계정들 정리 (있다면 삭제)
DELETE FROM public.user_tickets WHERE user_id IN (
  SELECT id FROM auth.users WHERE email IN ('jobworld1@test.com', 'jobworld2@test.com')
);

DELETE FROM public.profiles WHERE id IN (
  SELECT id FROM auth.users WHERE email IN ('jobworld1@test.com', 'jobworld2@test.com')
);

DELETE FROM auth.users WHERE email IN ('jobworld1@test.com', 'jobworld2@test.com');

-- 2. 한국잡월드 1 계정 생성
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'jobworld1@test.com',
  crypt('jobworld123!', gen_salt('bf')),
  now(),
  now(),
  now(),
  '',
  '',
  '',
  ''
);

-- 3. 한국잡월드 2 계정 생성
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'jobworld2@test.com',
  crypt('jobworld123!', gen_salt('bf')),
  now(),
  now(),
  now(),
  '',
  '',
  '',
  ''
);

-- 4. profiles 테이블에 프로필 생성 (한국잡월드 1)
INSERT INTO public.profiles (
  id,
  username,
  email,
  created_at,
  updated_at
) VALUES (
  (SELECT id FROM auth.users WHERE email = 'jobworld1@test.com'),
  '한국잡월드 1',
  'jobworld1@test.com',
  now(),
  now()
);

-- 5. profiles 테이블에 프로필 생성 (한국잡월드 2)
INSERT INTO public.profiles (
  id,
  username,
  email,
  created_at,
  updated_at
) VALUES (
  (SELECT id FROM auth.users WHERE email = 'jobworld2@test.com'),
  '한국잡월드 2',
  'jobworld2@test.com',
  now(),
  now()
);

-- 6. 한국잡월드 1 계정에 티켓 500개 충전
INSERT INTO public.user_tickets (
  user_id,
  remaining_tickets,
  created_at,
  updated_at
) VALUES (
  (SELECT id FROM auth.users WHERE email = 'jobworld1@test.com'),
  500,
  now(),
  now()
);

-- 7. 한국잡월드 2 계정에 티켓 500개 충전
INSERT INTO public.user_tickets (
  user_id,
  remaining_tickets,
  created_at,
  updated_at
) VALUES (
  (SELECT id FROM auth.users WHERE email = 'jobworld2@test.com'),
  500,
  now(),
  now()
);

-- 확인용 쿼리 (실행 후 결과 확인)
SELECT 
  u.email,
  p.username,
  ut.remaining_tickets,
  u.created_at
FROM auth.users u
JOIN public.profiles p ON u.id = p.id
LEFT JOIN public.user_tickets ut ON u.id = ut.user_id
WHERE u.email IN ('jobworld1@test.com', 'jobworld2@test.com'); 