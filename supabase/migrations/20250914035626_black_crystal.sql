-- Prompt Repository System Database Schema
-- PostgreSQL 15+ with UUID and JSONB support

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Custom types
CREATE TYPE user_role AS ENUM ('admin', 'moderator', 'user');
CREATE TYPE prompt_status AS ENUM ('active', 'pending', 'rejected', 'archived');
CREATE TYPE badge_type AS ENUM ('submission', 'usage', 'score', 'streak', 'special');
CREATE TYPE analytics_action AS ENUM ('view', 'copy', 'share', 'favorite', 'report');

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(100),
    avatar_url TEXT,
    role user_role DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    total_score INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ,
    preferences JSONB DEFAULT '{}',
    
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT valid_username CHECK (username ~* '^[a-zA-Z0-9_]{3,50}$')
);

-- Categories table
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    icon_url TEXT,
    color_hex VARCHAR(7) DEFAULT '#6366f1',
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    
    CONSTRAINT valid_slug CHECK (slug ~* '^[a-z0-9-]+$'),
    CONSTRAINT valid_color CHECK (color_hex ~* '^#[0-9a-fA-F]{6}$')
);

-- Sub-categories table
CREATE TABLE sub_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(category_id, slug),
    CONSTRAINT valid_sub_slug CHECK (slug ~* '^[a-z0-9-]+$')
);

-- Prompts table
CREATE TABLE prompts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    category_id UUID NOT NULL REFERENCES categories(id),
    sub_category_id UUID REFERENCES sub_categories(id),
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    is_public BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    status prompt_status DEFAULT 'active',
    score INTEGER DEFAULT 0,
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    
    CONSTRAINT valid_title_length CHECK (char_length(title) >= 5),
    CONSTRAINT valid_content_length CHECK (char_length(content) >= 10),
    CONSTRAINT valid_score CHECK (score >= 0)
);

-- Prompt scores table
CREATE TABLE prompt_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prompt_id UUID NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    score INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(prompt_id, user_id)
);

-- Badges table
CREATE TABLE badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon_url TEXT,
    badge_type badge_type NOT NULL,
    criteria JSONB NOT NULL,
    points_reward INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_points CHECK (points_reward >= 0)
);

-- User badges table
CREATE TABLE user_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    badge_id UUID NOT NULL REFERENCES badges(id),
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    progress JSONB DEFAULT '{}',
    
    UNIQUE(user_id, badge_id)
);

-- Usage analytics table
CREATE TABLE usage_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    prompt_id UUID REFERENCES prompts(id),
    action analytics_action NOT NULL,
    metadata JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User sessions table (for authentication)
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    
    UNIQUE(token_hash)
);

-- Favorites table
CREATE TABLE user_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    prompt_id UUID NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, prompt_id)
);

-- Reports table (for content moderation)
CREATE TABLE prompt_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prompt_id UUID NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
    reported_by UUID NOT NULL REFERENCES users(id),
    reason VARCHAR(100) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_status CHECK (status IN ('pending', 'resolved', 'dismissed'))
);

-- Indexes for performance optimization

-- User indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active);
CREATE INDEX idx_users_score ON users(total_score DESC);

-- Category indexes
CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_active ON categories(is_active);
CREATE INDEX idx_categories_sort ON categories(sort_order);
CREATE INDEX idx_sub_categories_category ON sub_categories(category_id);
CREATE INDEX idx_sub_categories_slug ON sub_categories(category_id, slug);

-- Prompt indexes
CREATE INDEX idx_prompts_user_id ON prompts(user_id);
CREATE INDEX idx_prompts_category_id ON prompts(category_id);
CREATE INDEX idx_prompts_sub_category_id ON prompts(sub_category_id);
CREATE INDEX idx_prompts_status ON prompts(status);
CREATE INDEX idx_prompts_public ON prompts(is_public);
CREATE INDEX idx_prompts_featured ON prompts(is_featured);
CREATE INDEX idx_prompts_created_at ON prompts(created_at DESC);
CREATE INDEX idx_prompts_score ON prompts(score DESC);
CREATE INDEX idx_prompts_usage ON prompts(usage_count DESC);
CREATE INDEX idx_prompts_tags ON prompts USING GIN(tags);
CREATE INDEX idx_prompts_search ON prompts USING GIN(to_tsvector('english', title || ' ' || content));

