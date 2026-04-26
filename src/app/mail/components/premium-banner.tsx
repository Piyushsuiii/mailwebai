'use client'
import { motion } from 'framer-motion'
import React from 'react'
import StripeButton from './stripe-button'
import { api } from '@/trpc/react'
import { FREE_CREDITS_PER_DAY } from '@/app/constants'
import { getSubscriptionStatus } from '@/lib/stripe-actions'

const PremiumBanner = () => {
    const [isSubscribed, setIsSubscribed] = React.useState(false)
    React.useEffect(() => {
        (async () => {
            const subscriptionStatus = await getSubscriptionStatus()
            setIsSubscribed(subscriptionStatus)
        })()
    }, [])

    const { data: chatbotInteraction } = api.mail.getChatbotInteraction.useQuery()
    const remainingCredits = chatbotInteraction?.remainingCredits || 0

    if (isSubscribed) return (
        <motion.div layout className="bg-gray-900 relative p-4 rounded-lg border overflow-hidden flex flex-col md:flex-row gap-4">
            <img src='/bot.webp' className='md:absolute md:-bottom-6 md:-right-10 h-[180px] w-auto' />
            <div>
                <h1 className='text-white text-xl font-semibold'>Premium Plan</h1>
                <div className="h-2"></div>
                <p className='text-gray-400 text-sm md:max-w-[calc(100%-70px)]'>Ask as many questions as you want</p>
                <div className="h-4"></div>
                <StripeButton />
            </div>
        </motion.div>
    )

    return (
        <motion.div
  layout
  className="relative rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-950 p-5 overflow-hidden"
>
  {/* Subtle Glow */}
  <div className="absolute -top-10 -right-10 h-40 w-40 bg-purple-500/10 blur-3xl rounded-full" />

  <div className="relative z-10 flex flex-col gap-4">

    {/* Header */}
    <div className="flex items-center justify-between">
      <h1 className="text-white text-lg font-semibold tracking-tight">
        AI Plan
      </h1>
      <span className="text-xs px-2 py-1 rounded-full bg-zinc-800 text-zinc-400">
        Free
      </span>
    </div>

    {/* Usage */}
    <div>
      <div className="flex justify-between text-xs text-zinc-400 mb-2">
        <span>{remainingCredits} messages left</span>
        <span>{FREE_CREDITS_PER_DAY} daily</span>
      </div>

      {/* Progress Bar */}
      <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-500"
          style={{
            width: `${(remainingCredits / FREE_CREDITS_PER_DAY) * 100}%`,
          }}
        />
      </div>
    </div>

    {/* Description */}
    <p className="text-sm text-zinc-400 leading-relaxed">
      Unlock unlimited AI responses and priority processing.
    </p>

    {/* CTA */}
    <StripeButton />
  </div>
</motion.div>

    )
}

export default PremiumBanner