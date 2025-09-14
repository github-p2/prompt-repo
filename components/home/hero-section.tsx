'use client'

import { Button } from '@/components/ui/button'
import { ArrowRight, Sparkles, Trophy, Users } from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'

export function HeroSection() {
  return (
    <section className="relative overflow-hidden py-20 sm:py-32">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-gradient-to-r from-pink-400/20 to-orange-400/20 rounded-full blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="mb-8 flex justify-center">
              <div className="relative rounded-full px-3 py-1 text-sm leading-6 text-gray-600 ring-1 ring-gray-900/10 hover:ring-gray-900/20">
                🎉 Join thousands of prompt creators worldwide{' '}
                <Link href="/auth/signup" className="font-semibold text-blue-600">
                  <span className="absolute inset-0" aria-hidden="true" />
                  Get started <ArrowRight className="inline h-4 w-4" />
                </Link>
              </div>
            </div>
            
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              Share & Discover{' '}
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                AI Prompts
              </span>
            </h1>
            
            <p className="mt-6 text-lg leading-8 text-gray-600">
              Join the ultimate gamified platform for AI prompt creators. Submit your best prompts, 
              earn badges, climb leaderboards, and discover amazing prompts from the community.
            </p>
            
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Button asChild size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                <Link href="/auth/signup">
                  Get Started Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/prompts">
                  Browse Prompts
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>

        {/* Feature highlights */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-4xl"
        >
          <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-3 lg:gap-y-16">
            <div className="relative pl-16">
              <dt className="text-base font-semibold leading-7 text-gray-900">
                <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                Quality Prompts
              </dt>
              <dd className="mt-2 text-base leading-7 text-gray-600">
                Discover and share high-quality AI prompts across multiple categories and use cases.
              </dd>
            </div>
            
            <div className="relative pl-16">
              <dt className="text-base font-semibold leading-7 text-gray-900">
                <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-purple-600">
                  <Trophy className="h-6 w-6 text-white" />
                </div>
                Gamification
              </dt>
              <dd className="mt-2 text-base leading-7 text-gray-600">
                Earn badges, climb leaderboards, and compete with other creators in a fun, engaging way.
              </dd>
            </div>
            
            <div className="relative pl-16">
              <dt className="text-base font-semibold leading-7 text-gray-900">
                <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-pink-600">
                  <Users className="h-6 w-6 text-white" />
                </div>
                Community
              </dt>
              <dd className="mt-2 text-base leading-7 text-gray-600">
                Join a vibrant community of AI enthusiasts and prompt engineers sharing knowledge.
              </dd>
            </div>
          </dl>
        </motion.div>
      </div>
    </section>
  )
}