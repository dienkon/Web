import type { SiteAdapter } from "./types";
import { sieugioiAdapter } from "./adapters/sieugioiAdapter";
import { genericAdapter } from "./adapters/genericAdapter";

class ParserRegistry {
  private adapters: SiteAdapter[] = [];

  constructor() {
    // Đăng ký các adapter theo thứ tự ưu tiên (Site-specific trước, Generic sau cùng)
    this.register(sieugioiAdapter);
    this.register(genericAdapter);
  }

  public register(adapter: SiteAdapter): void {
    // Không đăng ký trùng ID
    this.adapters = this.adapters.filter((a) => a.id !== adapter.id);
    // Site-specific đưa lên trước generic
    if (adapter.id === "generic") {
      this.adapters.push(adapter);
    } else {
      this.adapters.unshift(adapter);
    }
  }

  public getAdapter(url: string, html?: string): SiteAdapter {
    for (const adapter of this.adapters) {
      if (adapter.id !== "generic" && adapter.canHandle(url, html)) {
        return adapter;
      }
    }
    return genericAdapter;
  }

  public getAllAdapters(): SiteAdapter[] {
    return [...this.adapters];
  }
}

export const parserRegistry = new ParserRegistry();
