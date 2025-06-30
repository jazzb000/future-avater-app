-- finger-edu 테스트 계정 생성 SQL

-- 1. 조건부 사용자 생성 (존재하지 않을 때만)
DO $$ 
BEGIN
    -- finger-edu 계정 생성
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'finger-edu@test.com') THEN
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
            'finger-edu@test.com',
            crypt('fingeredu123!', gen_salt('bf')),
            now(),
            now(),
            now(),
            '',
            '',
            '',
            ''
        );
    END IF;
END $$;

-- 2. 조건부 프로필 생성 (존재하지 않을 때만)
DO $$
DECLARE
    user_id UUID;
BEGIN
    -- 사용자 ID 가져오기
    SELECT id INTO user_id FROM auth.users WHERE email = 'finger-edu@test.com';
    
    -- finger-edu 프로필 생성
    IF user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = user_id) THEN
        INSERT INTO public.profiles (
            id,
            username,
            email,
            created_at,
            updated_at
        ) VALUES (
            user_id,
            'finger-edu',
            'finger-edu@test.com',
            now(),
            now()
        );
    END IF;
END $$;

-- 3. 티켓 충전 (ON CONFLICT 사용) - 500개 티켓 충전
INSERT INTO public.user_tickets (
    user_id,
    remaining_tickets,
    created_at,
    updated_at
) 
SELECT 
    id,
    500,
    now(),
    now()
FROM auth.users 
WHERE email = 'finger-edu@test.com'
ON CONFLICT (user_id) 
DO UPDATE SET 
    remaining_tickets = user_tickets.remaining_tickets + 500,
    updated_at = now();

-- 4. 결과 확인
SELECT 
    u.email,
    p.username,
    ut.remaining_tickets,
    u.created_at
FROM auth.users u
JOIN public.profiles p ON u.id = p.id
LEFT JOIN public.user_tickets ut ON u.id = ut.user_id
WHERE u.email = 'finger-edu@test.com'; 