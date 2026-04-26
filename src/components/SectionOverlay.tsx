"use client";

import { useScroll, motion, useTransform, MotionValue } from "framer-motion";
import { ArrowRight, CheckCircle2, Zap } from "lucide-react";

// Helper for Fade In/Out
function Section({
    start,
    end,
    scrollYProgress,
    children,
    className = ""
}: {
    start: number;
    end: number;
    scrollYProgress: MotionValue<number>;
    children: React.ReactNode;
    className?: string;
}) {
    // Fade in during first 20% of the range, stay, fade out during last 20%
    const duration = end - start;
    const fadeDuration = duration * 0.2;

    const opacity = useTransform(
        scrollYProgress,
        [start, start + fadeDuration, end - fadeDuration, end],
        [0, 1, 1, 0]
    );

    const y = useTransform(
        scrollYProgress,
        [start, start + fadeDuration, end - fadeDuration, end],
        [20, 0, 0, -20]
    );

    // Scale slightly for 3D feel
    const scale = useTransform(
        scrollYProgress,
        [start, end],
        [0.95, 1.05]
    );

    return (
        <motion.div
            style={{ opacity, y, scale, pointerEvents: "none" }} // pointer-events-none ensures scroll works
            className={`absolute top-0 left-0 w-full h-full flex flex-col items-center justify-center p-6 ${className}`}
        >
            {children}
        </motion.div>
    );
}

