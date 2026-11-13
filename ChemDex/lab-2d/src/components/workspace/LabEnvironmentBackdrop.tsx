import React from 'react';
import { useLabEnvironment } from '../../store/useLabEnvironment';
import { SunbeamDust2D } from '../vfx/SunbeamDust2D';

export const LabEnvironmentBackdrop: React.FC = () => {
  const { environment, labTheme } = useLabEnvironment();
  const isDark = labTheme === 'dark';
  const isInert = environment.oxygenFraction === 0;
  const tempWarmth = Math.max(-1, Math.min(1, (environment.temperature_c - 24) / 14));

  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden z-0">
      {/* Upper Ceramic Splashback Wall (~42% of height) */}
      <div
        className="absolute top-0 left-0 right-0 h-[44%] transition-colors duration-500"
        style={{
          background: isDark
            ? 'linear-gradient(180deg, #0b1320 0%, #111c2d 65%, #17253a 100%)'
            : 'linear-gradient(180deg, #e7eef6 0%, #f1f5f9 55%, #e2e8f0 100%)',
          backgroundImage: isDark
            ? `linear-gradient(to right, rgba(148,163,184,0.06) 1px, transparent 1px),
               linear-gradient(to bottom, rgba(148,163,184,0.06) 1px, transparent 1px),
               linear-gradient(180deg, #0b1320 0%, #111c2d 65%, #17253a 100%)`
            : `linear-gradient(to right, rgba(148,163,184,0.18) 1px, transparent 1px),
               linear-gradient(to bottom, rgba(148,163,184,0.18) 1px, transparent 1px),
               linear-gradient(180deg, #edf3fa 0%, #f8fafc 60%, #e5ecf4 100%)`,
          backgroundSize: '56px 28px, 56px 28px, 100% 100%',
        }}
      >
        {/* Subtle Architectural Laboratory Fume Hood & Window Light Silhouette */}
        <div
          className="absolute right-8 top-4 w-56 h-28 rounded-lg border opacity-45 hidden md:block"
          style={{
            borderColor: isDark ? 'rgba(56,189,248,0.16)' : 'rgba(148,163,184,0.35)',
            background: isDark
              ? 'linear-gradient(180deg, rgba(15,23,42,0.55) 0%, rgba(30,41,59,0.25) 100%)'
              : 'linear-gradient(180deg, rgba(255,255,255,0.65) 0%, rgba(226,232,240,0.3) 100%)',
          }}
        >
          <div className="flex items-center justify-between px-2.5 py-1 border-b border-current/10">
            <span className={`text-[9px] font-mono tracking-wider ${isDark ? 'text-sky-300/70' : 'text-slate-400'}`}>
              FUME HOOD • {environment.airSpeed_m_s.toFixed(1)} m/s
            </span>
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isInert ? 'bg-amber-400' : 'bg-emerald-400'
              }`}
            />
          </div>
        </div>

        {/* Left Reagent Shelf Accent Shadow */}
        <div
          className="hidden lg:block absolute left-10 bottom-6 w-44 h-2 rounded-full opacity-40"
          style={{
            background: isDark ? '#334155' : '#cbd5e1',
            boxShadow: isDark ? '0 3px 10px rgba(0,0,0,0.5)' : '0 3px 8px rgba(100,116,139,0.2)',
          }}
        />
      </div>

      {/* Volumetric Diagonal Window Sunbeam & Atmospheric Thermal Tint */}
      <div
        className="absolute inset-0 transition-opacity duration-500"
        style={{
          background: isDark
            ? 'radial-gradient(ellipse at 26% 18%, rgba(56, 189, 248, 0.12) 0%, rgba(15, 23, 42, 0) 62%)'
            : `linear-gradient(118deg, rgba(255, 253, 240, 0.55) 0%, rgba(255, 255, 255, 0.12) 38%, rgba(226, 232, 240, 0) 70%)`,
        }}
      />

      {/* Ambient Temperature & Inert Gas Atmosphere Tint */}
      {(Math.abs(tempWarmth) > 0.2 || isInert) && (
        <div
          className="absolute inset-0 transition-colors duration-700"
          style={{
            backgroundColor: isInert
              ? 'rgba(245, 158, 11, 0.04)'
              : tempWarmth > 0
              ? `rgba(251, 146, 60, ${tempWarmth * 0.045})`
              : `rgba(56, 189, 248, ${Math.abs(tempWarmth) * 0.05})`,
          }}
        />
      )}

      {/* Drifting Illuminated Air Motes */}
      <SunbeamDust2D />

      {/* Back Splash Curb Trim Divider */}
      <div
        className="absolute left-0 right-0 top-[44%] h-2.5 border-y transition-colors duration-500"
        style={{
          background: isDark
            ? 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)'
            : 'linear-gradient(180deg, #cbd5e1 0%, #94a3b8 100%)',
          borderColor: isDark ? 'rgba(71,85,105,0.55)' : 'rgba(148,163,184,0.65)',
        }}
      />

      {/* Phenolic Resin / Slate Laboratory Benchtop Surface (Bottom 56%) */}
      <div
        className="absolute left-0 right-0 top-[calc(44%+10px)] bottom-0 transition-colors duration-500"
        style={{
          background: isDark
            ? `radial-gradient(rgba(148,163,184,0.16) 1px, transparent 1px),
               linear-gradient(180deg, #172334 0%, #1d2c40 48%, #142030 100%)`
            : `radial-gradient(rgba(100,116,139,0.22) 1px, transparent 1px),
               linear-gradient(180deg, #dde5ef 0%, #e7edf5 45%, #d6e0ec 100%)`,
          backgroundSize: '26px 26px, 100% 100%',
        }}
      />

      {/* Subtle Benchtop Front Specular Bevel */}
      <div
        className="absolute bottom-0 left-0 right-0 h-3 border-t transition-colors duration-500"
        style={{
          background: isDark
            ? 'linear-gradient(180deg, #1e293b 0%, #090f18 100%)'
            : 'linear-gradient(180deg, #cbd5e1 0%, #94a3b8 100%)',
          borderColor: isDark ? 'rgba(71,85,105,0.6)' : 'rgba(148,163,184,0.75)',
        }}
      />
    </div>
  );
};
