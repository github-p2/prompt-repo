# Prompt Repository System - Technical Architecture Specification

## 1. High-Level Architecture Overview

### System Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Client    │    │   iOS Client    │    │ Android Client  │
│   (React/Next)  │    │    (Swift)      │    │   (Kotlin)      │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────┴─────────────┐
                    │     API Gateway           │
                    │   (Authentication &       │
                    │    Rate Limiting)         │
                    └─────────────┬─────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │    Hasura GraphQL         │
                    │   (Real-time Queries      │
                    │   & Subscriptions)        │
                    └─────────────┬─────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │   PostgreSQL Database     │
                    │  (Primary Data Store)     │
                    └───────────────────────────┘

┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Redis Cache   │    │  File Storage   │    │ Push Notification│
│ (Session/Cache) │    │   (AWS S3)      │    │   Service       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Core Components
- **Frontend Clients**: Cross-platform applications (Web, iOS, Android)
- **API Gateway**: Authentication, rate limiting, and request routing
- **Hasura GraphQL**: Real-time data layer with subscriptions
- **PostgreSQL**: Primary database with JSONB support
- **Redis**: Caching and session management
- **Push Notification Service**: Real-time notifications for achievements

## 2. Database Schema Design

### Core Tables

#### Users Table
```sql
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
    preferences JSONB DEFAULT '{}'
);

CREATE TYPE user_role AS ENUM ('admin', 'moderator', 'user');
```

#### Categories Table
```sql
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    icon_url TEXT,
    color_hex VARCHAR(7),
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);
```

#### Sub-Categories Table
```sql
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
    UNIQUE(category_id, slug)
);
```

#### Prompts Table
```sql
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
    metadata JSONB DEFAULT '{}'
);

CREATE TYPE prompt_status AS ENUM ('active', 'pending', 'rejected', 'archived');
```

#### Prompt Scores Table
```sql
CREATE TABLE prompt_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prompt_id UUID NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    score INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(prompt_id, user_id)
);
```

#### Badges Table
```sql
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
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TYPE badge_type AS ENUM ('submission', 'usage', 'score', 'streak', 'special');
```

#### User Badges Table
```sql
CREATE TABLE user_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    badge_id UUID NOT NULL REFERENCES badges(id),
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    progress JSONB DEFAULT '{}',
    UNIQUE(user_id, badge_id)
);
```

#### Usage Analytics Table
```sql
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

CREATE TYPE analytics_action AS ENUM ('view', 'copy', 'share', 'favorite', 'report');
```

#### Leaderboards View
```sql
CREATE VIEW leaderboards AS
SELECT 
    u.id,
    u.username,
    u.full_name,
    u.avatar_url,
    u.total_score,
    COUNT(p.id) as total_prompts,
    AVG(ps.score) as avg_rating,
    ROW_NUMBER() OVER (ORDER BY u.total_score DESC) as rank
FROM users u
LEFT JOIN prompts p ON u.id = p.user_id AND p.status = 'active'
LEFT JOIN prompt_scores ps ON p.id = ps.prompt_id
WHERE u.is_active = true
GROUP BY u.id, u.username, u.full_name, u.avatar_url, u.total_score;
```

### Indexes for Performance
```sql
-- User indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);

-- Prompt indexes
CREATE INDEX idx_prompts_user_id ON prompts(user_id);
CREATE INDEX idx_prompts_category_id ON prompts(category_id);
CREATE INDEX idx_prompts_sub_category_id ON prompts(sub_category_id);
CREATE INDEX idx_prompts_status ON prompts(status);
CREATE INDEX idx_prompts_created_at ON prompts(created_at DESC);
CREATE INDEX idx_prompts_score ON prompts(score DESC);
CREATE INDEX idx_prompts_tags ON prompts USING GIN(tags);

-- Analytics indexes
CREATE INDEX idx_usage_analytics_user_id ON usage_analytics(user_id);
CREATE INDEX idx_usage_analytics_prompt_id ON usage_analytics(prompt_id);
CREATE INDEX idx_usage_analytics_action ON usage_analytics(action);
CREATE INDEX idx_usage_analytics_created_at ON usage_analytics(created_at DESC);
```

## 3. API Architecture & Endpoints

### GraphQL Schema (Hasura)

