-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Storage 버킷 생성 (Supabase Storage 사용)
-- 이 명령어들은 Supabase 대시보드의 Storage 섹션에서 수동으로 생성해야 합니다:
-- 1. 'generated-images' 버킷 생성 (Public 설정)
-- 2. 'doodle-images' 버킷 생성 (Public 설정)

-- 또는 SQL로 생성하려면 아래 명령어를 사용:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('generated-images', 'generated-images', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('doodle-images', 'doodle-images', true);

-- Users Profile Table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User Tickets Table
CREATE TABLE IF NOT EXISTS user_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  remaining_tickets INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Ticket Packages Table
CREATE TABLE IF NOT EXISTS ticket_packages (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  ticket_count INTEGER NOT NULL,
  price INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  package_id INTEGER REFERENCES ticket_packages(id),
  amount INTEGER NOT NULL,
  ticket_count INTEGER NOT NULL,
  payment_method TEXT NOT NULL,
  payment_status TEXT NOT NULL,
  payment_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Generated Images Table
CREATE TABLE IF NOT EXISTS generated_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  image_url TEXT NOT NULL,
  job TEXT NOT NULL,
  age TEXT NOT NULL,
  style TEXT NOT NULL,
  layout TEXT NOT NULL,
  prompt TEXT,
  status TEXT DEFAULT 'processing',
  error_message TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Doodle Images Table
CREATE TABLE IF NOT EXISTS doodle_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  original_image_url TEXT NOT NULL,
  result_image_url TEXT NOT NULL,
  style TEXT NOT NULL,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Image Likes Table
CREATE TABLE IF NOT EXISTS image_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  image_id UUID REFERENCES generated_images(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, image_id)
);

-- Image Comments Table
CREATE TABLE IF NOT EXISTS image_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  image_id UUID REFERENCES generated_images(id) NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Image Views Table
CREATE TABLE IF NOT EXISTS image_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  image_id UUID REFERENCES generated_images(id) NOT NULL,
  view_count INTEGER DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Doodle Likes Table
CREATE TABLE IF NOT EXISTS doodle_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  doodle_id UUID REFERENCES doodle_images(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, doodle_id)
);

-- Doodle Comments Table
CREATE TABLE IF NOT EXISTS doodle_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  doodle_id UUID REFERENCES doodle_images(id) NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Doodle Views Table
CREATE TABLE IF NOT EXISTS doodle_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  doodle_id UUID REFERENCES doodle_images(id) NOT NULL,
  view_count INTEGER DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default ticket packages
INSERT INTO ticket_packages (name, description, ticket_count, price)
VALUES 
  ('기본 패키지', '미래의 나 이미지 5개 생성', 5, 5000),
  ('인기 패키지', '미래의 나 이미지 15개 생성', 15, 12000),
  ('프리미엄 패키지', '미래의 나 이미지 50개 생성', 50, 30000)
ON CONFLICT DO NOTHING;
