/**
 * Prompt Scoring Algorithm
 * Calculates scores based on multiple factors including ratings, usage, and recency
 */

class PromptScoringEngine {
  constructor() {
    this.weights = {
      rating: 0.4,      // 40% weight for user ratings
      usage: 0.3,       // 30% weight for usage frequency
      recency: 0.2,     // 20% weight for how recent the prompt is
      engagement: 0.1   // 10% weight for engagement metrics
    };
    
    this.maxScores = {
      rating: 100,      // Max 100 points from ratings
      usage: 50,        // Max 50 points from usage
      recency: 20,      // Max 20 points from recency
      engagement: 30    // Max 30 points from engagement
    };
  }

  /**
   * Calculate the overall score for a prompt
   * @param {Object} promptData - The prompt data including ratings, usage, etc.
   * @returns {number} - The calculated score
   */
  calculateScore(promptData) {
    const ratingScore = this.calculateRatingScore(promptData);
    const usageScore = this.calculateUsageScore(promptData);
    const recencyScore = this.calculateRecencyScore(promptData);
    const engagementScore = this.calculateEngagementScore(promptData);

    const totalScore = Math.round(
      (ratingScore * this.weights.rating) +
      (usageScore * this.weights.usage) +
      (recencyScore * this.weights.recency) +
      (engagementScore * this.weights.engagement)
    );

    return Math.max(0, Math.min(200, totalScore)); // Cap between 0-200
  }

  /**
   * Calculate rating-based score
   * @param {Object} promptData
   * @returns {number}
   */
  calculateRatingScore(promptData) {
    const { averageRating = 0, ratingCount = 0 } = promptData;
    
    if (ratingCount === 0) return 0;
    
    // Base score from average rating (1-5 scale to 0-100)
    let score = ((averageRating - 1) / 4) * this.maxScores.rating;
    
    // Apply confidence multiplier based on number of ratings
    const confidenceMultiplier = this.getConfidenceMultiplier(ratingCount);
    score *= confidenceMultiplier;
    
    return Math.round(score);
  }

  /**
   * Calculate usage-based score
   * @param {Object} promptData
   * @returns {number}
   */
  calculateUsageScore(promptData) {
    const { usageCount = 0, daysSinceCreated = 0 } = promptData;
    
    if (usageCount === 0) return 0;
    
    // Calculate usage velocity (uses per day)
    const usageVelocity = daysSinceCreated > 0 ? usageCount / daysSinceCreated : usageCount;
    
    // Logarithmic scaling to prevent extremely high usage from dominating
    const baseScore = Math.log10(usageCount + 1) * 15;
    const velocityBonus = Math.min(usageVelocity * 5, 20);
    
    return Math.round(Math.min(baseScore + velocityBonus, this.maxScores.usage));
  }

  /**
   * Calculate recency-based score
   * @param {Object} promptData
   * @returns {number}
   */
  calculateRecencyScore(promptData) {
    const { daysSinceCreated = 0, lastUsedDaysAgo = null } = promptData;
    
    // Recency decay function - newer prompts get higher scores
    let recencyScore = Math.max(0, this.maxScores.recency - (daysSinceCreated * 0.5));
    
    // Bonus for recently used prompts
    if (lastUsedDaysAgo !== null && lastUsedDaysAgo < 7) {
      recencyScore += Math.max(0, 10 - lastUsedDaysAgo);
    }
    
    return Math.round(Math.min(recencyScore, this.maxScores.recency));
  }

  /**
   * Calculate engagement-based score
   * @param {Object} promptData
   * @returns {number}
   */
  calculateEngagementScore(promptData) {
    const { 
      favoriteCount = 0, 
      shareCount = 0, 
      viewCount = 0,
      commentCount = 0 
    } = promptData;
    
    // Weight different engagement types
    const engagementScore = 
      (favoriteCount * 3) +      // Favorites are most valuable
      (shareCount * 2) +         // Shares are valuable
      (commentCount * 1.5) +     // Comments show engagement
      (viewCount * 0.1);         // Views are least valuable but still count
    
    return Math.round(Math.min(engagementScore, this.maxScores.engagement));
  }

