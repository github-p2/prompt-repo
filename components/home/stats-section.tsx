'use client'

import { useQuery } from '@tanstack/react-query'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { motion } from 'framer-motion'
import { Users, FileText, Trophy, TrendingUp } from 'lucide-react'
import type { Database } from '@/lib/database.types'

export function StatsSection() {
  const supabase = createClientComponentClient<Database>()

  const { data: stats } = useQuery({
    queryKey: ['platform-stats'],
    queryFn: async () => {
      const [
        { count: totalUsers },
        { count: totalPrompts },
        { count: totalCategories },
        { data: topScore }
      ] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('prompts').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('categories').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('prompts').select('score').order('score', { ascending: false }).limit(1).single()
      ])

      return {
        totalUsers: totalUsers || 0,
        totalPrompts: totalPrompts || 0,
        totalCategories: totalCategories || 0,
        highestScore: topScore?.score || 0
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  const statsData = [
    {
      name: 'Active Users',
      value: stats?.totalUsers || 0,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      name: 'Quality Prompts',
      value: stats?.totalPrompts || 0,
      icon: FileText,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      name: 'Categories',
      value: stats?.totalCategories || 0,
      icon: Trophy,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      name: 'Highest Score',
      value: stats?.highestScore || 0,
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
  ]

  return (
    <section className="py-16 bg-white">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Trusted by creators worldwide
          </h2>
          <p className="mt-4 text-lg leading-8 text-gray-600">
            Join a growing community of AI enthusiasts sharing and discovering amazing prompts
          </p>
        </div>
        
        <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-4">
          {statsData.map((stat, index) => (
            <motion.div
              key={stat.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="flex flex-col items-center justify-center rounded-2xl bg-gray-50 p-8 text-center"
            >
              <div className={`rounded-full p-3 ${stat.bgColor}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <dt className="mt-4 text-sm font-semibold leading-6 text-gray-600">
                {stat.name}
              </dt>
              <dd className="order-first text-3xl font-bold tracking-tight text-gray-900">
                {stat.value.toLocaleString()}
              </dd>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}