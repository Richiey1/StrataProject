'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Star } from 'lucide-react'

const testimonials = [
  {
    name: 'Alex Rivera',
    role: 'DeFi Founder',
    content: 'StrataForge made our token launch seamless. We deployed our governance token in minutes without writing a single line of Solidity.',
    rating: 5
  },
  {
    name: 'Sarah Chen',
    role: 'Marketing Lead',
    content: 'The campaign management tools are a game changer. We distributed airdrops to 10k users with zero technical overhead.',
    rating: 5
  },
  {
    name: 'Marcus Thorne',
    role: 'NFT Artist',
    content: 'Democratizing token creation is an understatement. This is the simplest Web3 platform I have ever used.',
    rating: 5
  }
]

export default function Testimonials() {
  return (
    <section className="py-24 bg-[#201726]/50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">
            Trusted by the Community
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Join thousands of creators and developers who have launched their projects with StrataForge.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              viewport={{ once: true }}
              className="p-8 rounded-3xl bg-white/5 border border-white/10 hover:border-white/20 transition-all group"
            >
              <div className="flex gap-1 mb-6">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                ))}
              </div>
              <p className="text-gray-300 mb-8 italic leading-relaxed text-sm">
                "{testimonial.content}"
              </p>
              <div>
                <h4 className="font-bold text-white text-sm">{testimonial.name}</h4>
                <p className="text-xs text-gray-500">{testimonial.role}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
