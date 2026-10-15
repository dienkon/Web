import React, { useMemo, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useEffect } from 'react';
import * as THREE from 'three';
import { Sheet } from '../../ui/Sheet';
import { Button } from '../../ui/Button';
import { useStore } from '../../store/useStore';
import { vi } from '../../i18n/vi';
import { Sparkles, Check, Rotate3D } from 'lucide-react';
import { PlayerModel } from '../3d/PlayerModel';
import type { CharacterProfile, PlayerState } from '../../types';

const SKIN_TONES = ['#fde5d2', '#f7d3ba', '#e0ac83', '#b8794c', '#834c2b', '#4a2b19'];
const HAIR_COLORS = ['#1a110a', '#3d2314', '#70411b', '#d49b55', '#a53225', '#7a7a7a'];
const SHIRT_COLORS = ['#0ea5b7', '#1f6feb', '#1fa463', '#d7263d', '#7c5cff', '#0f2233'];

const HAIR_STYLES = [
  { id: 'short', label: 'Tóc ngắn' },
  { id: 'ponytail', label: 'Buộc đuôi ngựa' },
  { id: 'long', label: 'Tóc dài buông' },
  { id: 'bun', label: 'Tóc búi cao' },
  { id: 'braided', label: 'Tóc tết' },
] as const;

function PreviewCamera() {
  const { camera, size } = useThree();
  useEffect(() => {
    const c = camera as THREE.PerspectiveCamera;
    const halfFov = THREE.MathUtils.degToRad(c.fov / 2);
    const distance = Math.max(1.05 / Math.tan(halfFov), 0.65 / (Math.tan(halfFov) * size.width / size.height));
    c.position.set(0, 0.85, distance); c.lookAt(0, 0.85, 0); c.updateProjectionMatrix();
  }, [camera, size.width, size.height]);
  return <OrbitControls target={[0, 0.85, 0]} enablePan={false} enableZoom={false} minPolarAngle={Math.PI / 2.8} maxPolarAngle={Math.PI / 1.7} />;
}

