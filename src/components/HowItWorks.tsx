// "use client";

// import { motion } from "framer-motion";
// import {
//     Send,
//     Search,
//     Navigation,
//     MessageSquare,
//     Zap,
//     Command,
//     Sparkles
// } from "lucide-react";

// const features = [
//     {
//         title: "Compose & Send",
//         description: "Just say 'Send an email to John about the meeting.' The AI fills the fields and drafts the body while you watch.",
//         icon: <Send className="w-6 h-6" />,
//         colSpan: "md:col-span-2",
//         bg: "bg-gradient-to-br from-electric-violet/20 to-void-navy/50"
//     },
//     {
//         title: "Search & Display",
//         description: "Find complex queries instantly. 'Show me unread emails from Sarah last week.'",
//         icon: <Search className="w-6 h-6" />,
//         colSpan: "md:col-span-1",
//         bg: "bg-white/5"
//     },
//     {
//         title: "Navigate & Open",
//         description: "No more clicking. 'Open the latest invoice from AWS.' It takes you there.",
//         icon: <Navigation className="w-6 h-6" />,
//         colSpan: "md:col-span-1",
//         bg: "bg-white/5"
//     },
//     {
//         title: "Context Awareness",
//         description: "Reading an email? Just say 'Reply saying I need more time.' It knows the context.",
//         icon: <MessageSquare className="w-6 h-6" />,
//         colSpan: "md:col-span-2",
//         bg: "bg-gradient-to-br from-neon-emerald/20 to-void-navy/50"
//     }
// ];

// export default function HowItWorks() {
//     return (
//         <section className="relative w-full py-32 bg-void-navy overflow-hidden z-20">
//             {/* Background Elements */}
//             <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,0.1),transparent_50%)]" />
//             <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.05),transparent_50%)]" />

//             <div className="max-w-7xl mx-auto px-6 relative z-10">
//                 <motion.div
//                     initial={{ opacity: 0, y: 20 }}
//                     whileInView={{ opacity: 1, y: 0 }}
//                     viewport={{ once: true }}
//                     transition={{ duration: 0.8 }}
//                     className="text-center mb-24"
//                 >
//                     <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 rounded-full bg-white/5 border border-white/10 text-xs uppercase tracking-widest text-electric-violet">
//                         <Sparkles className="w-3 h-3" />
//                         Workflow Evolved
//                     </div>
//                     <h2 className="text-5xl md:text-7xl font-bold mb-6 text-white font-heading tracking-tight">
//                         It works like <br />
//                         <span className="text-transparent bg-clip-text bg-gradient-to-r from-electric-violet to-neon-emerald">
//                             magic.
//                         </span>
//                     </h2>
//                     <p className="text-xl text-blue-200/60 max-w-2xl mx-auto">
//                         Your assistant doesn't just chat. It controls the interface.
//                     </p>
//                 </motion.div>

//                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
//                     {features.map((feature, i) => (
//                         <motion.div
//                             key={i}
//                             className={`group relative p-8 rounded-3xl border border-white/10 backdrop-blur-sm overflow-hidden ${feature.colSpan} ${feature.bg} hover:border-white/20 transition-colors cursor-default`}
//                             initial={{ opacity: 0, y: 30 }}
//                             whileInView={{ opacity: 1, y: 0 }}
//                             viewport={{ once: true }}
//                             transition={{ duration: 0.5, delay: i * 0.1 }}
//                             whileHover={{ y: -5 }}
//                         >
//                             <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:opacity-40 transition-opacity">
//                                 {feature.icon}
//                             </div>

//                             <div className="relative z-10 h-full flex flex-col justify-end">
//                                 <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-6 text-white group-hover:scale-110 transition-transform duration-300">
//                                     {feature.icon}
//                                 </div>
//                                 <h3 className="text-2xl font-bold text-white mb-3">{feature.title}</h3>
//                                 <p className="text-blue-200/60 leading-relaxed">
//                                     {feature.description}
//                                 </p>
//                             </div>


