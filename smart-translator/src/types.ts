export interface Character {
  id: string;
  originalName: string;
  vietnameseName: string;
  gender: string;
  relationship: string;
  notes: string;
  preventAutoAdd?: boolean;
}

export interface Glossary {
  id: string;
  original: string;
  translated: string;
  type: string; 
  preventAutoAdd?: boolean;
}

export interface TranslationSettings {
  style: 'trang_trong' | 'tu_nhien' | 'hai_huoc' | 'sat_nghia' | 'tieu_thuyet';
  pov: 'ngoi_1' | 'ngoi_3' | 'linh_hoat';
  vietnameseLevel: 'thap' | 'vua' | 'cao';
  keepTerms: boolean;
  autoFormatName: boolean;
  keepOriginalName: boolean;
  showTranslatorNotes: boolean;
  corsProxy: string;
  customPrompt: string;
}

export interface HistoryEntry {
  id: string;
  title: string;
  date: string;
  sourceText: string;
  chunks: Chunk[];
}

export interface Project {
  id: string;
  name: string;
  lastModified: number;
  sourceText: string;
  chunks: Chunk[];
  characters: Character[];
  glossary: Glossary[];
  history: HistoryEntry[];
}

export interface AppState {
  apiKey: string;
  model: string;
  settings: TranslationSettings;
}

export interface Chunk {
  id: string;
  text: string;
  title?: string;
  translatedText?: string;
  status: 'idle' | 'translating' | 'success' | 'error';
  error?: string;
  summary?: string;
  notes?: string[];
  glossaryUpdates?: { original: string; translated: string }[];
}

