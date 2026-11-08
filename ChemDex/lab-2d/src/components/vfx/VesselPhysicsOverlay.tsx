/**
 * 60 FPS Clipped 2D Canvas Physics & Reaction VFX Overlay for Glassware Vessels
 *
 * Renders authentic laboratory physical and chemical phenomena inside any 2D SVG vessel:
 * - Dynamic meniscus wave ripples & stirring vortex funnel
 * - Submerged 2D solid chunks (Fe nail, Zn granules, Mg ribbon, CaCO3 chips, Cu turnings, I2 crystals)
 *   with real-time shrinking mass and direct metallic Copper plating (#b85d3b)
 * - Multi-morphology Stokes-settling precipitates (PbI2 Golden Rain hexagonal platelets, AgCl curds,
 *   Fe(OH)3 rust flocs, Cu(OH)2/Al(OH)3 gel clouds, colloidal sulfur Tyndall haze) + settled bed
 * - Surface-nucleated gas bubbles rising with Archimedes buoyancy & sinusoidal wobble
 * - Molten Na / K pellet skittering on the meniscus with phenolphthalein pink wake trail, flame & sparks
 * - Inner wall condensation beads, iodine violet sublimation frost, evaporative solute stain rings
 * - Glass cracks & shattering shard ballistics
 */

import React, { useEffect, useRef } from 'react';
import { EquipmentState } from '../../types/equipment';
import { reactionRuntime2D } from '../../vfx/ReactionRuntime2D';

interface VesselPhysicsOverlayProps {
  equipment: EquipmentState;
  /** SVG viewBox X of vessel inner cavity */
  innerX: number;
  /** SVG viewBox Y of vessel inner cavity top */
  innerY: number;
  /** SVG viewBox width of vessel inner cavity */
  innerWidth: number;
  /** SVG viewBox height of vessel inner cavity */
  innerHeight: number;
  /** Current SVG Y of the liquid meniscus */
  liquidSurfaceY: number;
  /** Current SVG height of the liquid column */
  liquidHeight: number;
  /** Optional SVG clipPath ID to clip strictly to vessel interior */
  clipPathId?: string;
}

