'use client'

import { useQuery } from '@tanstack/react-query'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { motion } from 'framer-motion'
import { Star, Eye, Copy, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { formatRelativeTime, truncateText, getScoreColor } from '@/lib/utils'
import type { Database } from '@/lib/database.types'

export function FeaturedPrompts() {
  const supabase = createClientComponentClient<Database>()

  const { data: prompts, isLoading } = useQuery({
    queryKey: ['featured-prompts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prompts')
        .select(`
          *,
          user:users(username, full_name, avatar_url),
          category:categories(name, slug, color_hex),
          scores:prompt_scores(score),
          _count:prompt_scores(count)
        `)
        .eq('status', 'active')
        .eq('is_public', true)
        .eq('is_featured', true)
        .order('score', { ascending: false })
        .limit(6)

      if (error) throw error
      return data
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  if (isLoading) {
    return (
      <section className="py-16 bg-gray-50">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mx-auto mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-96 mx-auto mb-12"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg p-6 h-64"></div>
              ))}
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="py-16 bg-gray-50">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Featured Prompts
          </h2>
          <p className="mt-4 text-lg leading-8 text-gray-600">
            Discover the highest-rated prompts from our community of creators
          </p>
        </div>

        <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-6 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-3">
          {prompts?.map((prompt, index) => (
            <motion.div
              key={prompt.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="group relative bg-white rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100"
            >
              {/* Category badge */}
              <div className="flex items-center justify-between mb-4">
                <span 
                  className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
                  style={{ backgroundColor: prompt.category?.color_hex || '#6366f1' }}
                >
                  {prompt.category?.name}
                </span>
                <div className={`text-sm font-semibold ${getScoreColor(prompt.score || 0)}`}>
                  {prompt.score || 0} pts
                </div>
              </div>

              {/* Title and content */}
              <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                {truncateText(prompt.title, 60)}
              </h3>
              <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                {truncateText(prompt.content, 120)}
              </p>

              {/* Stats */}
              <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                <div className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  {prompt.usage_count || 0}
                </div>
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3" />
                  {prompt.scores?.length || 0}
                </div>
                <div className="flex items-center gap-1">
                  <Copy className="h-3 w-3" />
                  Copy
                </div>
              </div>

              {/* Author and date */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-semibold">
                    {prompt.user?.username?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div className="text-xs text-gray-500">
                    {prompt.user?.username} • {formatRelativeTime(prompt.created_at)}
                  </div>
                </div>
              </div>

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </motion.div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Button asChild variant="outline" size="lg">
            <Link href="/prompts">
              View All Prompts
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}