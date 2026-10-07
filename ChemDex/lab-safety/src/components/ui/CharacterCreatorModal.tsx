import React, { useState } from 'react';
import { Sheet } from '../../ui/Sheet';
import { Button } from '../../ui/Button';
import { useStore } from '../../store/useStore';
import { vi } from '../../i18n/vi';
import { User, Sparkles, Check } from 'lucide-react';

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
        <div className="md:col-span-5 flex flex-col items-center justify-center p-6 bg-gradient-to-b from-sky-50 to-white rounded-3xl border border-[var(--line)] shadow-inner text-center">
          <div className="relative w-32 h-32 rounded-full border-4 border-white shadow-lg overflow-hidden flex items-center justify-center mb-3" style={{ backgroundColor: skinTone }}>
            {/* Simple stylised 2D avatar representation */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {/* Hair preview */}
              <div
                className="w-24 h-16 rounded-t-full -mt-10 transition-colors"
                style={{ backgroundColor: hairColor }}
              />
              {/* Eyes */}
              <div className="flex gap-4 my-2">
                <span className="w-2.5 h-2.5 bg-slate-800 rounded-full" />
                <span className="w-2.5 h-2.5 bg-slate-800 rounded-full" />
              </div>
              {/* Smile */}
              <div className="w-5 h-2 border-b-2 border-slate-700 rounded-full" />
              {/* Shirt preview */}
              <div
                className="w-24 h-10 mt-3 rounded-t-2xl transition-colors flex items-center justify-center text-white text-[9px] font-bold"
                style={{ backgroundColor: shirtColor }}
              >
                BLOUSE
              </div>
            </div>
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
              <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-mono">
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
                  {hairColor === color && <Check className="w-3.5 h-3.5 text-white" />}
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
                  {shirtColor === color && <Check className="w-3.5 h-3.5 text-white" />}
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
