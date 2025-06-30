-- 테스트 계정 생성 및 티켓 충전 SQL (안전한 버전)

-- 1. 한국잡월드 1 계정 생성 (중복 시 무시)
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
) ON CONFLICT (email) DO NOTHING;

-- 2. 한국잡월드 2 계정 생성
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
) ON CONFLICT (email) DO NOTHING;

-- 3. profiles 테이블에 프로필 생성 (한국잡월드 1)
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
) ON CONFLICT (id) DO NOTHING;

-- 4. profiles 테이블에 프로필 생성 (한국잡월드 2)
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
) ON CONFLICT (id) DO NOTHING;

-- 5. 한국잡월드 1 계정에 티켓 500개 충전
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
) ON CONFLICT (user_id) 
DO UPDATE SET 
  remaining_tickets = user_tickets.remaining_tickets + 500,
  updated_at = now();

-- 6. 한국잡월드 2 계정에 티켓 500개 충전
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
) ON CONFLICT (user_id) 
DO UPDATE SET 
  remaining_tickets = user_tickets.remaining_tickets + 500,
  updated_at = now();

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