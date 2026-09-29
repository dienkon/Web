import React, { useState } from "react";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
export type AvatarRing = "gold" | "silver" | "bronze" | "blue" | "default";

interface UserAvatarProps {
  src?: string | null;
  name?: string;
  size?: AvatarSize;
  shape?: "circle" | "rounded";
  ring?: AvatarRing;
  className?: string;
  alt?: string;
  badge?: React.ReactNode;
}

const SIZE_MAP: Record<AvatarSize, { container: string; text: string; iconSize: string }> = {
  xs: { container: "w-6 h-6", text: "text-[10px]", iconSize: "w-3 h-3" },
  sm: { container: "w-8 h-8", text: "text-xs", iconSize: "w-4 h-4" },
  md: { container: "w-10 h-10", text: "text-sm", iconSize: "w-5 h-5" },
  lg: { container: "w-12 h-12", text: "text-base", iconSize: "w-6 h-6" },
  xl: { container: "w-16 h-16", text: "text-xl", iconSize: "w-8 h-8" },
  "2xl": { container: "w-20 h-20", text: "text-2xl", iconSize: "w-10 h-10" },
};

const GRADIENTS = [
  "from-blue-500 to-indigo-600",
  "from-violet-500 to-purple-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-rose-500 to-pink-600",
  "from-cyan-500 to-blue-600",
  "from-fuchsia-500 to-pink-600",
  "from-indigo-500 to-sky-600",
];

function getGradientFromName(name: string): string {
  if (!name) return GRADIENTS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % GRADIENTS.length;
  return GRADIENTS[index];
}

function getInitials(name?: string): string {
  if (!name || !name.trim()) return "U";
  const clean = name.trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  // If multiple words, return the initial of the last word (Vietnamese naming convention: last word is first name)
  return parts[parts.length - 1].charAt(0).toUpperCase();
}

export default function UserAvatar({
  src,
  name = "User",
  size = "md",
  shape = "circle",
  ring,
  className = "",
  alt,
  badge,
}: UserAvatarProps) {
  const [imgError, setImgError] = useState(false);

  const sizeStyle = SIZE_MAP[size] || SIZE_MAP.md;
  const roundedClass = shape === "circle" ? "rounded-full" : "rounded-2xl";
  const gradient = getGradientFromName(name);
  const initials = getInitials(name);

  let ringClass = "";
  if (ring === "gold") {
    ringClass = "ring-2 ring-amber-400 ring-offset-2 ring-offset-white shadow-xs shadow-amber-200";
  } else if (ring === "silver") {
    ringClass = "ring-2 ring-slate-400 ring-offset-2 ring-offset-white shadow-xs shadow-slate-200";
  } else if (ring === "bronze") {
    ringClass = "ring-2 ring-amber-700 ring-offset-2 ring-offset-white shadow-xs shadow-amber-900/10";
  } else if (ring === "blue") {
    ringClass = "ring-2 ring-blue-500 ring-offset-1 ring-offset-white";
  } else if (ring === "default") {
    ringClass = "ring-1 ring-slate-200";
  }

  const hasValidImage = !!src && !imgError && typeof src === "string" && src.trim() !== "";

  return (
    <div className={`relative inline-flex shrink-0 ${sizeStyle.container} ${className}`}>
      <div
        className={`w-full h-full ${roundedClass} ${ringClass} overflow-hidden flex items-center justify-center select-none transition-transform`}
      >
        {hasValidImage ? (
          <img
            src={src}
            alt={alt || name}
            onError={() => setImgError(true)}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className={`w-full h-full bg-gradient-to-br ${gradient} text-white font-extrabold flex items-center justify-center ${sizeStyle.text} uppercase tracking-wider shadow-inner`}
          >
            {initials}
          </div>
        )}
      </div>

      {badge && (
        <div className="absolute -bottom-1 -right-1 z-10">
          {badge}
        </div>
      )}
    </div>
  );
}