-- Score indexes
CREATE INDEX idx_prompt_scores_prompt ON prompt_scores(prompt_id);
CREATE INDEX idx_prompt_scores_user ON prompt_scores(user_id);
CREATE INDEX idx_prompt_scores_score ON prompt_scores(score);

-- Badge indexes
CREATE INDEX idx_badges_type ON badges(badge_type);
CREATE INDEX idx_badges_active ON badges(is_active);
CREATE INDEX idx_user_badges_user ON user_badges(user_id);
CREATE INDEX idx_user_badges_badge ON user_badges(badge_id);
CREATE INDEX idx_user_badges_earned ON user_badges(earned_at DESC);

-- Analytics indexes
CREATE INDEX idx_usage_analytics_user_id ON usage_analytics(user_id);
CREATE INDEX idx_usage_analytics_prompt_id ON usage_analytics(prompt_id);
CREATE INDEX idx_usage_analytics_action ON usage_analytics(action);
CREATE INDEX idx_usage_analytics_created_at ON usage_analytics(created_at DESC);

-- Session indexes
CREATE INDEX idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(token_hash);
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at);

-- Favorites indexes
CREATE INDEX idx_user_favorites_user ON user_favorites(user_id);
CREATE INDEX idx_user_favorites_prompt ON user_favorites(prompt_id);

-- Reports indexes
CREATE INDEX idx_prompt_reports_prompt ON prompt_reports(prompt_id);
CREATE INDEX idx_prompt_reports_reporter ON prompt_reports(reported_by);
CREATE INDEX idx_prompt_reports_status ON prompt_reports(status);

-- Views for common queries

-- Leaderboards view
CREATE VIEW leaderboards AS
SELECT 
    u.id,
    u.username,
    u.full_name,
    u.avatar_url,
    u.total_score,
    COUNT(p.id) as total_prompts,
    COALESCE(AVG(ps.score), 0) as avg_rating,
    SUM(p.usage_count) as total_usage,
    ROW_NUMBER() OVER (ORDER BY u.total_score DESC, COUNT(p.id) DESC) as global_rank
FROM users u
LEFT JOIN prompts p ON u.id = p.user_id AND p.status = 'active' AND p.is_public = true
LEFT JOIN prompt_scores ps ON p.id = ps.prompt_id
WHERE u.is_active = true
GROUP BY u.id, u.username, u.full_name, u.avatar_url, u.total_score;

-- Category leaderboards view
CREATE VIEW category_leaderboards AS
SELECT 
    c.id as category_id,
    c.name as category_name,
    u.id as user_id,
    u.username,
    u.full_name,
    u.avatar_url,
    COUNT(p.id) as prompts_in_category,
    COALESCE(AVG(ps.score), 0) as avg_rating,
    SUM(p.usage_count) as total_usage,
    ROW_NUMBER() OVER (PARTITION BY c.id ORDER BY COUNT(p.id) DESC, AVG(ps.score) DESC) as category_rank
FROM categories c
CROSS JOIN users u
LEFT JOIN prompts p ON u.id = p.user_id AND p.category_id = c.id AND p.status = 'active' AND p.is_public = true
LEFT JOIN prompt_scores ps ON p.id = ps.prompt_id
WHERE u.is_active = true AND c.is_active = true
GROUP BY c.id, c.name, u.id, u.username, u.full_name, u.avatar_url
HAVING COUNT(p.id) > 0;

-- Popular prompts view
CREATE VIEW popular_prompts AS
SELECT 
    p.*,
    u.username as author_username,
    u.full_name as author_name,
    u.avatar_url as author_avatar,
    c.name as category_name,
    c.slug as category_slug,
    sc.name as sub_category_name,
    COALESCE(AVG(ps.score), 0) as avg_rating,
    COUNT(ps.id) as rating_count,
    COUNT(uf.id) as favorite_count
