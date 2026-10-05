/**
 * audioAtoms.ts — Effect Atoms for Procedural WebAudio Synthesis
 */

import { EffectAtom } from '../types';
import { labSound } from '../../../utils/audio';

export const proceduralAcousticsAtom: EffectAtom = {
  name: 'proceduralAcoustics',
  version: 1,
  category: 'audio',
  summary_en: 'Procedural synthesized acoustic soundscape (Minnaert bubble chirp, gas cavitation hiss, boiling rumble, pop, glass clink).',
  useWhen: ['Any audible phenomenon (gas generation, boiling, ignition, pour, explosion)'],
  avoidWhen: ['Muted or silent events'],
  params: {
    soundProfile: {
      name: 'soundProfile',
      type: 'select',
      options: ['minnaert_bubble', 'fizz_effervescence', 'boil_rumble', 'sodium_sizzle', 'pop_ignition', 'glass_clink', 'explosion'],
      default: 'fizz_effervescence',
      description: 'Acoustic synthesizer mode'
    },
    volume: { name: 'volume', type: 'number', min: 0.0, max: 1.0, default: 0.7, description: 'Master gain' },
    pitchMultiplier: { name: 'pitchMultiplier', type: 'number', min: 0.5, max: 2.0, default: 1.0, description: 'Frequency scaling' }
  },
  budget: { shaderCost: 1 },
  anchorsAllowed: ['bulk', 'surface', 'rim'],
  mount(ctx, p) {
    if (typeof window !== 'undefined' && labSound) {
      if (p.soundProfile === 'sodium_sizzle' && (labSound as any).playSodiumSizzlePop) {
        (labSound as any).playSodiumSizzlePop(p.volume);
      } else if (p.soundProfile === 'fizz_effervescence') {
        labSound.playFizz();
      } else if (p.soundProfile === 'boil_rumble') {
        labSound.playFizzBubble();
      } else if (p.soundProfile === 'pop_ignition') {
        labSound.playPop();
      }
    }
    return { atom: 'proceduralAcoustics', instanceId: `audio_${Date.now()}`, alive: true, custom: { ...p } };
  },
  update() {},
  dispose(h) { h.alive = false; },
  gallery: [
    { title: 'Effervescence Fizz', description: 'Crisp high-frequency bubble fizz', params: { soundProfile: 'fizz_effervescence', volume: 0.8, pitchMultiplier: 1.0 } },
    { title: 'Sodium Sizzle & Pop', description: 'Cavitation hiss with stochastic Minnaert micro-pops', params: { soundProfile: 'sodium_sizzle', volume: 0.9, pitchMultiplier: 1.1 } }
  ],
  tests: ['procedural_acoustics_trigger']
};