export const VesselPhysicsOverlay: React.FC<VesselPhysicsOverlayProps> = ({
  equipment,
  innerX,
  innerY,
  innerWidth,
  innerHeight,
  liquidSurfaceY,
  liquidHeight,
  clipPathId,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const equipmentRef = useRef<EquipmentState>(equipment);
  const geomRef = useRef({ innerX, innerY, innerWidth, innerHeight, liquidSurfaceY, liquidHeight });

  equipmentRef.current = equipment;
  geomRef.current = { innerX, innerY, innerWidth, innerHeight, liquidSurfaceY, liquidHeight };

  useEffect(() => {
    let rafId = 0;

    const renderFrame = () => {
      const canvas = canvasRef.current;
      const eq = equipmentRef.current;
      const { innerWidth: w, innerHeight: h, innerY: topY, liquidSurfaceY: surfY, liquidHeight: liqH } =
        geomRef.current;

      if (canvas && w > 0 && h > 0) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const dpr = 2; // Sharp retina rendering inside SVG foreignObject
          const targetW = Math.round(w * dpr);
          const targetH = Math.round(h * dpr);
          if (canvas.width !== targetW || canvas.height !== targetH) {
            canvas.width = targetW;
            canvas.height = targetH;
          }

          ctx.save();
          ctx.scale(dpr, dpr);
          ctx.clearRect(0, 0, w, h);

          const st = reactionRuntime2D.getOrCreateState(eq);
          const localMeniscusY = Math.max(2, Math.min(h - 2, surfY - topY));
          const localBottomY = Math.min(h, localMeniscusY + Math.max(0, liqH));

          // ── 1. Inner Wall Condensation Droplets (above meniscus when hot) ──
          const cond = eq.wallCondensation ?? (eq.temperature_c > 58 ? Math.min(1, (eq.temperature_c - 55) / 45) : 0);
          if (cond > 0.05 && localMeniscusY > 10) {
            ctx.fillStyle = `rgba(226, 232, 240, ${0.35 * cond})`;
            const dropCount = Math.floor(14 * cond);
            for (let i = 0; i < dropCount; i++) {
              const seed = (i * 97 + 31) % 100;
              const dx = 4 + ((seed * 13) % Math.max(8, w - 8));
              const dy = 6 + ((seed * 29 + Math.floor(st.ripplePhase * 2)) % Math.max(8, localMeniscusY - 6));
              const r = 1.1 + (seed % 3) * 0.45 * cond;
              ctx.beginPath();
              ctx.arc(dx, dy, r, 0, Math.PI * 2);
              ctx.fill();
            }
          }

          // ── 2. Iodine Sublimation Violet Vapor & Upper Wall Frost Crystals ──
          if (eq.hasSublimation || st.iodineFrostProgress > 0.02) {
            const frost = Math.max(st.iodineFrostProgress, eq.hasSublimation ? 0.55 : 0);
            const grad = ctx.createLinearGradient(0, h, 0, 0);
            grad.addColorStop(0, `rgba(147, 51, 234, ${0.42 * frost})`);
            grad.addColorStop(0.6, `rgba(168, 85, 247, ${0.28 * frost})`);
            grad.addColorStop(1, `rgba(126, 34, 206, ${0.15 * frost})`);
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h);

            // Glittering purple-black iodine frost crystals on upper walls
            for (let i = 0; i < 18; i++) {
              const sideX = i % 2 === 0 ? 3 + (i % 3) * 2.2 : w - 3 - (i % 3) * 2.2;
              const cy = 10 + ((i * 19) % Math.max(20, h * 0.45));
              ctx.save();
              ctx.translate(sideX, cy);
              ctx.rotate((i * 0.7) % Math.PI);
              ctx.fillStyle = `rgba(88, 28, 135, ${0.85 * frost})`;
              ctx.fillRect(-2.5, -1.2, 5, 2.4);
              ctx.restore();
            }
          }

          // ── 3. Evaporative Solute Stain Ring (when boiled dry) ──
          if (eq.evaporativeStain) {
            ctx.strokeStyle = eq.evaporativeStain.colorHex || '#e2e8f0';
            ctx.lineWidth = 2.5;
            ctx.globalAlpha = eq.evaporativeStain.opacity;
            ctx.setLineDash([4, 2]);
            ctx.beginPath();
            ctx.moveTo(2, h - 10);
            ctx.lineTo(w - 2, h - 10);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.globalAlpha = 1.0;
          }

          // ── 4. Liquid Interior Effects (Plumes, Colloidal Tyndall Haze, Wake Trail, Precipitates, Bubbles) ──
          if (liqH > 1.5 && !eq.isShattered) {
            // 4A. Color Diffusion Plumes / Flash Waves (e.g., Iodine Clock, Fe(SCN)3, Neutralization)
            for (const pl of st.plumes) {
              const px = pl.originX * w;
              const py = localMeniscusY + pl.originY * liqH;
              const rad = Math.max(4, pl.radiusNorm * Math.max(w, liqH));
              const g = ctx.createRadialGradient(px, py, 1, px, py, rad);
              g.addColorStop(0, pl.colorHex);
              g.addColorStop(1, 'rgba(255,255,255,0)');
              ctx.save();
              ctx.globalAlpha = Math.max(0, Math.min(0.85, pl.alpha));
              ctx.fillStyle = g;
              ctx.fillRect(0, localMeniscusY, w, liqH);
              ctx.restore();
            }

            // 4B. Colloidal Sulfur / Turbidity Tyndall Cone Effect
            const turb = Math.max(eq.turbidity ?? 0, st.dynamicTurbidity);
            if (turb > 0.1) {
              ctx.save();
              ctx.fillStyle = eq.precipitateColorHex || '#fef9c3';
              ctx.globalAlpha = Math.min(0.55, turb * 0.48);
              ctx.fillRect(0, localMeniscusY, w, liqH);
              ctx.restore();
            }

            // 4C. Alkali Metal Phenolphthalein Pink Wake Trail diffusing downward
            if (st.alkaliPellet && st.alkaliPellet.wakeTrail.length > 0) {
              for (const wk of st.alkaliPellet.wakeTrail) {
                if (wk.alpha <= 0.01) continue;
                const wx = wk.x * w;
                const wy = localMeniscusY + wk.y * liqH;
                const wg = ctx.createRadialGradient(wx, wy, 0.5, wx, wy, wk.radius_px);
                if (st.alkaliPellet.hasPhenolphthalein) {
                  wg.addColorStop(0, `rgba(236, 72, 153, ${wk.alpha})`);
                  wg.addColorStop(1, 'rgba(236, 72, 153, 0)');
                } else {
                  wg.addColorStop(0, `rgba(226, 232, 240, ${wk.alpha * 0.6})`);
                  wg.addColorStop(1, 'rgba(226, 232, 240, 0)');
                }
                ctx.fillStyle = wg;
                ctx.beginPath();
                ctx.arc(wx, wy, wk.radius_px, 0, Math.PI * 2);
                ctx.fill();
              }
            }

            // 4D. Settled Precipitate Sediment Bed at Bottom (tilts with meniscus wave)
            if (eq.hasPrecipitate && st.sedimentBedRatio > 0.005) {
              const bedH = Math.max(3, Math.min(20, liqH * st.sedimentBedRatio));
              const tiltOffset = Math.tan((st.meniscusAngle_deg * Math.PI) / 180) * (w * 0.35);
              ctx.save();
              ctx.fillStyle =
                st.thermalDecompProgress > 0.1
                  ? '#18181b' // Cu(OH)2 thermal decomposition turning black CuO at hot bottom
                  : eq.precipitateColorHex || '#ffffff';
              ctx.globalAlpha = 0.88;
              ctx.beginPath();
              ctx.moveTo(0, localBottomY - bedH - tiltOffset);
              ctx.quadraticCurveTo(
                w * 0.5,
                localBottomY - bedH * 1.15,
                w,
                localBottomY - bedH + tiltOffset
              );
              ctx.lineTo(w, localBottomY + 2);
              ctx.lineTo(0, localBottomY + 2);
              ctx.closePath();
              ctx.fill();
              ctx.restore();
            }

            // 4E. Multi-Morphology Precipitate Particles (Golden Rain plates, curds, flocs, gel)
            for (const p of st.precipitates) {
              const px = p.x * w;
              const py = localMeniscusY + p.y * Math.max(4, liqH - 3);
              ctx.save();
              ctx.translate(px, py);
              ctx.rotate(p.rotation_rad);

              if (p.morphology === 'plates' || (p.morphology === 'crystalline' && (p.colorHex === '#eab308' || p.colorHex === '#facc15'))) {
                // PbI2 Golden Rain: Shimmering hexagonal golden platelets!
                const shimmer = 0.55 + 0.45 * Math.sin(p.shimmerPhase * 2.5);
                ctx.fillStyle = shimmer > 0.82 ? '#fef08a' : '#eab308';
                ctx.globalAlpha = 0.45 + 0.55 * shimmer;
                const r = p.size_px * 0.75;
                ctx.beginPath();
                for (let k = 0; k < 6; k++) {
                  const ang = (Math.PI / 3) * k;
                  const hx = Math.cos(ang) * r;
                  const hy = Math.sin(ang) * r * 0.65;
                  if (k === 0) ctx.moveTo(hx, hy);
                  else ctx.lineTo(hx, hy);
                }
                ctx.closePath();
                ctx.fill();
              } else if (p.morphology === 'curdy') {
                // AgCl curdy white multi-lobe clumps
                ctx.fillStyle = p.colorHex;
                ctx.globalAlpha = 0.88;
                const r = p.size_px * 0.5;
                ctx.beginPath();
                ctx.arc(-r * 0.4, 0, r, 0, Math.PI * 2);
                ctx.arc(r * 0.4, -r * 0.2, r * 0.85, 0, Math.PI * 2);
                ctx.arc(0, r * 0.4, r * 0.8, 0, Math.PI * 2);
                ctx.fill();
              } else if (p.morphology === 'floc' || p.morphology === 'flocculent') {
                // Fe(OH)3 rust-brown feathery floc
                ctx.fillStyle = p.colorHex;
                ctx.globalAlpha = 0.82;
                ctx.beginPath();
                ctx.ellipse(0, 0, p.size_px * 0.8, p.size_px * 0.45, 0, 0, Math.PI * 2);
                ctx.fill();
              } else {
                // Gel / milky / powder
                ctx.fillStyle = p.colorHex;
                ctx.globalAlpha = p.morphology === 'gel' ? 0.52 : 0.78;
                ctx.beginPath();
                ctx.arc(0, 0, p.size_px * 0.55, 0, Math.PI * 2);
                ctx.fill();
              }
              ctx.restore();
            }
          }

          // ── 5. Submerged 2D Solid Chunks & Copper Surface Plating (Fe nail, Zn granule, Mg ribbon, CaCO3) ──
          if (eq.solidChunks && eq.solidChunks.length > 0 && !eq.isShattered) {
            for (const chunk of eq.solidChunks) {
              if (chunk.isFloating) continue; // Floating Na/K rendered at meniscus in step 7
              const cx = chunk.xNormalized * w;
              const cy = h - 6;
              const scale = Math.max(0.35, Math.min(1.15, Math.sqrt(chunk.mass_g / Math.max(0.1, chunk.initialMass_g))));
              const coatProg = Math.max(chunk.coatingProgress ?? 0, st.copperPlatingProgress);

              ctx.save();
              ctx.translate(cx, cy);
              ctx.scale(scale, scale);

              if (chunk.morphology === 'nail') {
                // Submerged Iron Nail (tilted 28 degrees)
                ctx.rotate(-0.48);
                ctx.fillStyle = chunk.colorHex || '#64748b';
                // Nail shaft
                ctx.fillRect(-14, -2.2, 28, 4.4);
                // Nail head
                ctx.fillRect(-16, -4.5, 3.2, 9);
                // Nail point
                ctx.beginPath();
                ctx.moveTo(14, -2.2);
                ctx.lineTo(19, 0);
                ctx.lineTo(14, 2.2);
                ctx.closePath();
                ctx.fill();

                // Direct metallic Copper Plating (#b85d3b) growing on the nail!
                if (chunk.coatingColorHex || coatProg > 0.05) {
                  ctx.fillStyle = chunk.coatingColorHex || '#b85d3b';
                  ctx.globalAlpha = Math.min(1, Math.max(0.65, coatProg));
                  ctx.fillRect(-12, -2.6, 26 * Math.min(1, Math.max(0.4, coatProg)), 5.2);
                }
              } else if (chunk.morphology === 'ribbon') {
                // Coiled Magnesium Ribbon
                ctx.strokeStyle = chunk.colorHex || '#e2e8f0';
                ctx.lineWidth = 2.6;
                ctx.beginPath();
                ctx.moveTo(-10, 0);
                ctx.bezierCurveTo(-5, -6, 0, 4, 5, -5);
                ctx.bezierCurveTo(8, -8, 11, 2, 13, -2);
                ctx.stroke();
              } else {
                // Granules (Zn, Al), Marble Chips (CaCO3), Iodine Crystals (I2), Catalyst (MnO2)
                for (let g = -1; g <= 1; g++) {
                  const gx = g * 7;
                  const gy = (g % 2) * -1.5;
                  ctx.fillStyle = chunk.colorHex || '#cbd5e1';
                  ctx.beginPath();
                  ctx.moveTo(gx - 4, gy + 2);
                  ctx.lineTo(gx - 2, gy - 3.5);
                  ctx.lineTo(gx + 3.5, gy - 2.5);
                  ctx.lineTo(gx + 4.5, gy + 2);
                  ctx.closePath();
                  ctx.fill();

                  if (chunk.coatingColorHex || coatProg > 0.05) {
                    ctx.strokeStyle = chunk.coatingColorHex || '#b85d3b';
                    ctx.lineWidth = 1.8;
                    ctx.stroke();
                  }
                }
              }
              ctx.restore();
            }
          }

          // ── 6. Nucleation & Buoyancy Bubbles ──
          if (liqH > 2 && st.bubbles.length > 0 && !eq.isShattered) {
            for (const b of st.bubbles) {
              const bx = b.x * w;
              const by = localMeniscusY + b.y * Math.max(2, liqH - 2);
              ctx.save();
              ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
              ctx.fillStyle =
                b.colorHex && b.colorHex !== '#ffffff'
                  ? b.colorHex
                  : 'rgba(255, 255, 255, 0.32)';
              ctx.lineWidth = 1.0;
              ctx.beginPath();
              ctx.arc(bx, by, b.radius_px, 0, Math.PI * 2);
              ctx.fill();
              ctx.stroke();
              ctx.restore();
            }
          }

          // ── 7. Dynamic Meniscus Wave & Stirring Vortex Funnel ──
          if (liqH > 1.5 && !eq.isShattered) {
            const tiltDy = Math.tan((st.meniscusAngle_deg * Math.PI) / 180) * (w * 0.45);
            const amp = st.rippleAmplitude_px;
            const vortex = st.vortexDepth_px;

            ctx.save();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            const steps = 16;
            for (let i = 0; i <= steps; i++) {
              const u = i / steps;
              const x = u * w;
              const tiltOffset = (u - 0.5) * 2 * tiltDy;
              const rippleOffset = Math.sin(u * Math.PI * 3 + st.ripplePhase) * amp * 0.45;
              const vortexOffset = vortex > 0.2 ? Math.exp(-Math.pow((u - 0.5) * 4.5, 2)) * vortex : 0;
              const y = localMeniscusY + tiltOffset + rippleOffset + vortexOffset;
              if (i === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.stroke();
            ctx.restore();
          }

          // ── 8. Skittering Molten Alkali Pellet (Na / K) + Flame Tongue on Water Surface ──
          if (st.alkaliPellet && liqH > 1.5 && !eq.isShattered) {
            const p = st.alkaliPellet;
            const px = p.x * w;
            const py = localMeniscusY;

            // Flame tongue above pellet
            ctx.save();
            const fh = p.flameHeight_px * (0.8 + 0.35 * Math.sin(st.ripplePhase * 3));
            const fg = ctx.createRadialGradient(px, py - fh * 0.35, 1, px, py - fh * 0.35, fh);
            fg.addColorStop(0, '#ffffff');
            fg.addColorStop(0.45, p.flameColorHex);
            fg.addColorStop(1, 'rgba(255, 170, 0, 0)');
            ctx.fillStyle = fg;
            ctx.beginPath();
            ctx.ellipse(px, py - fh * 0.4, p.radius_px * 1.4, fh * 0.7, 0, 0, Math.PI * 2);
            ctx.fill();

            // Molten silvery sphere on meniscus
            const sg = ctx.createRadialGradient(px - 1.5, py - 1.5, 0.5, px, py, p.radius_px);
            sg.addColorStop(0, '#ffffff');
            sg.addColorStop(0.6, '#e2e8f0');
            sg.addColorStop(1, '#64748b');
            ctx.fillStyle = sg;
            ctx.beginPath();
            ctx.arc(px, py, p.radius_px, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }

          // ── 9. Pyrotechnic Sparks & Acid Splatter Droplets ──
          if (st.sparks.length > 0) {
            for (const sp of st.sparks) {
              const sx = sp.x * w;
              const sy = localMeniscusY + sp.y * h * 0.5;
              const alpha = Math.max(0, 1 - sp.life / sp.maxLife);
              ctx.save();
              ctx.fillStyle = sp.colorHex;
              ctx.globalAlpha = alpha;
              ctx.beginPath();
              ctx.arc(sx, sy, sp.size_px, 0, Math.PI * 2);
              ctx.fill();
              ctx.restore();
            }
          }

          // ── 10. Magnesium Combustion Blinding White Bloom Flash ──
          if (st.mgFlashIntensity > 0.02) {
            const bg = ctx.createRadialGradient(w * 0.5, h * 0.65, 2, w * 0.5, h * 0.65, Math.max(w, h) * 0.75);
            bg.addColorStop(0, `rgba(255, 255, 255, ${Math.min(1, st.mgFlashIntensity * 1.2)})`);
            bg.addColorStop(0.6, `rgba(224, 242, 254, ${st.mgFlashIntensity * 0.65})`);
            bg.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = bg;
            ctx.fillRect(0, 0, w, h);
          }

          // ── 11. Shattered Glass Cracks & Flying Shards ──
          if (eq.isShattered) {
            ctx.save();
            ctx.strokeStyle = 'rgba(226, 232, 240, 0.9)';
            ctx.lineWidth = 1.6;
            // Jagged fracture lines across vessel body
            ctx.beginPath();
            ctx.moveTo(w * 0.2, h * 0.95);
            ctx.lineTo(w * 0.45, h * 0.62);
            ctx.lineTo(w * 0.32, h * 0.35);
            ctx.lineTo(w * 0.68, h * 0.15);
            ctx.moveTo(w * 0.45, h * 0.62);
            ctx.lineTo(w * 0.78, h * 0.48);
            ctx.stroke();

            for (const sh of st.shards) {
              ctx.save();
              ctx.translate(w * 0.5 + sh.x, h * 0.5 + sh.y);
              ctx.rotate(sh.angle_rad);
              ctx.fillStyle = `rgba(226, 232, 240, ${sh.alpha * 0.75})`;
              ctx.strokeStyle = `rgba(255, 255, 255, ${sh.alpha})`;
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(-sh.size_px, -sh.size_px * 0.5);
              ctx.lineTo(sh.size_px, 0);
              ctx.lineTo(0, sh.size_px * 0.8);
              ctx.closePath();
              ctx.fill();
              ctx.stroke();
              ctx.restore();
            }
            ctx.restore();
          }

          ctx.restore();
        }
      }

      rafId = requestAnimationFrame(renderFrame);
    };

    rafId = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <g clipPath={clipPathId ? `url(#${clipPathId})` : undefined} style={{ pointerEvents: 'none' }}>
      <foreignObject x={innerX} y={innerY} width={innerWidth} height={innerHeight}>
        <canvas
          ref={canvasRef}
          style={{
            width: `${innerWidth}px`,
            height: `${innerHeight}px`,
            display: 'block',
            pointerEvents: 'none',
          }}
        />
      </foreignObject>
    </g>
  );
};
