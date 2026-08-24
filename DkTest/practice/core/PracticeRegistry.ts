import { PracticeCategory, PracticeMode } from "./types";
import { ALL_PRACTICE_MODES } from "../generators/registerAllModes";

export class PracticeRegistryClass {
  private modes: Map<string, PracticeMode> = new Map();

  constructor() {
    this.initModes();
  }

  private initModes() {
    if (this.modes.size === 0 && ALL_PRACTICE_MODES && ALL_PRACTICE_MODES.length > 0) {
      ALL_PRACTICE_MODES.forEach((mode) => {
        if (mode && mode.id) {
          this.modes.set(mode.id, mode);
        }
      });
    }
  }

  public register(mode: PracticeMode): void {
    this.initModes();
    if (mode && mode.id) {
      this.modes.set(mode.id, mode);
    }
  }

  public registerMany(modes: PracticeMode[]): void {
    modes.forEach((m) => this.register(m));
  }

  public get(id: string): PracticeMode | undefined {
    this.initModes();
    return this.modes.get(id);
  }

  public getAll(): PracticeMode[] {
    this.initModes();
    return Array.from(this.modes.values());
  }

  public getByCategory(category: PracticeCategory): PracticeMode[] {
    return this.getAll().filter((m) => m.category === category);
  }

  public getCategories(): PracticeCategory[] {
    const cats = new Set<PracticeCategory>();
    this.getAll().forEach((m) => cats.add(m.category));
    return Array.from(cats);
  }

  public search(params: {
    keyword?: string;
    category?: string;
    grade?: number;
    rule?: string;
  }): PracticeMode[] {
    return this.getAll().filter((m) => {
      if (params.category && params.category !== "all" && m.category !== params.category) {
        return false;
      }
      if (params.grade && (params.grade < m.gradeRange[0] || params.grade > m.gradeRange[1])) {
        return false;
      }
      if (params.rule && params.rule !== "all" && m.gameRule !== params.rule) {
        return false;
      }
      if (params.keyword && params.keyword.trim()) {
        const kw = params.keyword.toLowerCase().trim();
        const inTitle = m.title.toLowerCase().includes(kw);
        const inDesc = m.description.toLowerCase().includes(kw);
        const inTag = m.shortTag?.toLowerCase().includes(kw) || false;
        if (!inTitle && !inDesc && !inTag) return false;
      }
      return true;
    });
  }
}

export const practiceRegistry = new PracticeRegistryClass();
export const PracticeRegistry = practiceRegistry;