#### Queries
```graphql
type Query {
  # User queries
  users(where: users_bool_exp, order_by: [users_order_by!]): [users!]!
  users_by_pk(id: uuid!): users
  
  # Prompt queries
  prompts(where: prompts_bool_exp, order_by: [prompts_order_by!]): [prompts!]!
  prompts_by_pk(id: uuid!): prompts
  
  # Category queries
  categories(where: categories_bool_exp): [categories!]!
  sub_categories(where: sub_categories_bool_exp): [sub_categories!]!
  
  # Leaderboard queries
  leaderboards(limit: Int, offset: Int): [leaderboards!]!
  category_leaderboards(category_id: uuid!, limit: Int): [leaderboards!]!
  
  # Badge queries
  badges: [badges!]!
  user_badges(user_id: uuid!): [user_badges!]!
  
  # Analytics
  user_analytics(user_id: uuid!, from_date: timestamptz, to_date: timestamptz): [usage_analytics!]!
}
```

#### Mutations
```graphql
type Mutation {
  # Prompt mutations
  insert_prompts_one(object: prompts_insert_input!): prompts
  update_prompts_by_pk(pk_columns: prompts_pk_columns_input!, _set: prompts_set_input!): prompts
  delete_prompts_by_pk(id: uuid!): prompts
  
  # Scoring
  insert_prompt_scores_one(object: prompt_scores_insert_input!): prompt_scores
  
  # Category management (admin only)
  insert_categories_one(object: categories_insert_input!): categories
  update_categories_by_pk(pk_columns: categories_pk_columns_input!, _set: categories_set_input!): categories
  
  # Usage tracking
  track_usage(prompt_id: uuid!, action: analytics_action!): usage_analytics
}
```

#### Subscriptions
```graphql
type Subscription {
  # Real-time prompt scores
  prompt_scores(where: prompt_scores_bool_exp): [prompt_scores!]!
  
  # Real-time leaderboard updates
  leaderboards: [leaderboards!]!
  
  # User badge notifications
  user_badges(where: user_badges_bool_exp): [user_badges!]!
  
  # New prompts in categories
  prompts(where: prompts_bool_exp): [prompts!]!
}
```

### REST API Endpoints (Supplementary)

#### Authentication
```
POST /auth/login
POST /auth/register
POST /auth/logout
POST /auth/refresh
GET  /auth/profile
PUT  /auth/profile
```

#### File Upload
```
POST /upload/avatar
POST /upload/badge-icon
POST /upload/category-icon
```

#### Analytics & Reporting
```
GET  /analytics/dashboard
GET  /analytics/user-stats/:userId
GET  /analytics/prompt-performance/:promptId
GET  /analytics/category-stats/:categoryId
```

## 4. Technology Stack Recommendations

### Frontend
**Web Application**
- **Framework**: Next.js 14 with App Router
- **UI Library**: Tailwind CSS + Headless UI
- **State Management**: Zustand or Redux Toolkit
- **GraphQL Client**: Apollo Client with subscriptions
- **Charts**: Recharts or Chart.js
- **Authentication**: NextAuth.js

**Mobile Applications**
- **iOS**: Swift + SwiftUI
- **Android**: Kotlin + Jetpack Compose
- **Cross-platform Alternative**: React Native with Expo

### Backend
- **GraphQL Engine**: Hasura Cloud
- **Database**: PostgreSQL 15+
- **Caching**: Redis 7+
- **File Storage**: AWS S3 or Cloudinary
- **Authentication**: Hasura JWT or Auth0
- **Push Notifications**: Firebase Cloud Messaging

### Infrastructure
- **Hosting**: Vercel (Frontend) + Hasura Cloud (Backend)
- **CDN**: Cloudflare
- **Monitoring**: Sentry + DataDog
- **CI/CD**: GitHub Actions

## 5. Feature Breakdown by Component

### Admin Dashboard Features
1. **User Management**
   - View all users with filtering and search
   - User role management (admin, moderator, user)
   - Account suspension/activation
   - User activity monitoring

2. **Content Moderation**
   - Review pending prompts
   - Approve/reject submissions
   - Bulk moderation actions
   - Content flagging system

3. **Category Management**
   - CRUD operations for categories and sub-categories
   - Category ordering and organization
   - Icon and color customization

4. **Badge System Configuration**
   - Create custom badges with criteria
   - Set point rewards and achievements
   - Badge icon management
   - Achievement tracking

5. **Analytics Dashboard**
   - User engagement metrics
   - Popular prompts and categories
   - Growth analytics
   - Revenue tracking (if applicable)

