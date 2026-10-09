/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * RevealOnScroll: Lightweight, accessible progressive reveal animation component
 * Uses native IntersectionObserver (no scroll polling) and respects prefers-reduced-motion.
 */

import React, { useEffect, useRef, useState } from "react";

interface RevealOnScrollProps {
  children: React.ReactNode;
  delayMs?: number;
  direction?: "up" | "down" | "none";
  className?: string;
  disabled?: boolean;
}

export default function RevealOnScroll({
  children,
  delayMs = 0,
  direction = "up",
  className = "",
  disabled = false,
}: RevealOnScrollProps) {
  const [isVisible, setIsVisible] = useState(false);
  const domRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // If explicitly disabled or user prefers reduced motion, reveal immediately
    if (disabled) {
      setIsVisible(true);
      return;
    }

    if (typeof window !== "undefined" && window.matchMedia) {
      const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (prefersReduced) {
        setIsVisible(true);
        return;
      }
    }

    // If IntersectionObserver is not supported, reveal immediately
    if (typeof IntersectionObserver === "undefined") {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            if (domRef.current) {
              observer.unobserve(domRef.current);
            }
          }
        });
      },
      {
        threshold: 0.05,
        rootMargin: "0px 0px -20px 0px",
      }
    );

    const currentElem = domRef.current;
    if (currentElem) {
      observer.observe(currentElem);
    }

    // Safety fallback: reveal after 1000ms max to prevent stranding content with pointer-events-none
    const safetyTimer = setTimeout(() => {
      setIsVisible(true);
    }, 1000);

    return () => {
      clearTimeout(safetyTimer);
      if (currentElem) {
        observer.unobserve(currentElem);
      }
    };
  }, [disabled]);

  // Compute direction transform
  const getTransform = () => {
    if (disabled || isVisible) return "translate-y-0 scale-100";
    if (direction === "up") return "translate-y-4 scale-[0.99]";
    if (direction === "down") return "-translate-y-4 scale-[0.99]";
    return "translate-y-0 scale-[0.99]";
  };

  // Clamp delay on mobile devices to prevent excessive stagger
  const effectiveDelay =
    typeof window !== "undefined" && window.innerWidth < 768
      ? Math.min(delayMs, 80)
      : delayMs;

  return (
    <div
      ref={domRef}
      onFocusCapture={() => setIsVisible(true)}
      className={`transition-all duration-700 ease-out ${
        disabled
          ? "opacity-100 translate-y-0 scale-100"
          : isVisible
          ? "opacity-100 translate-y-0 scale-100"
          : `opacity-0 pointer-events-none ${getTransform()}`
      } ${className}`}
      style={
        !disabled && effectiveDelay > 0
          ? { transitionDelay: `${effectiveDelay}ms` }
          : undefined
      }
    >
      {children}
    </div>
  );
}
