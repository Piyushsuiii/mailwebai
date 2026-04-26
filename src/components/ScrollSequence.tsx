"use client";

import React, { useEffect, useRef, useState } from "react";
import { useScroll, useMotionValueEvent } from "framer-motion";

const FRAME_COUNT = 300;

export default function ScrollSequence({ containerRef }: { containerRef: React.RefObject<HTMLElement> }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [images, setImages] = useState<HTMLImageElement[]>([]);
    const [loaded, setLoaded] = useState(false);
    const [progress, setProgress] = useState(0);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end end"]
    });

    // Load images
    useEffect(() => {
        const loadAll = async () => {
            // Pre-allocate array
            const loadedImages: HTMLImageElement[] = new Array(FRAME_COUNT);
            let loadedCount = 0;

            const promises = Array.from({ length: FRAME_COUNT }, (_, i) => {
                return new Promise<void>((resolve) => {
                    const img = new Image();
                    // Ensure zero-padding matches filenames: ezgif-frame-001.jpg
                    const frameNum = (i + 1).toString().padStart(3, "0");
                    img.src = `/frames/ezgif-frame-${frameNum}.jpg`;
                    img.onload = () => {
                        loadedImages[i] = img;
                        loadedCount++;
                        setProgress(Math.round((loadedCount / FRAME_COUNT) * 100));
                        resolve();
                    };
                    img.onerror = () => {
                        console.error(`Failed to load frame ${frameNum}`);
                        resolve(); // Resolve anyway to continue
                    };
                });
            });

            await Promise.all(promises);
            setImages(loadedImages);
            setLoaded(true);
        };

        loadAll();
    }, []);

    const renderFrame = React.useCallback((index: number) => {
        const canvas = canvasRef.current;
        if (!canvas || !images[index]) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const img = images[index];
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;

        // "Contain" or "Cover"? "Cover" usually for backgrounds.
        // Calculate aspect ratios
        const imgRatio = img.width / img.height;
        const canvasRatio = canvasWidth / canvasHeight;

        let drawWidth, drawHeight, offsetX, offsetY;

        if (imgRatio > canvasRatio) {
            // Image is wider than canvas (relative to height) -> Fit height, crop width
            drawHeight = canvasHeight;
            drawWidth = canvasHeight * imgRatio;
            offsetX = -(drawWidth - canvasWidth) / 2;
            offsetY = 0;
        } else {
            // Image is taller -> Fit width, crop height
            drawWidth = canvasWidth;
            drawHeight = canvasWidth / imgRatio;
            offsetX = 0;
            offsetY = -(drawHeight - canvasHeight) / 2;
        }

        // Optimization: check if dimensions match to avoid clearRect if covering
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
    }, [images]);

    // Sync with scroll
    useMotionValueEvent(scrollYProgress, "change", (latest) => {
        // Latest is 0 to 1
        if (!loaded || !images.length) return;

        const frameIndex = Math.min(
            FRAME_COUNT - 1,
            Math.floor(latest * (FRAME_COUNT - 1))
        );

        requestAnimationFrame(() => renderFrame(frameIndex));
    });

    // Handle Resize
    useEffect(() => {
        const handleResize = () => {
            if (canvasRef.current && window) {
                // Set actual canvas size to window size for Retina sharpness options?
                // For now standard 1:1 pixel mapping
                canvasRef.current.width = window.innerWidth;
                canvasRef.current.height = window.innerHeight;

                // Re-render current frame if possible?
                // We'd need to know current index. 
                // For now, next scroll event fixes it, or we could track index in ref.
            }
        };

        window.addEventListener("resize", handleResize);
        handleResize();

        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // Initial draw once loaded
    useEffect(() => {
        if (loaded && canvasRef.current) {
            const index = Math.min(
                FRAME_COUNT - 1,
                Math.floor(scrollYProgress.get() * (FRAME_COUNT - 1))
            );
            renderFrame(index);
        }
    }, [loaded, scrollYProgress, renderFrame]);

    return (
        <div className="sticky top-0 h-screen w-full z-0 bg-void-navy pointer-events-none">
            <canvas
                ref={canvasRef}
                className="w-full h-full block object-cover"
            />
            {!loaded && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white/30 space-y-4 bg-void-navy z-50">
                    <div className="w-12 h-12 rounded-full border-2 border-white/10 border-t-electric-violet animate-spin" />
                    <div className="font-mono text-xs tracking-widest uppercase">
                        Initializing Neural Interface... {progress}%
                    </div>
                </div>
            )}
        </div>
    );
}
