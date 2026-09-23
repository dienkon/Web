/**
 * ChemDex Data Editor State Manager
 */
import { deepClone } from "./utils.js";

class EditorState {
  constructor() {
    this.elements = []; // 118 elements metadata with grid positions
    this.elementBySymbol = new Map();
    this.elementByNumber = new Map();

    this.originalSnapshots = new Map(); // symbol -> pristine object
    this.workingCopies = new Map();     // symbol -> editable working copy in memory
    this.dirtySet = new Set();          // Set of dirty symbols
    this.cloudDataMap = new Map();       // symbol -> cloud document if loaded

    this.selectedSymbol = null;
    this.activeTab = "visual"; // 'visual' | 'json' | 'diff'
    this.cloudStatus = "connecting"; // 'connecting' | 'synced' | 'offline' | 'error'
    this.currentUser = null;
    this.lastSaveTime = null;

    // Filter & Search states
    this.searchQuery = "";
    this.categoryFilter = "all";
    this.periodFilter = "all";
    this.groupFilter = "all";
    this.statusFilter = "all"; // 'all' | 'has-data' | 'no-data' | 'dirty'

    // Subscribers
    this.listeners = {
      activeElement: new Set(),
      dirty: new Set(),
      filter: new Set(),
      cloudStatus: new Set(),
      auth: new Set(),
      dataUpdate: new Set(),
    };
  }

  // Active filters getter
  get filters() {
    return {
      query: this.searchQuery,
      category: this.categoryFilter,
      period: this.periodFilter,
      group: this.groupFilter,
      status: this.statusFilter,
    };
  }