export default function SectionOverlay({ containerRef }: { containerRef: React.RefObject<HTMLElement> }) {
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end end"]
    });

    return (
        // <div className="relative z-10 w-full h-full">

        //     <Section start={0} end={0.25} scrollYProgress={scrollYProgress}>
        //         <div className="text-center">
        //             <div className="inline-flex items-center gap-2 px-3 py-1 mb-8 rounded-full bg-white/5 border border-white/10 text-[10px] uppercase tracking-[0.2em] text-neon-emerald backdrop-blur-md">
        //                 <div className="w-1 h-1 rounded-full bg-neon-emerald animate-pulse" />
        //                 Y Combinator Backed
        //             </div>
        //             <h1 className="text-6xl md:text-9xl font-bold tracking-tighter mb-6 text-white font-heading">
        //                 Revenue, <br />
        //                 <span className="text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-white/40">Recognized.</span>
        //             </h1>
        //             <p className="text-lg md:text-xl text-blue-200/60 max-w-lg mx-auto font-light leading-relaxed">
        //                 Stop chasing invoices. Let AI be your Financial Controller.
        //             </p>
        //         </div>
        //     </Section>

        //     <Section start={0.25} end={0.50} scrollYProgress={scrollYProgress} className="!items-start !justify-center pl-10 md:pl-32">
        //         <div className="max-w-xl backdrop-blur-xl bg-deep-navy/40 p-10 rounded-3xl border border-white/5 shadow-2xl">
        //             <div className="flex items-center gap-2 mb-4 text-electric-violet">
        //                 <Zap className="w-5 h-5" fill="currentColor" />
        //                 <span className="text-xs font-mono uppercase tracking-widest">Deep Analysis</span>
        //             </div>
        //             <h2 className="text-4xl md:text-6xl font-bold mb-6 text-white leading-tight font-heading">
        //                 It reads <br /> every contract.
        //             </h2>
        //             <p className="text-blue-200/60 mb-8 text-lg">
        //                 JustPaid scans PDFs, extracts billing logic, and identifies revenue leakage instantly. No manual entry. No human error.
        //             </p>
        //             <div className="flex gap-4 text-xs font-mono text-white/50">
        //                 <div className="px-3 py-2 bg-white/5 rounded border border-white/10">OCR ACCURACY: 99.9%</div>
        //                 <div className="px-3 py-2 bg-white/5 rounded border border-white/10">SPEED: &lt;200ms</div>
        //             </div>
        //         </div>
        //     </Section>


        //     <Section start={0.50} end={0.75} scrollYProgress={scrollYProgress} className="!items-end !justify-center pr-10 md:pr-32">
        //         <div className="text-right max-w-xl">
        //             <h2 className="text-5xl md:text-7xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-electric-violet to-white font-heading">
        //                 Billing on <br /> Autopilot.
        //             </h2>
        //             <p className="text-xl text-blue-200/60 mb-8 ml-auto max-w-sm">
        //                 Invoices generated. Payments reconciled. Collections sent. Without lifting a finger.
        //             </p>
        //             <div className="inline-flex flex-col gap-2 items-end">
        //                 {["Reconciliation Complete", "Cash Flow Optimized", "Churn Risk Detected"].map((item, i) => (
        //                     <div key={i} className="flex items-center gap-3 px-4 py-2 bg-neon-emerald/10 border border-neon-emerald/20 rounded-full text-neon-emerald text-sm font-medium">
        //                         <CheckCircle2 className="w-4 h-4" />
        //                         {item}
        //                     </div>
        //                 ))}
        //             </div>
        //         </div>
        //     </Section>


        //     <Section start={0.75} end={1.0} scrollYProgress={scrollYProgress}>
        //         <div className="text-center mt-auto mb-32">
        //             <h2 className="text-5xl md:text-8xl font-bold mb-4 text-white font-heading tracking-tight">
        //                 Total Financial Clarity.
        //             </h2>
        //             <p className="text-xl text-blue-200/60 mb-10">
        //                 From contract to cash in the bank. See your real-time revenue velocity.
        //             </p>

        //             <button className="group relative inline-flex items-center gap-3 px-8 py-4 bg-white text-void-navy rounded-full text-lg font-bold tracking-wide hover:bg-blue-50 transition-all hover:scale-105 shadow-[0_0_40px_rgba(255,255,255,0.3)]">
        //                 Schedule a Demo
        //                 <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        //             </button>
        //         </div>
        //     </Section>
        // </div>
        <div className="sticky top-0 h-screen w-full z-10 pointer-events-none">
            {/* HERO: 0 - 0.25 */}
            <Section start={0} end={0.25} scrollYProgress={scrollYProgress}>
                <div className="text-center pointer-events-auto">
                    <div className="inline-flex items-center gap-2 px-3 py-1 mb-8 rounded-full bg-white/5 border border-white/10 text-[10px] uppercase tracking-[0.2em] text-neon-emerald backdrop-blur-md">
                        <div className="w-1 h-1 rounded-full bg-neon-emerald animate-pulse" />
                        AI Assistant Integrated
                    </div>
                    <h1 className="text-6xl md:text-9xl font-bold tracking-tighter mb-6 text-white font-heading">
                        Email, <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-white/40">Controlled by AI.</span>
                    </h1>
                    <p className="text-lg md:text-xl text-blue-200/60 max-w-lg mx-auto font-light leading-relaxed">
                        Stop clicking menus. Let AI drive your interface.
                    </p>
                </div>
            </Section>

            {/* REVEAL: 0.25 - 0.50 */}
            <Section start={0.25} end={0.50} scrollYProgress={scrollYProgress} className="!items-start !justify-center pl-10 md:pl-32">
                <div className="max-w-xl backdrop-blur-xl bg-deep-navy/40 p-10 rounded-3xl border border-white/5 shadow-2xl pointer-events-auto">
                    <div className="flex items-center gap-2 mb-4 text-electric-violet">
                        <Zap className="w-5 h-5" fill="currentColor" />
                        <span className="text-xs font-mono uppercase tracking-widest">Natural Language UI</span>
                    </div>
                    <h2 className="text-4xl md:text-6xl font-bold mb-6 text-white leading-tight font-heading">
                        It paints <br /> the UI for you.
                    </h2>
                    <p className="text-blue-200/60 mb-8 text-lg">
                        "Show me emails from Sarah." The assistant filters the view, fills compose forms, and navigates instantly.
                    </p>
                    <div className="flex gap-4 text-xs font-mono text-white/50">
                        <div className="px-3 py-2 bg-white/5 rounded border border-white/10">NLP PRECISION: HIGH</div>
                        <div className="px-3 py-2 bg-white/5 rounded border border-white/10">SYNC: REAL-TIME</div>
                    </div>
                </div>
            </Section>

            {/* AI CORE: 0.50 - 0.75 */}
            <Section start={0.50} end={0.75} scrollYProgress={scrollYProgress} className="!items-end !justify-center pr-10 md:pr-32">
                <div className="text-right max-w-xl pointer-events-auto">
                    <h2 className="text-5xl md:text-7xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-electric-violet to-white font-heading">
                        Context <br /> Aware.
                    </h2>
                    <p className="text-xl text-blue-200/60 mb-8 ml-auto max-w-sm">
                        "Reply to this." It knows exactly what you're reading and drafts the perfect response instantly.
                    </p>
                    <div className="inline-flex flex-col gap-2 items-end">
                        {["Draft Auto-Filled", "Smart Filtering", "Inbox Navigated"].map((item, i) => (
                            <div key={i} className="flex items-center gap-3 px-4 py-2 bg-neon-emerald/10 border border-neon-emerald/20 rounded-full text-neon-emerald text-sm font-medium">
                                <CheckCircle2 className="w-4 h-4" />
                                {item}
                            </div>
                        ))}
                    </div>
                </div>
            </Section>

            {/* DASHBOARD: 0.75 - 0.95 -> Changed to 0.75 - 0.9 */}
            <Section start={0.75} end={0.9} scrollYProgress={scrollYProgress}>
                <div className="text-center mt-auto mb-32 pointer-events-auto">
                    <h2 className="text-5xl md:text-8xl font-bold mb-4 text-white font-heading tracking-tight">
                        Master Your Inbox.
                    </h2>
                    <p className="text-xl text-blue-200/60 mb-10">
                        Connect your provider. Speak to your assistant. Experience Web Mail AI.
                    </p>

                    <button className="group relative inline-flex items-center gap-3 px-8 py-4 bg-white text-void-navy rounded-full text-lg font-bold tracking-wide hover:bg-blue-50 transition-all hover:scale-105 shadow-[0_0_40px_rgba(255,255,255,0.3)]">
                        Launch Assistant
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </Section>
        </div>
    );
}