export const CharacterCreatorModal: React.FC = () => {
  const show = useStore((s) => s.showCharacterCreator);
  const setShow = useStore((s) => s.setShowCharacterCreator);
  const character = useStore((s) => s.character);
  const updateCharacter = useStore((s) => s.updateCharacter);

  const [name, setName] = useState(character.name);
  const [gender, setGender] = useState(character.gender);
  const [skinTone, setSkinTone] = useState(character.skinTone);
  const [hairStyle, setHairStyle] = useState(character.hairStyle);
  const [hairColor, setHairColor] = useState(character.hairColor);
  const [shirtColor, setShirtColor] = useState(character.shirtColor);
  const draftCharacter = useMemo<CharacterProfile>(() => ({
    name: name.trim() || 'Học Sinh', gender, skinTone, hairStyle, hairColor, shirtColor,
  }), [name, gender, skinTone, hairStyle, hairColor, shirtColor]);
  const previewPlayer = useMemo<PlayerState>(() => ({
    equipment: { hasGoggles: true, hasLabCoat: true, hasGloves: true, hasMask: false, hairTied: true, hasClosedShoes: true },
    inventory: { hasFireExtinguisher: false, isHoldingTrash: false, heldTrashType: null, hasSweeper: false },
    flags: { fireExtinguished: false, trashCount: 0, trash1Picked: false, trash2Picked: false, trash3Picked: false },
  }), []);

  const handleSave = () => {
    updateCharacter({
      name: name.trim().slice(0, 30) || 'Học Sinh',
      gender,
      skinTone,
      hairStyle,
      hairColor,
      shirtColor,
    });
    setShow(false);
  };

  if (!show) return null;

  return (
    <Sheet
      isOpen={show}
      onClose={() => setShow(false)}
      title={vi.character.title}
      subtitle={vi.character.subtitle}
      maxWidth="max-w-2xl"
    >
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* Live Character Preview Card */}
        <div className="md:col-span-5 flex flex-col items-center justify-center p-4 bg-[radial-gradient(circle_at_50%_20%,#cffafe_0%,#ecfeff_28%,#f8fafc_72%)] rounded-3xl border border-cyan-100 shadow-inner text-center overflow-hidden">
          <div className="relative w-full h-64 mb-2 rounded-2xl overflow-hidden">
            <div className="absolute left-3 bottom-3 z-10 inline-flex items-center gap-1.5 rounded-full border border-cyan-200 bg-white/70 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-cyan-800 backdrop-blur-none">
              <Rotate3D className="h-3 w-3" /> Xem trước 3D
            </div>
            <Canvas camera={{ position: [0, 0.85, 4.8], fov: 30 }} dpr={1} gl={{ antialias: true }}>
              <ambientLight intensity={1.7} />
              <directionalLight position={[3, 5, 4]} intensity={2.2} color="#ffffff" />
              <directionalLight position={[-3, 2, 2]} intensity={0.9} color="#67e8f9" />
              <PreviewCamera />
              <group>
                <PlayerModel position={[0, 0, 0]} rotationY={0} isMoving={false} player={previewPlayer} character={draftCharacter} />
              </group>
            </Canvas>
          </div>
          <h4 className="font-extrabold text-[var(--ink)] text-base">{name || 'Học Sinh'}</h4>
          <span className="text-xs text-[var(--ink-2)] mt-0.5">
            {gender === 'male' ? 'Nam sinh' : 'Nữ sinh'} · {HAIR_STYLES.find(h => h.id === hairStyle)?.label}
          </span>
        </div>

        {/* Customization Controls */}
        <div className="md:col-span-7 space-y-4">
          {/* Name Field */}
          <div>
            <label className="block text-xs font-bold text-[var(--ink)] mb-1 uppercase tracking-wider">
              {vi.character.nameLabel}
            </label>
            <div className="relative">
              <input
                type="text"
                value={name}
                maxLength={30}
                onChange={(e) => setName(e.target.value)}
                placeholder={vi.character.namePlaceholder}
                className="w-full px-4 py-2.5 bg-white border border-[var(--line)] rounded-xl text-sm font-semibold text-[var(--ink)] focus:border-[var(--primary)] focus:outline-none transition-colors"
              />
              <span className="absolute right-3 top-2.5 text-xs text-slate-600 font-mono">
                {name.length}/30
              </span>
            </div>
          </div>

          {/* Gender / Body Type */}
          <div>
            <label className="block text-xs font-bold text-[var(--ink)] mb-1 uppercase tracking-wider">
              {vi.character.gender}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setGender('male')}
                className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                  gender === 'male'
                    ? 'bg-[var(--primary-50)] text-[var(--primary-600)] border-[var(--primary)]'
                    : 'bg-white text-slate-600 border-[var(--line)]'
                }`}
              >
                {vi.character.genderMale}
              </button>
              <button
                type="button"
                onClick={() => setGender('female')}
                className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                  gender === 'female'
                    ? 'bg-[var(--primary-50)] text-[var(--primary-600)] border-[var(--primary)]'
                    : 'bg-white text-slate-600 border-[var(--line)]'
                }`}
              >
                {vi.character.genderFemale}
              </button>
            </div>
          </div>

          {/* Skin Tone Swatches */}
          <div>
            <label className="block text-xs font-bold text-[var(--ink)] mb-1 uppercase tracking-wider">
              {vi.character.skinTone}
            </label>
            <div className="flex gap-2">
              {SKIN_TONES.map((tone) => (
                <button
                  key={tone}
                  type="button"
                  onClick={() => setSkinTone(tone)}
                  className={`w-7 h-7 rounded-full border-2 transition-transform active:scale-95 flex items-center justify-center ${
                    skinTone === tone ? 'scale-115 border-[var(--primary)] ring-2 ring-[var(--primary)]/30' : 'border-white shadow-xs'
                  }`}
                  style={{ backgroundColor: tone }}
                >
                  {skinTone === tone && <Check className="w-3.5 h-3.5 text-slate-800" />}
                </button>
              ))}
            </div>
          </div>

          {/* Hair Styles */}
          <div>
            <label className="block text-xs font-bold text-[var(--ink)] mb-1 uppercase tracking-wider">
              {vi.character.hairStyle}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {HAIR_STYLES.map((style) => (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => setHairStyle(style.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    hairStyle === style.id
                      ? 'bg-[var(--primary-50)] text-[var(--primary-600)] border-[var(--primary)]'
                      : 'bg-white text-slate-600 border-[var(--line)]'
                  }`}
                >
                  {style.label}
                </button>
              ))}
            </div>
          </div>

          {/* Hair Color */}
          <div>
            <label className="block text-xs font-bold text-[var(--ink)] mb-1 uppercase tracking-wider">
              {vi.character.hairColor}
            </label>
            <div className="flex gap-2">
              {HAIR_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setHairColor(color)}
                  className={`w-7 h-7 rounded-full border-2 transition-transform active:scale-95 flex items-center justify-center ${
                    hairColor === color ? 'scale-115 border-[var(--primary)] ring-2 ring-[var(--primary)]/30' : 'border-white shadow-xs'
                  }`}
                  style={{ backgroundColor: color }}
                >
                  {hairColor === color && <Check className="w-3.5 h-3.5 text-slate-800" />}
                </button>
              ))}
            </div>
          </div>

          {/* Undershirt Color */}
          <div>
            <label className="block text-xs font-bold text-[var(--ink)] mb-1 uppercase tracking-wider">
              {vi.character.shirtColor}
            </label>
            <div className="flex gap-2">
              {SHIRT_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setShirtColor(color)}
                  className={`w-7 h-7 rounded-full border-2 transition-transform active:scale-95 flex items-center justify-center ${
                    shirtColor === color ? 'scale-115 border-[var(--primary)] ring-2 ring-[var(--primary)]/30' : 'border-white shadow-xs'
                  }`}
                  style={{ backgroundColor: color }}
                >
                  {shirtColor === color && <Check className="w-3.5 h-3.5 text-slate-800" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-[var(--line)] flex justify-end">
        <Button variant="primary" size="lg" onClick={handleSave} icon={<Sparkles className="w-5 h-5" />}>
          {vi.character.saveAndContinue}
        </Button>
      </div>
    </Sheet>
  );
};
