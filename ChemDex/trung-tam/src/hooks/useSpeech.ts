import { useState, useEffect, useCallback, useRef } from 'react';

export type SpeechGender = 'female' | 'male';
export type SpeechSpeed = 0.75 | 1 | 1.25 | 1.5 | 2;

export interface SpeechSettings {
  rate: SpeechSpeed;
  pitch: number;
  gender: SpeechGender;
  voiceURI: string;
}

const STORAGE_KEY = 'chemdex_speech_settings_v2';

export function useSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [vietnameseVoices, setVietnameseVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Settings state
  const [rate, setRateState] = useState<SpeechSpeed>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.rate) return parsed.rate;
        }
      } catch {}
    }
    return 1;
  });

  const [pitch, setPitchState] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (typeof parsed.pitch === 'number') return parsed.pitch;
        }
      } catch {}
    }
    return 1.0;
  });

  const [gender, setGenderState] = useState<SpeechGender>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.gender) return parsed.gender;
        }
      } catch {}
    }
    return 'female';
  });

  const [selectedVoiceURI, setSelectedVoiceURIState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.voiceURI) return parsed.voiceURI;
        }
      } catch {}
    }
    return '';
  });

  const rateRef = useRef<SpeechSpeed>(rate);
  const pitchRef = useRef<number>(pitch);
  const genderRef = useRef<SpeechGender>(gender);
  const voiceURIRef = useRef<string>(selectedVoiceURI);

  const sentencesRef = useRef<string[]>([]);
  const currentIndexRef = useRef<number>(0);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const isSpeakingRef = useRef<boolean>(false);
  const isPausedRef = useRef<boolean>(false);

  // Sync state to refs & localStorage
  const saveSettings = useCallback((newRate: SpeechSpeed, newPitch: number, newGender: SpeechGender, newURI: string) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          rate: newRate,
          pitch: newPitch,
          gender: newGender,
          voiceURI: newURI
        }));
      } catch {}
    }
  }, []);

  const setRate = useCallback((newRate: SpeechSpeed) => {
    rateRef.current = newRate;
    setRateState(newRate);
    saveSettings(newRate, pitchRef.current, genderRef.current, voiceURIRef.current);
  }, [saveSettings]);

  const setPitch = useCallback((newPitch: number) => {
    pitchRef.current = newPitch;
    setPitchState(newPitch);
    saveSettings(rateRef.current, newPitch, genderRef.current, voiceURIRef.current);
  }, [saveSettings]);

  const setGender = useCallback((newGender: SpeechGender) => {
    genderRef.current = newGender;
    setGenderState(newGender);
    saveSettings(rateRef.current, pitchRef.current, newGender, voiceURIRef.current);
  }, [saveSettings]);

  const setSelectedVoiceURI = useCallback((newURI: string) => {
    voiceURIRef.current = newURI;
    setSelectedVoiceURIState(newURI);
    saveSettings(rateRef.current, pitchRef.current, genderRef.current, newURI);
  }, [saveSettings]);

  // Load and categorize voices
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const synth = window.speechSynthesis;
    const updateVoices = () => {
      const allVoices = synth.getVoices();
      setVoices(allVoices);

      const viList = allVoices.filter(v => {
        const lang = (v.lang || '').toLowerCase().replace('_', '-');
        return lang === 'vi-vn' || lang === 'vi' || lang.startsWith('vi-') || /vietnam/i.test(v.name) || /tiếng việt/i.test(v.name);
      });
      setVietnameseVoices(viList);
    };

    updateVoices();
    synth.onvoiceschanged = updateVoices;

    // Polling fallback in case onvoiceschanged does not fire
    const timer = setTimeout(updateVoices, 250);

    return () => {
      synth.onvoiceschanged = null;
      clearTimeout(timer);
    };
  }, []);

  const stop = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    isSpeakingRef.current = false;
    isPausedRef.current = false;

    window.speechSynthesis.cancel();

    setIsSpeaking(false);
    setIsPaused(false);
    currentIndexRef.current = 0;
    sentencesRef.current = [];
    utteranceRef.current = null;
  }, []);

  // Helper to resolve the best voice for the chosen gender and language
  const resolveVoice = useCallback(() => {
    const currentGender = genderRef.current;
    const userURI = voiceURIRef.current;

    // 1. If explicit voice chosen by user
    if (userURI) {
      const found = voices.find(v => v.voiceURI === userURI);
      if (found) return { voice: found, isMaleVoiceDetected: /nam|minh|tuan|duc|khoa|male/i.test(found.name) };
    }

    // 2. Search in Vietnamese voices
    const viList = vietnameseVoices.length > 0 ? vietnameseVoices : voices.filter(v => {
      const lang = (v.lang || '').toLowerCase().replace('_', '-');
      return lang.startsWith('vi') || /vietnam/i.test(v.name) || /tiếng việt/i.test(v.name);
    });

    const femaleKeywords = [/hoaimy/i, /linh/i, /lan/i, /mai/i, /chi/i, /an/i, /nu/i, /nữ/i, /female/i, /girl/i, /siri/i, /google/i];
    const maleKeywords = [/nam/i, /namminh/i, /minh/i, /tuan/i, /tuấn/i, /duc/i, /đức/i, /khoa/i, /phong/i, /male/i, /boy/i];

    if (currentGender === 'male') {
      const maleVoice = viList.find(v => maleKeywords.some(regex => regex.test(v.name)));
      if (maleVoice) {
        return { voice: maleVoice, isMaleVoiceDetected: true };
      }
      // If no explicit male voice exists, return best vi voice with flag to modulate pitch
      return { voice: viList[0] || null, isMaleVoiceDetected: false };
    } else {
      const femaleVoice = viList.find(v => femaleKeywords.some(regex => regex.test(v.name)));
      if (femaleVoice) {
        return { voice: femaleVoice, isMaleVoiceDetected: false };
      }
      return { voice: viList[0] || null, isMaleVoiceDetected: false };
    }
  }, [voices, vietnameseVoices]);

  const speakNext = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    if (!isSpeakingRef.current) return;

    const synth = window.speechSynthesis;

    if (currentIndexRef.current >= sentencesRef.current.length) {
      isSpeakingRef.current = false;
      setIsSpeaking(false);
      setIsPaused(false);
      currentIndexRef.current = 0;
      sentencesRef.current = [];
      utteranceRef.current = null;
      return;
    }

    const currentText = sentencesRef.current[currentIndexRef.current];
    if (!currentText || !currentText.trim()) {
      currentIndexRef.current++;
      speakNext();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(currentText.trim());
    utteranceRef.current = utterance;

    // Guaranteed Vietnamese default
    utterance.lang = 'vi-VN';

    const { voice, isMaleVoiceDetected } = resolveVoice();
    if (voice) {
      utterance.voice = voice;
      if (voice.lang) utterance.lang = voice.lang;
    }

    // Rate calculation: base Vietnamese pace is 0.92, multiplied by user selection
    const baseRate = 0.92;
    utterance.rate = Math.max(0.5, Math.min(2.5, baseRate * rateRef.current));

    // Pitch calculation: modulate lower for male, higher for female
    const basePitch = pitchRef.current;
    if (genderRef.current === 'male') {
      // Lower pitch for male voice: if natural male voice detected, gentle tweak; if synthetic fallback, pitch shift down to 0.82
      utterance.pitch = isMaleVoiceDetected
        ? Math.max(0.5, Math.min(1.8, basePitch * 0.94))
        : Math.max(0.5, Math.min(1.8, basePitch * 0.82));
    } else {
      // Female voice: pleasant natural pitch
      utterance.pitch = Math.max(0.5, Math.min(1.8, basePitch * 1.05));
    }

    utterance.volume = 1.0;

    utterance.onend = () => {
      if (isSpeakingRef.current && !isPausedRef.current) {
        setTimeout(() => {
          if (isSpeakingRef.current && !isPausedRef.current) {
            currentIndexRef.current++;
            speakNext();
          }
        }, 300);
      }
    };

    utterance.onerror = (e) => {
      console.warn('Speech synthesis utterance error:', e);
      if (isSpeakingRef.current) {
        currentIndexRef.current++;
        speakNext();
      }
    };

    synth.speak(utterance);
  }, [resolveVoice]);

  const speak = useCallback((text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const synth = window.speechSynthesis;

    isSpeakingRef.current = false;
    isPausedRef.current = false;
    synth.cancel();

    // Clean markdown and HTML tags for natural pronunciation
    const cleanText = text
      .replace(/<[^>]+>/g, ' ')
      .replace(/[#*>`\-\[\]()|\\\/]/g, ' ')
      .replace(/_{1,2}/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const sentences = cleanText
      .split(/(?<=[.!?。;\n])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    if (sentences.length === 0) return;

    sentencesRef.current = sentences;
    currentIndexRef.current = 0;
    isSpeakingRef.current = true;
    isPausedRef.current = false;

    setIsSpeaking(true);
    setIsPaused(false);

    speakNext();
  }, [speakNext]);

  const togglePause = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const synth = window.speechSynthesis;

    if (synth.paused || isPausedRef.current) {
      isPausedRef.current = false;
      setIsPaused(false);
      synth.resume();
    } else if (synth.speaking || isSpeakingRef.current) {
      isPausedRef.current = true;
      setIsPaused(true);
      synth.pause();
    }
  }, []);

  const testVoice = useCallback((customText?: string) => {
    const sample = customText || (genderRef.current === 'male'
      ? 'Xin chào bạn, đây là giọng đọc Nam tiếng Việt của trung tâm tri thức ChemDex.'
      : 'Xin chào bạn, đây là giọng đọc Nữ tiếng Việt của trung tâm tri thức ChemDex.');
    speak(sample);
  }, [speak]);

  return {
    speak,
    stop,
    togglePause,
    testVoice,
    isSpeaking,
    isPaused,
    hasVoices: voices.length > 0,
    vietnameseVoices,
    allVoices: voices,
    rate,
    setRate,
    pitch,
    setPitch,
    gender,
    setGender,
    selectedVoiceURI,
    setSelectedVoiceURI
  };
}