//                             <div
//                                 className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
//                                 style={{
//                                     background: "radial-gradient(600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(255,255,255,0.06), transparent 40%)"
//                                 }}
//                             />
//                         </motion.div>
//                     ))}
//                 </div>
//             </div>
//         </section>
//     );
// }

"use client";

import { motion } from "framer-motion";
import {
    Send,
    Search,
    Navigation,
    MessageSquare,
    Sparkles
} from "lucide-react";

const features = [
    {
        title: "Compose & Send",
        description: "Just say 'Send an email to John about the meeting.' The AI fills the fields and drafts the body while you watch.",
        icon: <Send className="w-6 h-6" />,
        colSpan: "md:col-span-2",
        bg: "bg-gradient-to-br from-electric-violet/20 to-void-navy/50"
    },
    {
        title: "Search & Display",
        description: "Find complex queries instantly. 'Show me unread emails from Sarah last week.'",
        icon: <Search className="w-6 h-6" />,
        colSpan: "md:col-span-1",
        bg: "bg-white/5"
    },
    {
        title: "Navigate & Open",
        description: "No more clicking. 'Open the latest invoice from AWS.' It takes you there.",
        icon: <Navigation className="w-6 h-6" />,
        colSpan: "md:col-span-1",
        bg: "bg-white/5"
    },
    {
        title: "Context Awareness",
        description: "Reading an email? Just say 'Reply saying I need more time.' It knows the context.",
        icon: <MessageSquare className="w-6 h-6" />,
        colSpan: "md:col-span-2",
        bg: "bg-gradient-to-br from-neon-emerald/20 to-void-navy/50"
    }
];

// 1. Parent Variant: Controls the flow
const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.3 // Delay between each card revealing
        }
    }
};

// 2. Child Variant: Controls the specific animation of each card
const cardVariants = {
    hidden: {
        opacity: 0,
        y: 50,
        filter: "blur(10px)" // Adds that premium "soft focus" entry
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

export default function HowItWorks() {
    return (
        <section id="how-it-works" className="relative w-full py-32 bg-void-navy overflow-hidden z-20">
            {/* Background Elements */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,0.1),transparent_50%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.05),transparent_50%)]" />

            <div className="max-w-7xl mx-auto px-6 relative z-10">
                {/* Header Animation */}
                <motion.div
                    initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
                    whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="text-center mb-24"
                >
                    <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 rounded-full bg-white/5 border border-white/10 text-xs uppercase tracking-widest text-electric-violet">
                        <Sparkles className="w-3 h-3" />
                        Workflow Evolved
                    </div>
                    <h2 className="text-5xl md:text-7xl font-bold mb-6 text-white font-heading tracking-tight">
                        It works like <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-electric-violet to-neon-emerald">
                            magic.
                        </span>
                    </h2>
                    <p className="text-xl text-blue-200/60 max-w-2xl mx-auto">
                        Your assistant doesn't just chat. It controls the interface.
                    </p>
                </motion.div>

                {/* GRID CONTAINER 
                   We move the initial/whileInView props here.
                */}
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }} // Triggers when 100px of the grid is in view
                    className="grid grid-cols-1 md:grid-cols-3 gap-6"
                >
                    {features.map((feature, i) => (
                        <motion.div
                            key={i}
                            variants={cardVariants} // Use the child variants
                            className={`group relative p-8 rounded-3xl border border-white/10 backdrop-blur-sm overflow-hidden ${feature.colSpan} ${feature.bg} hover:border-white/20 transition-colors cursor-default`}
                            whileHover={{ y: -5, transition: { duration: 0.2 } }} // Hover effect remains separate
                        >
                            <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:opacity-40 transition-opacity">
                                {feature.icon}
                            </div>

                            <div className="relative z-10 h-full flex flex-col justify-end">
                                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-6 text-white group-hover:scale-110 transition-transform duration-300">
                                    {feature.icon}
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-3">{feature.title}</h3>
                                <p className="text-blue-200/60 leading-relaxed">
                                    {feature.description}
                                </p>
                            </div>

                            <div
                                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                                style={{
                                    background: "radial-gradient(600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(255,255,255,0.06), transparent 40%)"
                                }}
                            />
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
}