  /**
   * Get confidence multiplier based on number of ratings
   * @param {number} ratingCount
   * @returns {number}
   */
  getConfidenceMultiplier(ratingCount) {
    if (ratingCount >= 50) return 1.0;
    if (ratingCount >= 25) return 0.95;
    if (ratingCount >= 10) return 0.9;
    if (ratingCount >= 5) return 0.8;
    if (ratingCount >= 3) return 0.7;
    return 0.6; // Minimum confidence for prompts with 1-2 ratings
  }

  /**
   * Calculate category-specific adjustments
   * @param {Object} promptData
   * @param {string} categoryId
   * @returns {number}
   */
  applyCategoryAdjustments(score, promptData, categoryId) {
    // Category-specific multipliers
    const categoryMultipliers = {
      'writing-content': 1.0,
      'code-development': 1.1,    // Slightly boost technical content
      'business-marketing': 1.0,
      'education-learning': 1.05, // Slight boost for educational content
      'creative-design': 1.0,
      'personal-lifestyle': 0.95  // Slightly lower for personal content
    };
    
    const multiplier = categoryMultipliers[categoryId] || 1.0;
    return Math.round(score * multiplier);
  }

  /**
   * Batch calculate scores for multiple prompts
   * @param {Array} prompts
   * @returns {Array}
   */
  batchCalculateScores(prompts) {
    return prompts.map(prompt => ({
      ...prompt,
      calculatedScore: this.calculateScore(prompt),
      scoreBreakdown: this.getScoreBreakdown(prompt)
    }));
  }

  /**
   * Get detailed score breakdown for debugging/analytics
   * @param {Object} promptData
   * @returns {Object}
   */
  getScoreBreakdown(promptData) {
    const ratingScore = this.calculateRatingScore(promptData);
    const usageScore = this.calculateUsageScore(promptData);
    const recencyScore = this.calculateRecencyScore(promptData);
    const engagementScore = this.calculateEngagementScore(promptData);

    return {
      rating: {
        score: ratingScore,
        weight: this.weights.rating,
        contribution: Math.round(ratingScore * this.weights.rating)
      },
      usage: {
        score: usageScore,
        weight: this.weights.usage,
        contribution: Math.round(usageScore * this.weights.usage)
      },
      recency: {
        score: recencyScore,
        weight: this.weights.recency,
        contribution: Math.round(recencyScore * this.weights.recency)
      },
      engagement: {
        score: engagementScore,
        weight: this.weights.engagement,
        contribution: Math.round(engagementScore * this.weights.engagement)
      }
    };
  }
}

/**
 * Badge Eligibility Engine
 * Determines which badges users are eligible for based on their activity
 */
class BadgeEligibilityEngine {
  constructor() {
    this.badgeCriteria = {
      // Submission-based badges
      'first-steps': {
        type: 'submission',
        check: (stats) => stats.totalPrompts >= 1
      },
      'getting-started': {
        type: 'submission',
        check: (stats) => stats.totalPrompts >= 5
      },
      'prolific-creator': {
        type: 'submission',
        check: (stats) => stats.totalPrompts >= 25
      },
      'content-machine': {
        type: 'submission',
        check: (stats) => stats.totalPrompts >= 100
      },

      // Usage-based badges
      'popular-choice': {
        type: 'usage',
        check: (stats) => stats.totalUsage >= 100
      },
      'crowd-favorite': {
        type: 'usage',
        check: (stats) => stats.totalUsage >= 500
      },
      'viral-creator': {
        type: 'usage',
        check: (stats) => stats.totalUsage >= 2000
      },

      // Rating-based badges
      'well-received': {
        type: 'score',
        check: (stats) => stats.averageRating >= 3.5 && stats.totalRatings >= 5
      },
      'highly-rated': {
        type: 'score',
        check: (stats) => stats.averageRating >= 4.0 && stats.totalRatings >= 10
      },
      'excellence': {
        type: 'score',
        check: (stats) => stats.averageRating >= 4.5 && stats.totalRatings >= 25
      },
      'perfection': {
        type: 'score',
        check: (stats) => stats.averageRating >= 4.8 && stats.totalRatings >= 50
      },

      // Streak-based badges
      'consistent': {
        type: 'streak',
        check: (stats) => stats.longestStreak >= 7
      },
      'dedicated': {
        type: 'streak',
        check: (stats) => stats.longestStreak >= 30
      },

      // Special achievement badges
      'trendsetter': {
        type: 'special',
        check: (stats) => stats.featuredPrompts >= 1
      },
      'community-favorite': {
        type: 'special',
        check: (stats) => stats.topRankedPrompts >= 3
      }
    };
  }

