import localforage from 'localforage';
import { AppState, Project } from "../types";

localforage.config({
  name: 'NovelTranslationApp',
  storeName: 'projects_store'
});

const APP_STATE_KEY = "smart-translator-app-state-v2";
const ACTIVE_PROJECT_KEY = "smart-translator-active-project";

export const defaultSettings: AppState["settings"] = {
  style: "tieu_thuyet",
  pov: "linh_hoat",
  vietnameseLevel: "vua",
  keepTerms: true,
  autoFormatName: true,
  keepOriginalName: false,
  showTranslatorNotes: false,
  corsProxy: "https://corsproxy.io/?url=",
  customPrompt: "",
};

export const defaultState: AppState = {
  apiKey: "",
  model: "gemini-3.1-flash-lite",
  settings: defaultSettings,
};

export const StorageManager = {
  getAppState: (): AppState => {
    try {
      const saved = localStorage.getItem(APP_STATE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...defaultState,
          ...parsed,
          settings: {
            ...defaultState.settings,
            ...(parsed.settings || {}),
          },
        };
      }
    } catch (e) {
      console.error('Failed to parse AppState', e);
    }
    
    // Migrate from old state if exists
    try {
      const oldSaved = localStorage.getItem("smart-translator-settings");
      if (oldSaved) {
         const oldParsed = JSON.parse(oldSaved);
         return {
           ...defaultState,
           apiKey: oldParsed.apiKey || defaultState.apiKey,
           model: oldParsed.model || defaultState.model,
           settings: {
             ...defaultState.settings,
             ...(oldParsed.settings || {}),
           },
         };
      }
    } catch(e) {}
    
    return defaultState;
  },

  saveAppState: (state: Partial<AppState>) => {
    try {
      const currentState = StorageManager.getAppState();
      const newState = { ...currentState, ...state };
      localStorage.setItem(APP_STATE_KEY, JSON.stringify(newState));
    } catch (error) {
      console.error("Failed to save state to localStorage", error);
    }
  },

  getActiveProjectId: (): string | null => {
    return localStorage.getItem(ACTIVE_PROJECT_KEY);
  },

  setActiveProjectId: (id: string | null) => {
    if (id) {
      localStorage.setItem(ACTIVE_PROJECT_KEY, id);
    } else {
      localStorage.removeItem(ACTIVE_PROJECT_KEY);
    }
  },

  getProjects: async (): Promise<Project[]> => {
    const projects: Project[] = [];
    await localforage.iterate((value: Project) => {
      projects.push(value);
    });
    return projects.sort((a, b) => b.lastModified - a.lastModified);
  },

  getProject: async (id: string): Promise<Project | null> => {
    return await localforage.getItem<Project>(id);
  },

  saveProject: async (project: Project): Promise<void> => {
    project.lastModified = Date.now();
    await localforage.setItem(project.id, project);
  },

  deleteProject: async (id: string): Promise<void> => {
    await localforage.removeItem(id);
  }
};

