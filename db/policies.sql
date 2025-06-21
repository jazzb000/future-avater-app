-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE doodle_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE image_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE image_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE image_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE doodle_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE doodle_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE doodle_views ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" 
ON profiles FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
ON profiles FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" 
ON profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

-- User tickets policies
CREATE POLICY "Users can view their own tickets" 
ON user_tickets FOR SELECT 
USING (auth.uid() = user_id);

-- Ticket packages policies
CREATE POLICY "Anyone can view active ticket packages" 
ON ticket_packages FOR SELECT 
USING (is_active = true);

-- Transactions policies
CREATE POLICY "Users can view their own transactions" 
ON transactions FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions" 
ON transactions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Generated images policies
CREATE POLICY "Users can view their own images or public images" 
ON generated_images FOR SELECT 
USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can update their own images" 
ON generated_images FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own images" 
ON generated_images FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own images" 
ON generated_images FOR DELETE 
USING (auth.uid() = user_id);

-- Doodle images policies
CREATE POLICY "Users can view their own doodles or public doodles" 
ON doodle_images FOR SELECT 
USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can update their own doodles" 
ON doodle_images FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own doodles" 
ON doodle_images FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own doodles" 
ON doodle_images FOR DELETE 
USING (auth.uid() = user_id);

-- Image likes policies
CREATE POLICY "Anyone can view image likes" 
ON image_likes FOR SELECT 
USING (true);

CREATE POLICY "Users can add their own likes" 
ON image_likes FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own likes" 
ON image_likes FOR DELETE 
USING (auth.uid() = user_id);

-- Image comments policies
CREATE POLICY "Anyone can view image comments" 
ON image_comments FOR SELECT 
USING (true);

CREATE POLICY "Users can add their own comments" 
ON image_comments FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments" 
ON image_comments FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" 
ON image_comments FOR DELETE 
USING (auth.uid() = user_id);

-- Image views policies
CREATE POLICY "Anyone can view image views" 
ON image_views FOR SELECT 
USING (true);

-- Doodle likes policies
CREATE POLICY "Anyone can view doodle likes" 
ON doodle_likes FOR SELECT 
USING (true);

CREATE POLICY "Users can add their own doodle likes" 
ON doodle_likes FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own doodle likes" 
ON doodle_likes FOR DELETE 
USING (auth.uid() = user_id);

-- Doodle comments policies
CREATE POLICY "Anyone can view doodle comments" 
ON doodle_comments FOR SELECT 
USING (true);

CREATE POLICY "Users can add their own doodle comments" 
ON doodle_comments FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own doodle comments" 
ON doodle_comments FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own doodle comments" 
ON doodle_comments FOR DELETE 
USING (auth.uid() = user_id);

-- Doodle views policies
CREATE POLICY "Anyone can view doodle views" 
ON doodle_views FOR SELECT 
USING (true);
