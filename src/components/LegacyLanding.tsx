"use client";

import { useRef, useEffect, useState } from "react";

export default function LegacyLanding() {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [height, setHeight] = useState("8000px");

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === "LEGACY_LANDING_HEIGHT") {
                setHeight(event.data.height + "px");
            }
        };
        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, []);

    return (
        <div className="relative z-10" style={{ height }}>
            <iframe
                ref={iframeRef}
                src="/landing/index.html"
                className="w-full h-full border-0"
                style={{ pointerEvents: "none" }}
                title="Landing Page"
                scrolling="no"
            />
        </div>
    );
}
