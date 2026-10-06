/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";

interface SpotlightProps {
  targetRect: DOMRect | null;
  padding?: number;
  borderRadius?: number;
}

export default function StudentOnboardingSpotlight({
  targetRect,
  padding = 8,
  borderRadius = 16,
}: SpotlightProps) {
  const [viewport, setViewport] = useState({
    width: typeof window !== "undefined" ? window.innerWidth : 1920,
    height: typeof window !== "undefined" ? window.innerHeight : 1080,
  });

  useEffect(() => {
    const handleResize = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleResize, true);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleResize, true);
    };
  }, []);

  if (!targetRect) {
    // Dim background without cutout when target is not available
    return (
      <div className="fixed inset-0 z-[9990] bg-slate-900/60 backdrop-blur-[2px] transition-opacity duration-300 pointer-events-none" />
    );
  }

  const x = Math.max(0, targetRect.left - padding);
  const y = Math.max(0, targetRect.top - padding);
  const width = Math.min(viewport.width, targetRect.width + padding * 2);
  const height = Math.min(viewport.height, targetRect.height + padding * 2);

  return (
    <>
      {/* 4 Backdrop Blocker panels around the highlighted cutout area */}
      {/* Top Blocker */}
      <div
        className="fixed left-0 top-0 w-full bg-slate-950/65 backdrop-blur-[1px] transition-all duration-200 pointer-events-auto z-[9990]"
        style={{ height: `${Math.max(0, y)}px` }}
      />

      {/* Bottom Blocker */}
      <div
        className="fixed left-0 w-full bg-slate-950/65 backdrop-blur-[1px] transition-all duration-200 pointer-events-auto z-[9990]"
        style={{
          top: `${y + height}px`,
          height: `${Math.max(0, viewport.height - (y + height))}px`,
        }}
      />

      {/* Left Blocker */}
      <div
        className="fixed left-0 bg-slate-950/65 backdrop-blur-[1px] transition-all duration-200 pointer-events-auto z-[9990]"
        style={{
          top: `${y}px`,
          width: `${Math.max(0, x)}px`,
          height: `${height}px`,
        }}
      />

      {/* Right Blocker */}
      <div
        className="fixed bg-slate-950/65 backdrop-blur-[1px] transition-all duration-200 pointer-events-auto z-[9990]"
        style={{
          top: `${y}px`,
          left: `${x + width}px`,
          width: `${Math.max(0, viewport.width - (x + width))}px`,
          height: `${height}px`,
        }}
      />

      {/* Glowing pulsing border & ring directly on the cutout (pointer-events-none so click goes straight to real element) */}
      <div
        className="fixed pointer-events-none z-[9991] transition-all duration-200 ease-out ring-4 ring-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.6)] animate-pulse"
        style={{
          left: `${x}px`,
          top: `${y}px`,
          width: `${width}px`,
          height: `${height}px`,
          borderRadius: `${borderRadius}px`,
        }}
      />
    </>
  );
}