### User Application Features
1. **Prompt Management**
   - Submit new prompts with rich text editor
   - Category and sub-category selection
   - Tag management
   - Draft saving functionality

2. **Discovery & Search**
   - Browse prompts by category
   - Advanced search with filters
   - Trending and featured prompts
   - Personalized recommendations

3. **Scoring & Feedback**
   - Rate prompts (1-5 stars)
   - Real-time score updates
   - Score visibility toggle
   - Usage tracking

4. **Gamification**
   - Personal dashboard with stats
   - Badge collection display
   - Leaderboard participation
   - Achievement notifications

5. **Social Features**
   - Follow favorite creators
   - Share prompts externally
   - Comment system (future)
   - Favorite prompts collection

## 6. Implementation Phases

### Phase 1: Foundation (Weeks 1-4)
- Database schema implementation
- Hasura GraphQL setup
- Basic authentication system
- Core CRUD operations
- Admin panel basics

### Phase 2: Core Features (Weeks 5-8)
- Prompt submission and management
- Category system
- Basic scoring functionality
- User dashboard
- Search and filtering

### Phase 3: Gamification (Weeks 9-12)
- Badge system implementation
- Leaderboards
- Point scoring algorithm
- Achievement notifications
- Analytics tracking

### Phase 4: Mobile Apps (Weeks 13-16)
- iOS app development
- Android app development
- Cross-platform testing
- App store submissions

### Phase 5: Advanced Features (Weeks 17-20)
- Real-time subscriptions
- Advanced analytics
- Performance optimization
- Social features
- Push notifications

### Phase 6: Polish & Launch (Weeks 21-24)
- UI/UX refinements
- Performance testing
- Security audit
- Beta testing
- Production deployment

## 7. Security Considerations

### Authentication & Authorization
- JWT-based authentication with refresh tokens
- Role-based access control (RBAC)
- API rate limiting per user/IP
- Session management with Redis

### Data Protection
- Input validation and sanitization
- SQL injection prevention (parameterized queries)
- XSS protection with Content Security Policy
- HTTPS enforcement
- Data encryption at rest

### Privacy & Compliance
- GDPR compliance for EU users
- User data anonymization options
- Audit logging for sensitive operations
- Data retention policies

### API Security
- GraphQL query depth limiting
- Query complexity analysis
- Introspection disabled in production
- CORS configuration

## 8. Scalability Planning

### Database Optimization
- Read replicas for analytics queries
- Connection pooling with PgBouncer
- Query optimization and indexing
- Partitioning for large tables (usage_analytics)

### Caching Strategy
- Redis for session storage
- GraphQL query result caching
- CDN for static assets
- Application-level caching

### Performance Monitoring
- Database query performance tracking
- API response time monitoring
- Real-time error tracking
- User experience metrics

### Horizontal Scaling
- Microservices architecture consideration
- Load balancing for API endpoints
- Database sharding strategy
- Auto-scaling infrastructure

## 9. Real-time Features Implementation

### WebSocket Connections
- Hasura GraphQL subscriptions for real-time updates
- Connection management and reconnection logic
- Subscription filtering and optimization

### Push Notifications
- Firebase Cloud Messaging integration
- Badge achievement notifications
- Leaderboard position changes
- New prompt alerts in followed categories

### Live Updates
- Real-time score updates
- Live leaderboard changes
- Instant badge notifications
- Activity feed updates

## 10. Scoring Algorithm Framework

### Base Scoring System
```javascript
const calculatePromptScore = (prompt) => {
  const factors = {
    ratings: prompt.averageRating * 20,      // 0-100 points
    usage: Math.min(prompt.usageCount * 2, 50), // Max 50 points
    recency: getRecencyBonus(prompt.createdAt),  // 0-20 points
    engagement: prompt.commentsCount * 1,        // Variable points
  };
  
  return Math.round(
    factors.ratings + 
    factors.usage + 
    factors.recency + 
    factors.engagement
  );
};
```

### Badge Criteria Examples
```json
{
  "first_submission": {
    "type": "submission",
    "criteria": { "prompts_count": 1 },
    "points": 10
  },
  "popular_creator": {
    "type": "usage",
    "criteria": { "total_usage": 100 },
    "points": 50
  },
  "top_rated": {
    "type": "score",
    "criteria": { "average_rating": 4.5, "min_ratings": 10 },
    "points": 75
  }
}
```

This comprehensive architecture provides a solid foundation for building a scalable, real-time prompt submission and gamification platform that can grow with your user base while maintaining excellent performance and user experience.