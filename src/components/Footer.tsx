"use client";

import { motion } from "framer-motion";
import { Twitter, Linkedin, Github, Send } from "lucide-react";

export default function Footer() {
    return (
        <footer className="relative w-full py-20 bg-void-navy overflow-hidden border-t border-white/5 z-20">
            {/* Background Glow */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] bg-electric-violet/5 blur-[120px] rounded-full pointer-events-none" />

            <div className="max-w-7xl mx-auto px-6 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
                    <div className="col-span-1 md:col-span-2">
                        <h3 className="text-2xl font-bold text-white mb-4 font-heading">
                            Mail Web AI
                        </h3>
                        <p className="text-blue-200/60 max-w-sm mb-8 leading-relaxed">
                            Take Home Assesment by Processity.AI
                        </p>
                        <div>
  <h4 className="font-bold text-white mb-6 uppercase tracking-widest text-xs">
    Follow Us
  </h4>

  <div className="flex gap-4">
    {[
    //   {
    //     name: "Twitter",
    //     icon: Twitter,
    //     href: "https://twitter.com/",
    //   },
      {
        name: "LinkedIn",
        icon: Linkedin,
        href: "https://www.linkedin.com/in/sparshgaur369/",
      },
      {
        name: "GitHub",
        icon: Github,
        href: "https://github.com/sparshgaur369",
      },
    ].map((item) => {
      const Icon = item.icon;

      return (
        <a
          key={item.name}
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={item.name}
          className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-blue-200 hover:bg-electric-violet hover:text-white transition-all duration-300 transform hover:scale-110"
        >
          <Icon className="w-5 h-5" />
        </a>
      );
    })}
  </div>
</div>

                    </div>

                    <div>
                        <h4 className="font-bold text-white mb-6 uppercase tracking-widest text-xs">Product</h4>
                        <ul className="space-y-4">
                            {[
                                { name: 'Features', href: '/#how-it-works' },
                                { name: 'Pricing', href: '/#pricing' }
                            ].map((item) => (
                                <li key={item.name}>
                                    <a href={item.href} className="text-blue-200/60 hover:text-electric-violet transition-colors">
                                        {item.name}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* <div>
                        <h4 className="font-bold text-white mb-6 uppercase tracking-widest text-xs">Company</h4>
                        <ul className="space-y-4">
                            {['About', 'Blog', 'Careers', 'Contact'].map((item) => (
                                <li key={item}>
                                    <a href="#" className="text-blue-200/60 hover:text-electric-violet transition-colors">
                                        {item}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div> */}
                </div>

                <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-blue-200/40 text-sm">
                        © 2026 Mail Web AI. All rights reserved.
                    </p>
                    {/* <div className="flex gap-8 text-sm text-blue-200/40">
                        <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
                        <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
                    </div> */}
                </div>
            </div>
        </footer>
    );
}