  /**
   * Check which badges a user is eligible for
   * @param {Object} userStats
   * @param {Array} currentBadges
   * @returns {Array}
   */
  checkEligibility(userStats, currentBadges = []) {
    const currentBadgeIds = new Set(currentBadges.map(b => b.badgeId));
    const eligibleBadges = [];

    for (const [badgeId, criteria] of Object.entries(this.badgeCriteria)) {
      if (!currentBadgeIds.has(badgeId) && criteria.check(userStats)) {
        eligibleBadges.push({
          badgeId,
          type: criteria.type,
          earnedAt: new Date().toISOString()
        });
      }
    }

    return eligibleBadges;
  }

  /**
   * Calculate user statistics for badge eligibility
   * @param {Object} userData
   * @returns {Object}
   */
  calculateUserStats(userData) {
    const {
      prompts = [],
      promptScores = [],
      usageAnalytics = [],
      userBadges = []
    } = userData;

    // Calculate basic stats
    const totalPrompts = prompts.length;
    const activePrompts = prompts.filter(p => p.status === 'active').length;
    const totalUsage = prompts.reduce((sum, p) => sum + (p.usageCount || 0), 0);
    
    // Calculate rating stats
    const ratingsReceived = promptScores.filter(s => 
      prompts.some(p => p.id === s.promptId)
    );
    const totalRatings = ratingsReceived.length;
    const averageRating = totalRatings > 0 
      ? ratingsReceived.reduce((sum, r) => sum + r.score, 0) / totalRatings 
      : 0;

    // Calculate streak (simplified - days with activity)
    const activityDates = new Set();
    prompts.forEach(p => {
      activityDates.add(p.createdAt.split('T')[0]);
    });
    usageAnalytics.forEach(a => {
      activityDates.add(a.createdAt.split('T')[0]);
    });

    const longestStreak = this.calculateLongestStreak(Array.from(activityDates));

    // Special achievements
    const featuredPrompts = prompts.filter(p => p.isFeatured).length;
    const topRankedPrompts = prompts.filter(p => p.score >= 150).length;

    return {
      totalPrompts,
      activePrompts,
      totalUsage,
      totalRatings,
      averageRating: Math.round(averageRating * 100) / 100,
      longestStreak,
      featuredPrompts,
      topRankedPrompts,
      currentBadgeCount: userBadges.length
    };
  }

  /**
   * Calculate longest activity streak
   * @param {Array} dates
   * @returns {number}
   */
  calculateLongestStreak(dates) {
    if (dates.length === 0) return 0;

    dates.sort();
    let longestStreak = 1;
    let currentStreak = 1;

    for (let i = 1; i < dates.length; i++) {
      const prevDate = new Date(dates[i - 1]);
      const currentDate = new Date(dates[i]);
      const dayDiff = (currentDate - prevDate) / (1000 * 60 * 60 * 24);

      if (dayDiff === 1) {
        currentStreak++;
        longestStreak = Math.max(longestStreak, currentStreak);
      } else if (dayDiff > 1) {
        currentStreak = 1;
      }
    }

    return longestStreak;
  }
}

/**
 * Leaderboard Engine
 * Manages different types of leaderboards and rankings
 */
class LeaderboardEngine {
  constructor() {
    this.leaderboardTypes = {
      global: 'global_score',
      category: 'category_score',
      usage: 'total_usage',
      rating: 'average_rating',
      recent: 'recent_activity'
    };
  }

