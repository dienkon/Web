import { useState, useEffect, useCallback, useRef } from 'react';

export function useSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  
  const sentencesRef = useRef<string[]>([]);
  const currentIndexRef = useRef<number>(0);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const isSpeakingRef = useRef<boolean>(false);
  const isPausedRef = useRef<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    
    const synth = window.speechSynthesis;
    const updateVoices = () => {
      setVoices(synth.getVoices());
    };
    
    updateVoices();
    synth.onvoiceschanged = updateVoices;
    
    return () => {
      synth.onvoiceschanged = null;
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
    utterance.lang = 'vi-VN';
    
    // Choose the best Vietnamese female voice
    const viVoices = voices.filter(v => v.lang === 'vi-VN' || v.lang.startsWith('vi'));
    let selectedVoice = viVoices[0] || null;

    // Female voice keywords for Vietnamese (Linh, Lan, HoaiMy, An, Google, Siri)
    const femaleKeywords = [/linh/i, /lan/i, /hoaimy/i, /an/i, /google/i, /female/i, /siri/i];
    for (const regex of femaleKeywords) {
      const found = viVoices.find(v => regex.test(v.name));
      if (found) {
        selectedVoice = found;
        break;
      }
    }

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    // Set "tốc độ vừa phải" (moderate rate), 0.9 - 0.95 is extremely clear and gentle for Vietnamese
    utterance.rate = 0.92; 
    utterance.pitch = 1.0; 
    utterance.volume = 1.0; // "âm lượng ổn định" (stable volume)

    utterance.onend = () => {
      // "ngắt câu mượt": slight delay for a natural pause before reading the next sentence
      if (isSpeakingRef.current && !isPausedRef.current) {
        setTimeout(() => {
          if (isSpeakingRef.current && !isPausedRef.current) {
            currentIndexRef.current++;
            speakNext();
          }
        }, 350); // Natural breathing pause of 350ms
      }
    };

    utterance.onerror = (e) => {
      console.warn('Speech synthesis error:', e);
      if (isSpeakingRef.current) {
        currentIndexRef.current++;
        speakNext();
      }
    };

    synth.speak(utterance);
  }, [voices]);

  const speak = useCallback((text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const synth = window.speechSynthesis;
    
    // Stop any ongoing speech first
    isSpeakingRef.current = false;
    isPausedRef.current = false;
    synth.cancel();

    // Clean markdown and HTML tags for clear pronunciation
    let cleanText = text
      .replace(/<[^>]+>/g, ' ') // remove HTML tags
      .replace(/[#*>_`\-\[\]()|\\\/]/g, ' ') // remove markdown symbols
      .replace(/\s+/g, ' '); // collapse extra spaces

    // Split text into readable sentences/phrases cleanly
    const sentences = cleanText
      .split(/(?<=[.!?。])\s+/)
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

    if (synth.paused) {
      isPausedRef.current = false;
      setIsPaused(false);
      synth.resume();
    } else if (synth.speaking) {
      isPausedRef.current = true;
      setIsPaused(true);
      synth.pause();
    }
  }, []);

  return { speak, stop, togglePause, isSpeaking, isPaused, hasVoices: voices.length > 0 };
}
