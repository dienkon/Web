/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * World Decorations for DkTEST 3D Learning Journey
 * Thematic biomes: Bãi biển nhiệt đới, Hòn đảo phiêu lưu, Khu dân cư & Làng tri thức.
 */

import React from "react";

export function JourneyWorldDecorations({ totalHeight }: { totalHeight: number }) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none" style={{ height: `${totalHeight}px` }}>
      {/* ======================================================== */}
      {/* BIOME 1: BÃI BIỂN NHIỆT ĐỚI (Levels 1 - 16, y: 0 - 2300px) */}
      {/* ======================================================== */}

      {/* 1.1 Ocean Wave Water Bank (Top Left) */}
      <div className="absolute left-[-20px] top-[140px] w-48 sm:w-64 h-32 opacity-85">
        <svg viewBox="0 0 200 100" className="w-full h-full drop-shadow-md">
          <path d="M0,40 Q40,10 80,40 T160,40 T240,40 L200,100 L0,100 Z" fill="#38bdf8" fillOpacity="0.4" />
          <path d="M0,55 Q45,25 90,55 T180,55 L200,100 L0,100 Z" fill="#0284c7" fillOpacity="0.5" />
          {/* Waves foam */}
          <path d="M10,48 Q30,38 50,48" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M90,50 Q110,40 130,50" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        </svg>
      </div>

      {/* 1.2 Palm Tree & Sandy Beach (Left at level 2-3) */}
      <div className="absolute left-4 sm:left-12 top-[320px] flex flex-col items-center">
        {/* Palm tree SVG */}
        <svg viewBox="0 0 100 120" className="w-20 sm:w-28 h-24 sm:h-32 drop-shadow-lg">
          {/* Sandy Mound */}
          <ellipse cx="50" cy="112" rx="42" ry="8" fill="#fde047" />
          <ellipse cx="50" cy="112" rx="36" ry="6" fill="#facc15" />
          {/* Curved Trunk */}
          <path d="M50,110 Q40,65 52,35" stroke="#92400e" strokeWidth="9" strokeLinecap="round" fill="none" />
          <path d="M50,110 Q40,65 52,35" stroke="#b45309" strokeWidth="6" strokeLinecap="round" fill="none" />
          {/* Trunk Rings */}
          <line x1="43" y1="90" x2="51" y2="88" stroke="#78350f" strokeWidth="2" />
          <line x1="44" y1="70" x2="52" y2="68" stroke="#78350f" strokeWidth="2" />
          <line x1="47" y1="50" x2="54" y2="48" stroke="#78350f" strokeWidth="2" />
          {/* Palm Fronds */}
          <path d="M52,35 Q20,20 10,40" stroke="#15803d" strokeWidth="6" strokeLinecap="round" fill="none" />
          <path d="M52,35 Q30,5 25,-10" stroke="#16a34a" strokeWidth="6" strokeLinecap="round" fill="none" />
          <path d="M52,35 Q65,5 75,-10" stroke="#16a34a" strokeWidth="6" strokeLinecap="round" fill="none" />
          <path d="M52,35 Q85,20 92,42" stroke="#15803d" strokeWidth="6" strokeLinecap="round" fill="none" />
          <path d="M52,35 Q50,15 48,-5" stroke="#22c55e" strokeWidth="6" strokeLinecap="round" fill="none" />
          {/* Coconuts */}
          <circle cx="49" cy="38" r="4" fill="#78350f" />
          <circle cx="55" cy="39" r="4" fill="#5c2607" />
        </svg>
      </div>

      {/* 1.3 Beach Umbrella & Surfboard (Right side at level 5-6) */}
      <div className="absolute right-4 sm:right-16 top-[680px] flex items-end gap-1">
        <svg viewBox="0 0 90 90" className="w-16 sm:w-22 h-16 sm:h-22 drop-shadow-md">
          {/* Sand patch */}
          <ellipse cx="45" cy="85" rx="35" ry="6" fill="#fde047" opacity="0.9" />
          {/* Umbrella pole */}
          <line x1="45" y1="85" x2="45" y2="35" stroke="#64748b" strokeWidth="3" strokeLinecap="round" />
          {/* Umbrella canopy */}
          <path d="M15,40 Q45,10 75,40 Z" fill="#ef4444" />
          <path d="M30,37 Q45,10 60,37 Z" fill="#ffffff" />
          <path d="M40,32 Q45,10 50,32 Z" fill="#3b82f6" />
          {/* Surfboard leaning */}
          <g transform="translate(62, 45) rotate(18)">
            <ellipse cx="5" cy="20" rx="6" ry="22" fill="#06b6d4" />
            <path d="M5,0 L5,40" stroke="#facc15" strokeWidth="2" />
          </g>
          {/* Starfish */}
          <polygon points="25,82 27,85 30,83 28,87 31,89 27,89 25,93 24,89 20,89 23,87 21,83 24,85" fill="#f97316" />
        </svg>
      </div>

      {/* 1.4 Cruising Sailboat Yacht (Left offshore at level 8-9) */}
      <div className="absolute left-2 sm:left-14 top-[1150px] animate-pulse" style={{ animationDuration: "4s" }}>
        <svg viewBox="0 0 100 80" className="w-16 sm:w-24 h-14 sm:h-20 drop-shadow-lg">
          {/* Ocean ripples */}
          <ellipse cx="50" cy="72" rx="42" ry="5" fill="#38bdf8" opacity="0.5" />
          <line x1="20" y1="75" x2="80" y2="75" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
          {/* Boat hull */}
          <path d="M18,58 L30,70 L72,70 L84,58 Z" fill="#0284c7" />
          <path d="M22,60 L78,60" stroke="#f8fafc" strokeWidth="2" />
          {/* Mast */}
          <line x1="50" y1="18" x2="50" y2="58" stroke="#334155" strokeWidth="3" />
          {/* Sails */}
          <polygon points="50,22 50,54 75,54" fill="#f8fafc" />
          <polygon points="47,26 47,52 28,52" fill="#f43f5e" />
        </svg>
      </div>

      {/* 1.5 Sea Shells & Cute Crab on Beach (Right side at level 13-14) */}
      <div className="absolute right-6 sm:right-20 top-[1780px]">
        <svg viewBox="0 0 80 60" className="w-14 sm:w-18 h-12 sm:h-16 drop-shadow-sm">
          {/* Sand patch */}
          <ellipse cx="40" cy="50" rx="32" ry="6" fill="#fde047" />
          {/* Crab body */}
          <ellipse cx="40" cy="38" rx="14" ry="10" fill="#ea580c" />
          {/* Eyes */}
          <circle cx="35" cy="28" r="3" fill="#ffffff" />
          <circle cx="35" cy="28" r="1.5" fill="#000000" />
          <circle cx="45" cy="28" r="3" fill="#ffffff" />
          <circle cx="45" cy="28" r="1.5" fill="#000000" />
          {/* Claws */}
          <path d="M26,35 Q18,25 15,30 Q12,38 22,40" fill="#ea580c" />
          <path d="M54,35 Q62,25 65,30 Q68,38 58,40" fill="#ea580c" />
          {/* Legs */}
          <path d="M30,44 Q24,50 20,48" stroke="#c2410c" strokeWidth="2" fill="none" />
          <path d="M50,44 Q56,50 60,48" stroke="#c2410c" strokeWidth="2" fill="none" />
        </svg>
      </div>

      {/* ======================================================== */}
      {/* BIOME 2: HÒN ĐẢO & ĐẢO BAY PHIÊU LƯU (Levels 17 - 33, y: 2300 - 4600px) */}
      {/* ======================================================== */}

      {/* 2.1 Floating Sky Island with Waterfall & Cloud (Left at level 18-19) */}
      <div className="absolute left-[-10px] sm:left-8 top-[2420px]">
        <svg viewBox="0 0 140 120" className="w-28 sm:w-36 h-24 sm:h-32 drop-shadow-xl">
          {/* Cloud under island */}
          <ellipse cx="70" cy="100" rx="45" ry="12" fill="#ffffff" fillOpacity="0.8" />
          <ellipse cx="50" cy="94" rx="25" ry="10" fill="#ffffff" fillOpacity="0.85" />
          {/* Floating rock underside */}
          <polygon points="25,48 115,48 95,95 70,110 45,95" fill="#57534e" />
          <polygon points="35,48 105,48 85,88 55,88" fill="#78716c" />
          {/* Island top grass */}
          <ellipse cx="70" cy="46" rx="46" ry="12" fill="#15803d" />
          <ellipse cx="70" cy="44" rx="42" ry="10" fill="#22c55e" />
          {/* Mini Waterfall flowing over edge */}
          <path d="M62,48 L62,102 Q66,108 70,102 L70,48 Z" fill="#38bdf8" fillOpacity="0.85" />
          <line x1="66" y1="50" x2="66" y2="100" stroke="#ffffff" strokeWidth="1.5" />
          {/* Small pine tree on island */}
          <polygon points="40,25 32,44 48,44" fill="#047857" />
          <polygon points="40,15 35,30 45,30" fill="#10b981" />
        </svg>
      </div>

      {/* 2.2 Glowing Lighthouse Island (Right side at level 22-23) */}
      <div className="absolute right-2 sm:right-14 top-[2980px]">
        <svg viewBox="0 0 100 130" className="w-22 sm:w-28 h-26 sm:h-36 drop-shadow-2xl">
          {/* Island base */}
          <polygon points="20,100 80,100 70,120 30,120" fill="#475569" />
          <ellipse cx="50" cy="100" rx="35" ry="9" fill="#16a34a" />
          {/* Lighthouse tower (red and white stripes) */}
          <polygon points="42,32 58,32 62,100 38,100" fill="#f8fafc" />
          {/* Red stripes */}
          <polygon points="40,82 60,82 61,96 39,96" fill="#dc2626" />
          <polygon points="43,50 57,50 59,66 41,66" fill="#dc2626" />
          {/* Lantern room */}
          <rect x="42" y="20" width="16" height="12" fill="#0284c7" />
          <circle cx="50" cy="26" r="4" fill="#fde047" className="animate-ping" style={{ animationDuration: "2s" }} />
          {/* Lighthouse roof */}
          <polygon points="50,10 38,20 62,20" fill="#dc2626" />
          {/* Light beams */}
          <polygon points="50,26 0,0 0,60" fill="#fef08a" fillOpacity="0.25" />
        </svg>
      </div>

      {/* 2.3 Pirate Treasure Chest overflowing with Gold & Gems (Left at level 26-27) */}
      <div className="absolute left-6 sm:left-20 top-[3550px]">
        <svg viewBox="0 0 80 70" className="w-16 sm:w-20 h-14 sm:h-18 drop-shadow-lg">
          {/* Floating rock shelf */}
          <ellipse cx="40" cy="58" rx="34" ry="7" fill="#475569" />
          <ellipse cx="40" cy="56" rx="30" ry="5" fill="#64748b" />
          {/* Chest Base */}
          <rect x="20" y="32" width="40" height="24" rx="4" fill="#78350f" />
          <rect x="20" y="34" width="40" height="5" fill="#b45309" />
          {/* Open Chest Lid */}
          <path d="M18,32 Q40,12 62,32 Z" fill="#92400e" stroke="#78350f" strokeWidth="2" />
          <rect x="36" y="34" width="8" height="10" rx="1" fill="#facc15" />
          {/* Glowing Gold Coins & Gems */}
          <circle cx="34" cy="30" r="3.5" fill="#facc15" />
          <circle cx="42" cy="28" r="4" fill="#fbbf24" />
          <circle cx="48" cy="31" r="3.5" fill="#f59e0b" />
          {/* Ruby & Sapphire */}
          <polygon points="30,28 34,25 32,32" fill="#ef4444" />
          <polygon points="46,26 50,23 48,30" fill="#3b82f6" />
          {/* Sparkle */}
          <polygon points="42,16 43,20 47,21 43,22 42,26 41,22 37,21 41,20" fill="#fef08a" />
        </svg>
      </div>

      {/* 2.4 Rainbow Arc spanning the sky (Right side at level 30-31) */}
      <div className="absolute right-0 sm:right-8 top-[4100px] opacity-75">
        <svg viewBox="0 0 160 100" className="w-36 sm:w-48 h-22 sm:h-30">
          <ellipse cx="80" cy="100" rx="70" ry="55" fill="none" stroke="#ef4444" strokeWidth="5" opacity="0.6" />
          <ellipse cx="80" cy="100" rx="65" ry="50" fill="none" stroke="#f97316" strokeWidth="5" opacity="0.6" />
          <ellipse cx="80" cy="100" rx="60" ry="45" fill="none" stroke="#facc15" strokeWidth="5" opacity="0.6" />
          <ellipse cx="80" cy="100" rx="55" ry="40" fill="none" stroke="#22c55e" strokeWidth="5" opacity="0.6" />
          <ellipse cx="80" cy="100" rx="50" ry="35" fill="none" stroke="#3b82f6" strokeWidth="5" opacity="0.6" />
          <ellipse cx="80" cy="100" rx="45" ry="30" fill="none" stroke="#a855f7" strokeWidth="5" opacity="0.6" />
        </svg>
      </div>

      {/* ======================================================== */}
      {/* BIOME 3: KHU DÂN CƯ & LÀNG TRI THỨC (Levels 34 - 50, y: 4600 - 7000px) */}
      {/* ======================================================== */}

      {/* 3.1 Cute Nordic Village Houses (Left at level 35-36) */}
      <div className="absolute left-2 sm:left-12 top-[4720px]">
        <svg viewBox="0 0 130 110" className="w-26 sm:w-34 h-22 sm:h-28 drop-shadow-xl">
          {/* Ground grass lawn */}
          <ellipse cx="65" cy="98" rx="55" ry="10" fill="#15803d" />
          {/* House 1: Red Roof Cozy Cottage */}
          <rect x="20" y="55" width="40" height="35" rx="3" fill="#fed7aa" />
          <polygon points="40,25 15,55 65,55" fill="#dc2626" />
          <rect x="34" y="68" width="12" height="22" rx="2" fill="#78350f" />
          <rect x="24" y="60" width="8" height="8" rx="1" fill="#fef08a" />
          <rect x="48" y="60" width="8" height="8" rx="1" fill="#fef08a" />
          <rect x="52" y="32" width="6" height="12" fill="#991b1b" />
          {/* House 2: Blue Roof House next door */}
          <rect x="65" y="48" width="45" height="42" rx="3" fill="#fef3c7" />
          <polygon points="87.5,18 60,48 115,48" fill="#2563eb" />
          <rect x="80" y="64" width="15" height="26" rx="2" fill="#92400e" />
          <rect x="70" y="54" width="9" height="9" rx="1" fill="#fef08a" />
          <rect x="96" y="54" width="9" height="9" rx="1" fill="#fef08a" />
          {/* Flower Bushes */}
          <circle cx="18" cy="88" r="5" fill="#f43f5e" />
          <circle cx="112" cy="88" r="5" fill="#ec4899" />
          <circle cx="64" cy="88" r="4" fill="#eab308" />
        </svg>
      </div>

      {/* 3.2 Classic Dutch Wooden Windmill with spinning sails (Right at level 39-40) */}
      <div className="absolute right-4 sm:right-16 top-[5280px]">
        <svg viewBox="0 0 100 130" className="w-22 sm:w-28 h-26 sm:h-34 drop-shadow-2xl">
          {/* Hillock */}
          <ellipse cx="50" cy="116" rx="40" ry="10" fill="#15803d" />
          {/* Windmill Body */}
          <polygon points="38,45 62,45 68,115 32,115" fill="#d97706" />
          <polygon points="40,45 60,45 65,115 35,115" fill="#f59e0b" />
          {/* Dome cap */}
          <path d="M38,45 Q50,28 62,45 Z" fill="#92400e" />
          {/* Windmill Door & Window */}
          <rect x="45" y="95" width="10" height="20" rx="2" fill="#78350f" />
          <rect x="46" y="60" width="8" height="8" rx="1" fill="#fef08a" />
          {/* Windmill Sails Hub */}
          <circle cx="50" cy="42" r="4" fill="#78350f" />
          {/* Sails */}
          <line x1="50" y1="42" x2="20" y2="12" stroke="#78350f" strokeWidth="3" />
          <line x1="50" y1="42" x2="80" y2="72" stroke="#78350f" strokeWidth="3" />
          <line x1="50" y1="42" x2="80" y2="12" stroke="#78350f" strokeWidth="3" />
          <line x1="50" y1="42" x2="20" y2="72" stroke="#78350f" strokeWidth="3" />
          {/* Canvas cloth on sails */}
          <rect x="22" y="14" width="14" height="6" fill="#f8fafc" opacity="0.9" transform="rotate(-45 22 14)" />
          <rect x="70" y="62" width="14" height="6" fill="#f8fafc" opacity="0.9" transform="rotate(-45 70 62)" />
        </svg>
      </div>

      {/* 3.3 Town Clock Tower & Cobblestone Path (Left at level 43-44) */}
      <div className="absolute left-4 sm:left-16 top-[5820px]">
        <svg viewBox="0 0 90 140" className="w-20 sm:w-26 h-28 sm:h-38 drop-shadow-xl">
          {/* Grass & Cobblestone base */}
          <ellipse cx="45" cy="128" rx="38" ry="8" fill="#15803d" />
          {/* Tower body */}
          <rect x="30" y="38" width="30" height="90" fill="#cbd5e1" />
          <rect x="32" y="40" width="26" height="86" fill="#e2e8f0" />
          {/* Brick details */}
          <rect x="36" y="65" width="8" height="3" fill="#94a3b8" />
          <rect x="48" y="80" width="8" height="3" fill="#94a3b8" />
          {/* Clock face */}
          <circle cx="45" cy="54" r="10" fill="#ffffff" stroke="#475569" strokeWidth="2" />
          <line x1="45" y1="54" x2="45" y2="48" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />
          <line x1="45" y1="54" x2="50" y2="54" stroke="#0f172a" strokeWidth="1.5" strokeLinecap="round" />
          {/* Spire Roof */}
          <polygon points="45,12 25,38 65,38" fill="#475569" />
          {/* Flag at top */}
          <line x1="45" y1="5" x2="45" y2="12" stroke="#0f172a" strokeWidth="2" />
          <polygon points="45,5 56,8 45,11" fill="#ef4444" />
        </svg>
      </div>

      {/* 3.4 Grand Graduation Summit Academy & Fireworks (At level 49-50 summit) */}
      <div className="absolute right-4 sm:right-16 top-[6450px]">
        <svg viewBox="0 0 140 140" className="w-28 sm:w-38 h-28 sm:h-38 drop-shadow-2xl">
          {/* Golden summit platform */}
          <ellipse cx="70" cy="120" rx="55" ry="12" fill="#ca8a04" />
          <ellipse cx="70" cy="116" rx="50" ry="10" fill="#eab308" />
          {/* Grand Castle Hall */}
          <rect x="40" y="60" width="60" height="56" rx="4" fill="#ede9fe" />
          <polygon points="70,25 35,60 105,60" fill="#7c3aed" />
          {/* Castle Towers (Left & Right) */}
          <rect x="25" y="45" width="20" height="70" fill="#ddd6fe" />
          <polygon points="35,20 20,45 50,45" fill="#6d28d9" />
          <rect x="95" y="45" width="20" height="70" fill="#ddd6fe" />
          <polygon points="105,20 90,45 120,45" fill="#6d28d9" />
          {/* Arch Gate */}
          <path d="M58,116 L58,88 Q70,76 82,88 L82,116 Z" fill="#4c1d95" />
          {/* Golden Trophy on top */}
          <circle cx="70" cy="15" r="7" fill="#facc15" className="animate-bounce" style={{ animationDuration: "2s" }} />
          {/* Fireworks Sparks */}
          <circle cx="20" cy="15" r="3" fill="#f43f5e" />
          <circle cx="120" cy="15" r="3" fill="#06b6d4" />
          <circle cx="70" cy="2" r="2.5" fill="#facc15" />
        </svg>
      </div>

      {/* Ambient Hot Air Balloon Drifting in the Sky */}
      <div className="absolute right-8 sm:right-24 top-[380px] animate-bounce" style={{ animationDuration: "6s" }}>
        <svg viewBox="0 0 60 80" className="w-12 sm:w-16 h-16 sm:h-20 drop-shadow-lg opacity-90">
          {/* Balloon envelope */}
          <ellipse cx="30" cy="30" rx="24" ry="28" fill="#ec4899" />
          <path d="M15,15 Q30,4 45,15 Q30,55 15,15 Z" fill="#3b82f6" />
          <path d="M22,10 Q30,3 38,10 Q30,58 22,10 Z" fill="#facc15" />
          {/* Basket ropes */}
          <line x1="20" y1="56" x2="25" y2="68" stroke="#64748b" strokeWidth="1.5" />
          <line x1="40" y1="56" x2="35" y2="68" stroke="#64748b" strokeWidth="1.5" />
          {/* Basket */}
          <rect x="24" y="68" width="12" height="9" rx="1.5" fill="#b45309" />
        </svg>
      </div>
    </div>
  );
}