  /**
   * Generate global leaderboard
   * @param {Array} users
   * @param {number} limit
   * @returns {Array}
   */
  generateGlobalLeaderboard(users, limit = 100) {
    return users
      .filter(user => user.isActive && user.totalScore > 0)
      .sort((a, b) => {
        // Primary sort by total score
        if (b.totalScore !== a.totalScore) {
          return b.totalScore - a.totalScore;
        }
        // Secondary sort by prompt count
        if (b.totalPrompts !== a.totalPrompts) {
          return b.totalPrompts - a.totalPrompts;
        }
        // Tertiary sort by average rating
        return b.averageRating - a.averageRating;
      })
      .slice(0, limit)
      .map((user, index) => ({
        ...user,
        rank: index + 1,
        leaderboardType: 'global'
      }));
  }

  /**
   * Generate category-specific leaderboard
   * @param {Array} users
   * @param {string} categoryId
   * @param {number} limit
   * @returns {Array}
   */
  generateCategoryLeaderboard(users, categoryId, limit = 50) {
    return users
      .filter(user => user.isActive)
      .map(user => {
        const categoryPrompts = user.prompts?.filter(p => 
          p.categoryId === categoryId && p.status === 'active'
        ) || [];
        
        const categoryScore = categoryPrompts.reduce((sum, p) => sum + p.score, 0);
        const categoryUsage = categoryPrompts.reduce((sum, p) => sum + p.usageCount, 0);
        
        return {
          ...user,
          categoryPrompts: categoryPrompts.length,
          categoryScore,
          categoryUsage,
          categoryAverageRating: this.calculateCategoryAverageRating(categoryPrompts)
        };
      })
      .filter(user => user.categoryPrompts > 0)
      .sort((a, b) => {
        // Primary sort by category score
        if (b.categoryScore !== a.categoryScore) {
          return b.categoryScore - a.categoryScore;
        }
        // Secondary sort by category usage
        if (b.categoryUsage !== a.categoryUsage) {
          return b.categoryUsage - a.categoryUsage;
        }
        // Tertiary sort by category average rating
        return b.categoryAverageRating - a.categoryAverageRating;
      })
      .slice(0, limit)
      .map((user, index) => ({
        ...user,
        rank: index + 1,
        leaderboardType: 'category',
        categoryId
      }));
  }

  /**
   * Calculate average rating for category prompts
   * @param {Array} prompts
   * @returns {number}
   */
  calculateCategoryAverageRating(prompts) {
    if (prompts.length === 0) return 0;
    
    const totalRatings = prompts.reduce((sum, p) => sum + (p.ratingCount || 0), 0);
    if (totalRatings === 0) return 0;
    
    const weightedSum = prompts.reduce((sum, p) => 
      sum + ((p.averageRating || 0) * (p.ratingCount || 0)), 0
    );
    
    return Math.round((weightedSum / totalRatings) * 100) / 100;
  }

  /**
   * Generate trending prompts leaderboard
   * @param {Array} prompts
   * @param {number} days
   * @param {number} limit
   * @returns {Array}
   */
  generateTrendingLeaderboard(prompts, days = 7, limit = 20) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return prompts
      .filter(prompt => 
        prompt.status === 'active' && 
        prompt.isPublic &&
        new Date(prompt.createdAt) >= cutoffDate
      )
      .sort((a, b) => {
        // Calculate trending score based on recent activity
        const aTrendingScore = this.calculateTrendingScore(a, days);
        const bTrendingScore = this.calculateTrendingScore(b, days);
        return bTrendingScore - aTrendingScore;
      })
      .slice(0, limit)
      .map((prompt, index) => ({
        ...prompt,
        rank: index + 1,
        trendingScore: this.calculateTrendingScore(prompt, days),
        leaderboardType: 'trending'
      }));
  }

  /**
   * Calculate trending score for a prompt
   * @param {Object} prompt
   * @param {number} days
   * @returns {number}
   */
  calculateTrendingScore(prompt, days) {
    const age = (Date.now() - new Date(prompt.createdAt)) / (1000 * 60 * 60 * 24);
    const ageMultiplier = Math.max(0.1, 1 - (age / days));
    
    return Math.round(
      (prompt.score || 0) * ageMultiplier +
      (prompt.usageCount || 0) * 2 * ageMultiplier +
      (prompt.averageRating || 0) * 10 * ageMultiplier
    );
  }
}

module.exports = {
  PromptScoringEngine,
  BadgeEligibilityEngine,
  LeaderboardEngine
};