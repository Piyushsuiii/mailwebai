"use client";

import { motion } from "framer-motion";
import { Check, Zap, Shield, Crown } from "lucide-react";

const tiers = [
    {
        name: "Starter",
        price: "$0",
        description: "For individuals exploring the power of AI.",
        features: ["Basic Compose & Send", "Smart Filtering", "50 AI Actions / Day", "Standard Support"],
        icon: <Zap className="w-5 h-5" />,
        highlight: false,
        color: "text-blue-200"
    },
    {
        name: "Pro",
        price: "$29",
        description: "For power users who need full automation.",
        features: ["Unlimited AI Actions", "Complex Context Awareness", "Priority Processing", "Custom Workflows", "Early Access Features"],
        icon: <Crown className="w-5 h-5" />,
        highlight: true,
        color: "text-electric-violet"
    },
    {
        name: "Enterprise",
        price: "Custom",
        description: "For teams requiring security and control.",
        features: ["SSO & Advanced Security", "Dedicated Infrastructure", "Audit Logs", "Custom AI Model Fine-tuning", "24/7 Dedicated Support"],
        icon: <Shield className="w-5 h-5" />,
        highlight: false,
        color: "text-neon-emerald"
    }
];

// 1. Parent Variant: Controls the stagger timing
const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.2 // Cards appear one by one with 0.2s delay
        }
    }
};

// 2. Child Variant: The actual card animation
const cardVariants = {
    hidden: {
        opacity: 0,
        y: 50,
        filter: "blur(10px)"
    },
    visible: {
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        transition: {
            duration: 0.6,
            ease: "easeOut"
        }
    }
};

export default function Pricing() {
    return (
        <section id="pricing" className="relative w-full py-32 bg-void-navy overflow-hidden z-20">
           
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-electric-violet/10 blur-[120px] rounded-full pointer-events-none" />

            <div className="max-w-7xl mx-auto px-6 relative z-10">
                
                <motion.div
                    initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
                    whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.8 }}
                    className="text-center mb-20"
                >
                    <h2 className="text-5xl md:text-7xl font-bold mb-6 text-white font-heading tracking-tight">
                        Simple <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-emerald to-electric-violet">
                            Pricing.
                        </span>
                    </h2>
                </motion.div>

                {/* Grid Container with Orchestration */}
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center"
                >
                    {tiers.map((tier, i) => (
                        <motion.div
                            key={i}
                            variants={cardVariants}
                            // We move logic out of the map and into variants to prevent lag
                            className={`relative p-8 rounded-3xl backdrop-blur-xl border transition-all duration-300 ${tier.highlight
                                ? "bg-white/5 border-electric-violet/50 shadow-[0_0_50px_rgba(124,58,237,0.15)] scale-105 z-10"
                                : "bg-white/5 border-white/5 hover:border-white/20 hover:bg-white/10"
                                }`}
                        >
                            {tier.highlight && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-electric-violet rounded-full text-xs font-bold uppercase tracking-widest text-white shadow-lg">
                                    Most Popular
                                </div>
                            )}

                            <div className={`p-3 rounded-2xl bg-white/5 w-fit mb-6 ${tier.color}`}>
                                {tier.icon}
                            </div>

                            <h3 className="text-2xl font-bold text-white mb-2">{tier.name}</h3>
                            <div className="text-4xl font-bold text-white mb-4">
                                {tier.price}
                                <span className="text-lg font-normal text-white/40 ml-1">/mo</span>
                            </div>
                            <p className="text-blue-200/60 mb-8 h-12">{tier.description}</p>

                            <ul className="space-y-4 mb-8">
                                {tier.features.map((feature, j) => (
                                    <li key={j} className="flex items-center gap-3 text-sm text-blue-100/80">
                                        <Check className="w-4 h-4 text-neon-emerald" />
                                        {feature}
                                    </li>
                                ))}
                            </ul>

                            <a href="/mail">

                            <button className={`w-full py-4 rounded-xl font-bold transition-all ${tier.highlight
                                ? "bg-electric-violet text-white hover:bg-electric-violet/90 shadow-lg hover:shadow-electric-violet/25"
                                : "bg-white/5 text-white hover:bg-white/10 border border-white/10"
                                }`}>
                                Get Started
                            </button>

                            </a>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
}