  // Subscribe methods
  subscribe(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].add(callback);
      return () => this.listeners[event].delete(callback);
    }
    return () => {};
  }

  notify(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach((cb) => {
        try {
          cb(data);
        } catch (err) {
          console.error(`Error in state subscriber for ${event}:`, err);
        }
      });
    }
  }

  // Grid Algorithm (Identical layout to js/core.js)
  computeGridPositions(elements) {
    return elements.map((el, i) => {
      const z = el.number;
      let xpos = 1;
      let ypos = 1;

      if (z >= 1 && z <= 2) {
        ypos = 1;
        xpos = z === 1 ? 1 : 18;
      } else if (z >= 3 && z <= 10) {
        ypos = 2;
        xpos = z <= 4 ? z - 2 : z + 8;
      } else if (z >= 11 && z <= 18) {
        ypos = 3;
        xpos = z <= 12 ? z - 10 : z;
      } else if (z >= 19 && z <= 36) {
        ypos = 4;
        xpos = z - 18;
      } else if (z >= 37 && z <= 54) {
        ypos = 5;
        xpos = z - 36;
      } else if (z >= 55 && z <= 86) {
        if (z >= 55 && z <= 56) {
          ypos = 6;
          xpos = z - 54;
        } else if (z >= 57 && z <= 71) {
          ypos = 9;
          xpos = z - 57 + 4;
          el.category = "lanthanide";
        } else {
          ypos = 6;
          xpos = z - 71 + 3;
        }
      } else if (z >= 87 && z <= 118) {
        if (z >= 87 && z <= 88) {
          ypos = 7;
          xpos = z - 86;
        } else if (z >= 89 && z <= 103) {
          ypos = 10;
          xpos = z - 89 + 4;
          el.category = "actinide";
        } else {
          ypos = 7;
          xpos = z - 103 + 3;
        }
      }

      // Shift 1 row and 1 col for table header labels
      return {
        ...el,
        xpos: xpos + 1,
        ypos: ypos + 1,
        gridCol: xpos + 1,
        gridRow: ypos + 1,
      };
    });
  }

  initElements(manifestList) {
    this.elements = this.computeGridPositions(manifestList);
    this.elementBySymbol.clear();
    this.elementByNumber.clear();

    this.elements.forEach((el) => {
      this.elementBySymbol.set(el.symbol.toUpperCase(), el);
      this.elementByNumber.set(el.number, el);
    });
  }

  getElementMeta(symbolOrNumber) {
    if (symbolOrNumber == null) return null;
    if (typeof symbolOrNumber === "number") {
      return this.elementByNumber.get(symbolOrNumber) || null;
    }
    const raw = String(symbolOrNumber).trim();
    if (/^\d+$/.test(raw)) {
      return this.elementByNumber.get(parseInt(raw, 10)) || null;
    }
    return this.elementBySymbol.get(raw.toUpperCase()) || null;
  }

  setCloudStatus(status) {
    this.cloudStatus = status;
    this.notify("cloudStatus", status);
  }

  setCurrentUser(user) {
    this.currentUser = user;
    this.notify("auth", user);
  }

  setInitialElementData(symbol, data) {
    const sym = symbol.toUpperCase();
    const cloned = deepClone(data);
    this.originalSnapshots.set(sym, deepClone(cloned));
    this.workingCopies.set(sym, cloned);
    this.checkDirty(sym);
  }

  getWorkingCopy(symbol) {
    if (!symbol) return null;
    const sym = symbol.toUpperCase();
    return this.workingCopies.get(sym) || null;
  }

  getOriginalSnapshot(symbol) {
    if (!symbol) return null;
    const sym = symbol.toUpperCase();
    return this.originalSnapshots.get(sym) || null;
  }

  checkDirty(symbol) {
    const sym = symbol.toUpperCase();
    const orig = this.originalSnapshots.get(sym);
    const curr = this.workingCopies.get(sym);

    if (!orig && !curr) {
      this.dirtySet.delete(sym);
      return false;
    }

    const isDifferent = JSON.stringify(orig) !== JSON.stringify(curr);
    const wasDirty = this.dirtySet.has(sym);

    if (isDifferent) {
      this.dirtySet.add(sym);
    } else {
      this.dirtySet.delete(sym);
    }

    if (wasDirty !== isDifferent) {
      this.notify("dirty", {
        symbol: sym,
        isDirty: isDifferent,
        dirtyCount: this.dirtySet.size,
        dirtyList: Array.from(this.dirtySet),
      });
    }

    return isDifferent;
  }

  updateWorkingCopy(symbol, mutatorFn) {
    const sym = symbol.toUpperCase();
    let current = this.workingCopies.get(sym);
    if (!current) return;

    mutatorFn(current);
    this.checkDirty(sym);
    this.notify("dataUpdate", { symbol: sym, data: current });
  }

  setWorkingCopyDirect(symbol, newObject) {
    const sym = symbol.toUpperCase();
    const cloned = deepClone(newObject);
    this.workingCopies.set(sym, cloned);
    this.checkDirty(sym);
    this.notify("dataUpdate", { symbol: sym, data: cloned });
  }

  cancelChanges(symbol) {
    const sym = symbol.toUpperCase();
    const orig = this.originalSnapshots.get(sym);
    if (!orig) return;
    this.workingCopies.set(sym, deepClone(orig));
    this.checkDirty(sym);
    this.notify("dataUpdate", { symbol: sym, data: this.workingCopies.get(sym) });
  }

  cancelAllChanges() {
    const symbols = Array.from(this.dirtySet);
    symbols.forEach((sym) => {
      this.cancelChanges(sym);
    });
  }

  markSaved(symbol, newSnapshot = null) {
    const sym = symbol.toUpperCase();
    const savedData = newSnapshot ? deepClone(newSnapshot) : deepClone(this.workingCopies.get(sym));
    this.originalSnapshots.set(sym, deepClone(savedData));
    this.workingCopies.set(sym, savedData);
    this.dirtySet.delete(sym);
    this.lastSaveTime = new Date();

    // Mark hasData as true for this element
    const meta = this.getElementMeta(sym);
    if (meta) meta.hasData = true;

    this.notify("dirty", {
      symbol: sym,
      isDirty: false,
      dirtyCount: this.dirtySet.size,
      dirtyList: Array.from(this.dirtySet),
    });
    this.notify("dataUpdate", { symbol: sym, data: savedData });
  }

  isDirty(symbol) {
    return this.dirtySet.has(symbol.toUpperCase());
  }

  getDirtyList() {
    return Array.from(this.dirtySet);
  }

  selectElement(symbol) {
    const sym = symbol ? symbol.toUpperCase() : null;
    if (this.selectedSymbol === sym) return;
    this.selectedSymbol = sym;
    this.notify("activeElement", sym);
  }

  setFilters({ query, category, period, group, status }) {
    let changed = false;
    if (query !== undefined && query !== this.searchQuery) {
      this.searchQuery = query;
      changed = true;
    }
    if (category !== undefined && category !== this.categoryFilter) {
      this.categoryFilter = category;
      changed = true;
    }
    if (period !== undefined && period !== this.periodFilter) {
      this.periodFilter = period;
      changed = true;
    }
    if (group !== undefined && group !== this.groupFilter) {
      this.groupFilter = group;
      changed = true;
    }
    if (status !== undefined && status !== this.statusFilter) {
      this.statusFilter = status;
      changed = true;
    }

    if (changed) {
      this.notify("filter", {
        query: this.searchQuery,
        category: this.categoryFilter,
        period: this.periodFilter,
        group: this.groupFilter,
        status: this.statusFilter,
      });
    }
  }

  getFilteredElements() {
    const q = this.searchQuery.trim().toLowerCase();
    const cat = this.categoryFilter;
    const period = this.periodFilter !== "all" ? parseInt(this.periodFilter, 10) : null;
    const group = this.groupFilter !== "all" ? parseInt(this.groupFilter, 10) : null;
    const status = this.statusFilter;

    return this.elements.filter((el) => {
      // Status filter
      if (status === "has-data" && !el.hasData) return false;
      if (status === "no-data" && el.hasData) return false;
      if (status === "dirty" && !this.isDirty(el.symbol)) return false;

      // Category filter
      if (cat !== "all" && el.category !== cat) return false;

      // Group / Period
      if (period !== null) {
        // Grid ypos - 1 roughly corresponds to period
        // For standard periods 1-7:
        const elPeriod = el.general?.period || (el.ypos <= 8 ? el.ypos - 1 : null);
        if (elPeriod !== period) return false;
      }
      if (group !== null) {
        const elGroup = el.general?.group || (el.xpos <= 19 ? el.xpos - 1 : null);
        if (elGroup !== group) return false;
      }

      // Search Query
      if (q) {
        const matchSymbol = el.symbol.toLowerCase().includes(q);
        const matchNumber = String(el.number) === q;
        const matchNameVi = (el.nameVi || "").toLowerCase().includes(q);
        const matchNameEn = (el.nameEn || "").toLowerCase().includes(q);
        if (!matchSymbol && !matchNumber && !matchNameVi && !matchNameEn) {
          return false;
        }
      }

      return true;
    });
  }
}

export const state = new EditorState();
