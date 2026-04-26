"use client";


import React, { useRef } from "react";
import Navbar from "@/components/Navbar";
import ScrollSequence from "@/components/ScrollSequence";
import SectionOverlay from "@/components/SectionOverlay";
import HowItWorks from "@/components/HowItWorks";
import Pricing from "@/components/Pricing";
import Footer from "@/components/Footer";
// import Lenis from "lenis"; // Import standard lenis if preferred, or use React wrapper
import { ReactLenis } from "lenis/react";

export default function Home() {
    const heroRef = useRef<HTMLElement>(null);

    return (
        <ReactLenis root>
            <main ref={heroRef} className="relative w-full h-[400vh] bg-void-navy">
                <Navbar />
                <ScrollSequence containerRef={heroRef} />
                <SectionOverlay containerRef={heroRef} />

                <div className="fixed inset-0 z-[5] pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,#02040A_100%)] opacity-80" />
                <div className="fixed inset-0 z-[5] pointer-events-none bg-[url('/grid.svg')] opacity-10 bg-repeat bg-[length:50px_50px]" />
            </main>

            <HowItWorks />
            <Pricing />
            <Footer /> {/* Replaced simple footer with Footer component */}
            {/* <LegacyLanding /> */}

        </ReactLenis>
    );
}