FROM prompts p
JOIN users u ON p.user_id = u.id
JOIN categories c ON p.category_id = c.id
LEFT JOIN sub_categories sc ON p.sub_category_id = sc.id
LEFT JOIN prompt_scores ps ON p.id = ps.prompt_id
LEFT JOIN user_favorites uf ON p.id = uf.prompt_id
WHERE p.status = 'active' AND p.is_public = true AND u.is_active = true
GROUP BY p.id, u.username, u.full_name, u.avatar_url, c.name, c.slug, sc.name;

-- User statistics view
CREATE VIEW user_statistics AS
SELECT 
    u.id,
    u.username,
    u.total_score,
    COUNT(DISTINCT p.id) as total_prompts,
    COUNT(DISTINCT CASE WHEN p.status = 'active' THEN p.id END) as active_prompts,
    COUNT(DISTINCT ps.id) as ratings_given,
    COALESCE(AVG(psr.score), 0) as avg_received_rating,
    COUNT(DISTINCT psr.id) as ratings_received,
    SUM(p.usage_count) as total_usage,
    COUNT(DISTINCT ub.id) as badges_earned,
    COUNT(DISTINCT uf.id) as favorites_count
FROM users u
LEFT JOIN prompts p ON u.id = p.user_id
LEFT JOIN prompt_scores ps ON u.id = ps.user_id
LEFT JOIN prompt_scores psr ON p.id = psr.prompt_id
LEFT JOIN user_badges ub ON u.id = ub.user_id
LEFT JOIN user_favorites uf ON u.id = uf.user_id
WHERE u.is_active = true
GROUP BY u.id, u.username, u.total_score;

-- Functions for common operations

