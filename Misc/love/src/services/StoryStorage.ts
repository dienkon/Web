import { LoveStory } from '../models/LoveStory';
import { DEMO_STORY } from '../data/demoStory';

const STORAGE_KEY = 'love_stories_collection';
const DRAFT_KEY = 'love_story_active_draft';

export class StoryStorage {
  public static getStories(): Record<string, LoveStory> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        // Initialize with DEMO_STORY
        const initial = { [DEMO_STORY.id]: DEMO_STORY };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
        return initial;
      }
      return JSON.parse(raw);
    } catch {
      return { [DEMO_STORY.id]: DEMO_STORY };
    }
  }

  public static getStory(id: string): LoveStory | null {
    if (id === DEMO_STORY.id || id === 'demo') {
      return DEMO_STORY;
    }
    const stories = this.getStories();
    if (stories[id]) {
      return stories[id];
    }
    // Check active draft
    const draft = this.getDraft();
    if (draft && draft.id === id) {
      return draft;
    }
    return null;
  }

  public static saveStory(story: LoveStory): void {
    const stories = this.getStories();
    story.updatedAt = Date.now();
    stories[story.id] = story;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stories));
  }

  public static saveDraft(story: LoveStory): void {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(story));
  }

  public static getDraft(): LoveStory | null {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  public static deleteStory(id: string): void {
    const stories = this.getStories();
    delete stories[id];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stories));
  }

  public static duplicateStory(story: LoveStory): LoveStory {
    const newId = 'story-' + Math.random().toString(36).substring(2, 9);
    const duplicated: LoveStory = {
      ...JSON.parse(JSON.stringify(story)),
      id: newId,
      title: `${story.title} (Bản sao)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.saveStory(duplicated);
    return duplicated;
  }

  // URL-safe UTF-8 Base64 Serialization for standalone link sharing
  public static encodeStoryForShare(story: LoveStory): string {
    try {
      const json = JSON.stringify(story);
      // Safe utf-8 encode
      const bytes = new TextEncoder().encode(json);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    } catch (e) {
      console.error('Failed to encode story:', e);
      return '';
    }
  }

  public static decodeStoryFromShare(token: string): LoveStory | null {
    try {
      let base64 = token.replace(/-/g, '+').replace(/_/g, '/');
      while (base64.length % 4) {
        base64 += '=';
      }
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const json = new TextDecoder().decode(bytes);
      const parsed = JSON.parse(json);
      if (parsed && parsed.sender && parsed.receiver) {
        return parsed as LoveStory;
      }
      return null;
    } catch (e) {
      console.error('Failed to decode story token:', e);
      return null;
    }
  }

  public static exportToJson(story: LoveStory): void {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(story, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `love-story-${story.receiver.name || 'secret'}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  public static importFromJson(jsonText: string): LoveStory | null {
    try {
      const parsed = JSON.parse(jsonText);
      if (parsed && parsed.sender && parsed.receiver) {
        parsed.id = 'imported-' + Math.random().toString(36).substring(2, 9);
        parsed.createdAt = Date.now();
        parsed.updatedAt = Date.now();
        this.saveStory(parsed);
        return parsed as LoveStory;
      }
      return null;
    } catch {
      return null;
    }
  }
}
