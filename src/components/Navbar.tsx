"use client";

import { motion } from "framer-motion";
import { Sparkles, Menu, ChevronRight } from "lucide-react";
import { useState } from "react";

const navLinks = [
    { name: "Features", href: "/#how-it-works" },
    { name: "Pricing", href: "/#pricing" }, 
];

export default function Navbar() {

    const [isHovered, setIsHovered] = useState<string | null>(null);

    return (
        <motion.nav
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 1, type: "spring", stiffness: 50, damping: 20 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[90%] md:w-auto"
        >
            <div className="relative flex items-center justify-between gap-12 px-2 py-2 md:pl-6 md:pr-2 rounded-full bg-void-navy/60 backdrop-blur-xl border border-white/10 shadow-[0_0_40px_-10px_rgba(124,58,237,0.2)]">

                {/* 1. Logo Section */}
                <a href="/" className="flex items-center gap-2 pl-2 md:pl-0 cursor-pointer group">
                    <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-tr from-electric-violet to-indigo-500 text-white shadow-lg shadow-electric-violet/20 group-hover:shadow-electric-violet/40 transition-shadow">
                        <Sparkles className="w-4 h-4 fill-white" />
                        <div className="absolute inset-0 rounded-lg ring-1 ring-inset ring-white/20" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-bold text-white leading-none tracking-tight">
                            MailAI
                        </span>
                        <span className="text-[10px] text-blue-200/50 font-medium tracking-widest uppercase">
                            Workspace
                        </span>
                    </div>
                </a>

                {/* 2. Navigation Links (Desktop) */}
                <div className="hidden md:flex items-center gap-1 p-1 rounded-full bg-white/5 border border-white/5">
                    {navLinks.map((item) => (
                        <a
                            key={item.name}
                            href={item.href}
                            onMouseEnter={() => setIsHovered(item.name)}
                            onMouseLeave={() => setIsHovered(null)}
                            className="relative px-4 py-1.5 text-xs font-medium text-blue-100/70 hover:text-white transition-colors duration-300"
                        >
                            {isHovered === item.name && (
                                <motion.div
                                    layoutId="nav-pill"
                                    className="absolute inset-0 bg-white/10 rounded-full"
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                />
                            )}
                            <span className="relative z-10">{item.name}</span>
                        </a>
                    ))}
                </div>

                {/* 3. Actions / CTA */}
                <div className="flex items-center gap-3">
                    <a href="/mail" className="hidden md:block text-xs font-medium text-white/70 hover:text-white transition-colors px-2">
                        Sign In
                    </a>

                    <a href="/mail" className="group text-black relative px-5 py-2.5 rounded-full bg-gradient-to-b from-white to-blue-50 text-void-navy text-xs font-bold overflow-hidden transition-transform active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] flex items-center gap-1">
                        <div className="absolute text-black inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/80 to-transparent z-10" />
                        <span>Get Started</span> 
                        <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform text-electric-violet" />
                    </a>

                    <button className="md:hidden p-2 text-white/70 hover:text-white">
                        <Menu className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </motion.nav>
    );
}