-- Function to update user total score
CREATE OR REPLACE FUNCTION update_user_total_score(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    new_score INTEGER;
BEGIN
    SELECT 
        COALESCE(SUM(p.score), 0) + COALESCE(SUM(ub.badge_points), 0)
    INTO new_score
    FROM users u
    LEFT JOIN prompts p ON u.id = p.user_id AND p.status = 'active'
    LEFT JOIN (
        SELECT ub.user_id, SUM(b.points_reward) as badge_points
        FROM user_badges ub
        JOIN badges b ON ub.badge_id = b.id
        GROUP BY ub.user_id
    ) ub ON u.id = ub.user_id
    WHERE u.id = user_uuid;
    
    UPDATE users SET total_score = new_score WHERE id = user_uuid;
    
    RETURN new_score;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate prompt score
CREATE OR REPLACE FUNCTION calculate_prompt_score(prompt_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    avg_rating DECIMAL;
    rating_count INTEGER;
    usage_count INTEGER;
    days_old INTEGER;
    calculated_score INTEGER;
BEGIN
    SELECT 
        COALESCE(AVG(ps.score), 0),
        COUNT(ps.id),
        p.usage_count,
        EXTRACT(DAY FROM NOW() - p.created_at)
    INTO avg_rating, rating_count, usage_count, days_old
    FROM prompts p
    LEFT JOIN prompt_scores ps ON p.id = ps.prompt_id
    WHERE p.id = prompt_uuid
    GROUP BY p.usage_count, p.created_at;
    
    -- Scoring algorithm
    calculated_score := 
        (avg_rating * 20)::INTEGER +  -- Rating component (0-100)
        LEAST(usage_count * 2, 50) +  -- Usage component (max 50)
        GREATEST(20 - days_old, 0);   -- Recency bonus (max 20)
    
    UPDATE prompts SET score = calculated_score WHERE id = prompt_uuid;
    
    RETURN calculated_score;
END;
$$ LANGUAGE plpgsql;

-- Triggers

-- Update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sub_categories_updated_at BEFORE UPDATE ON sub_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prompts_updated_at BEFORE UPDATE ON prompts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_badges_updated_at BEFORE UPDATE ON badges
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-calculate prompt score on rating changes
CREATE OR REPLACE FUNCTION trigger_calculate_prompt_score()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM calculate_prompt_score(NEW.prompt_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_calculate_prompt_score 
    AFTER INSERT OR UPDATE ON prompt_scores
    FOR EACH ROW EXECUTE FUNCTION trigger_calculate_prompt_score();

-- Update user total score when prompt score changes
CREATE OR REPLACE FUNCTION trigger_update_user_score()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM update_user_total_score(NEW.user_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_update_user_score 
    AFTER UPDATE OF score ON prompts
    FOR EACH ROW EXECUTE FUNCTION trigger_update_user_score();

-- Sample data for testing

-- Insert default categories
INSERT INTO categories (name, slug, description, color_hex, sort_order) VALUES
('Writing & Content', 'writing-content', 'Prompts for creative writing, copywriting, and content creation', '#8b5cf6', 1),
('Code & Development', 'code-development', 'Programming and software development prompts', '#06b6d4', 2),
('Business & Marketing', 'business-marketing', 'Business strategy, marketing, and entrepreneurship prompts', '#10b981', 3),
('Education & Learning', 'education-learning', 'Educational content and learning assistance prompts', '#f59e0b', 4),
('Creative & Design', 'creative-design', 'Design, art, and creative project prompts', '#ef4444', 5),
('Personal & Lifestyle', 'personal-lifestyle', 'Personal development and lifestyle prompts', '#8b5cf6', 6);

-- Insert sample badges
INSERT INTO badges (name, description, badge_type, criteria, points_reward) VALUES
('First Steps', 'Submit your first prompt', 'submission', '{"prompts_count": 1}', 10),
('Getting Started', 'Submit 5 prompts', 'submission', '{"prompts_count": 5}', 25),
('Prolific Creator', 'Submit 25 prompts', 'submission', '{"prompts_count": 25}', 100),
('Popular Choice', 'Get 100 total uses across all prompts', 'usage', '{"total_usage": 100}', 50),
('Crowd Favorite', 'Get 500 total uses across all prompts', 'usage', '{"total_usage": 500}', 200),
('Highly Rated', 'Maintain 4+ star average with 10+ ratings', 'score', '{"avg_rating": 4.0, "min_ratings": 10}', 75),
('Excellence', 'Maintain 4.5+ star average with 25+ ratings', 'score', '{"avg_rating": 4.5, "min_ratings": 25}', 150);

-- Row Level Security (RLS) policies for Hasura

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_reports ENABLE ROW LEVEL SECURITY;

-- User policies
CREATE POLICY "Users can view active users" ON users
    FOR SELECT USING (is_active = true);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (id = current_setting('hasura.user_id')::uuid);

-- Category policies (public read)
CREATE POLICY "Anyone can view active categories" ON categories
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage categories" ON categories
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = current_setting('hasura.user_id')::uuid 
            AND role IN ('admin', 'moderator')
        )
    );

-- Prompt policies
CREATE POLICY "Anyone can view public active prompts" ON prompts
    FOR SELECT USING (is_public = true AND status = 'active');

CREATE POLICY "Users can view own prompts" ON prompts
    FOR SELECT USING (user_id = current_setting('hasura.user_id')::uuid);

CREATE POLICY "Users can create prompts" ON prompts
    FOR INSERT WITH CHECK (user_id = current_setting('hasura.user_id')::uuid);

CREATE POLICY "Users can update own prompts" ON prompts
    FOR UPDATE USING (user_id = current_setting('hasura.user_id')::uuid);

-- Score policies
CREATE POLICY "Anyone can view prompt scores" ON prompt_scores
    FOR SELECT USING (true);

CREATE POLICY "Users can rate prompts" ON prompt_scores
    FOR INSERT WITH CHECK (user_id = current_setting('hasura.user_id')::uuid);

CREATE POLICY "Users can update own ratings" ON prompt_scores
    FOR UPDATE USING (user_id = current_setting('hasura.user_id')::uuid);

-- Badge policies
CREATE POLICY "Anyone can view badges" ON badges
    FOR SELECT USING (is_active = true);

CREATE POLICY "Anyone can view user badges" ON user_badges
    FOR SELECT USING (true);

-- Analytics policies
CREATE POLICY "Users can view own analytics" ON usage_analytics
    FOR SELECT USING (user_id = current_setting('hasura.user_id')::uuid);

CREATE POLICY "Users can create analytics" ON usage_analytics
    FOR INSERT WITH CHECK (
        user_id = current_setting('hasura.user_id')::uuid OR 
        user_id IS NULL
    );