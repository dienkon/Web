import React, { useEffect, useRef } from 'react';
import { ParticleEngine, ParticlePresetName } from '../particles/ParticleEngine';
import { HeartLayerEngine } from '../particles/HeartLayerEngine';
import { HeartLayerConfig } from '../models/LoveStory';

interface ParticleCanvasProps {
  preset?: ParticlePresetName;
  primaryColor?: string;
  accentColor?: string;
  heartLayers?: HeartLayerConfig[];
  enabled?: boolean;
}

export const ParticleCanvas: React.FC<ParticleCanvasProps> = ({
  preset = 'romantic',
  primaryColor = '#f43f5e',
  accentColor = '#8b5cf6',
  heartLayers,
  enabled = true,
}) => {
  const particleCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const heartCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const particleEngineRef = useRef<ParticleEngine | null>(null);
  const heartEngineRef = useRef<HeartLayerEngine | null>(null);

  // Background atmosphere particles
  useEffect(() => {
    if (!particleCanvasRef.current || !enabled) return;

    const engine = new ParticleEngine(particleCanvasRef.current, preset, primaryColor, accentColor);
    particleEngineRef.current = engine;
    engine.start();

    const handleClick = (e: MouseEvent) => {
      engine.burst(e.clientX, e.clientY, 16);
      if (heartEngineRef.current) {
        heartEngineRef.current.burst(e.clientX, e.clientY, 12);
      }
    };
    window.addEventListener('click', handleClick);

    return () => {
      window.removeEventListener('click', handleClick);
      engine.destroy();
      particleEngineRef.current = null;
    };
  }, [enabled]);

  useEffect(() => {
    if (particleEngineRef.current) {
      particleEngineRef.current.setPreset(preset);
      particleEngineRef.current.setColors(primaryColor, accentColor);
    }
  }, [preset, primaryColor, accentColor]);

  // Multi-layer physics heart engine
  useEffect(() => {
    if (!heartCanvasRef.current || !enabled || !heartLayers || heartLayers.length === 0) return;

    const heartEngine = new HeartLayerEngine(heartCanvasRef.current, heartLayers);
    heartEngineRef.current = heartEngine;
    heartEngine.start();

    return () => {
      heartEngine.destroy();
      heartEngineRef.current = null;
    };
  }, [enabled, heartLayers]);

  useEffect(() => {
    if (heartEngineRef.current && heartLayers) {
      heartEngineRef.current.setLayers(heartLayers);
    }
  }, [heartLayers]);

  if (!enabled) return null;

  return (
    <>
      <canvas
        ref={particleCanvasRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />
      {heartLayers && heartLayers.length > 0 && (
        <canvas
          ref={heartCanvasRef}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 2,
          }}
        />
      )}
    </>
  );
};
