import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { HeroSection } from '@/components/home/hero-section'
import { FeaturedPrompts } from '@/components/home/featured-prompts'
import { TopCategories } from '@/components/home/top-categories'
import { LeaderboardPreview } from '@/components/home/leaderboard-preview'
import { StatsSection } from '@/components/home/stats-section'
import type { Database } from '@/lib/database.types'

export default async function HomePage() {
  const supabase = createServerComponentClient<Database>({ cookies })
  
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // If user is logged in, redirect to dashboard
  if (session) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <HeroSection />
      <StatsSection />
      <FeaturedPrompts />
      <TopCategories />
      <LeaderboardPreview />
    </div>
  )
}