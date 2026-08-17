export interface CategoryConfig {
  id: string;
  label: string;
  icon: string;
  iconClass: string;
  buttonClass: string;
  idleClass: string;
  badgeClass: string;
  accentColor: string;
}

export interface DocMeta {
  id: string;
  title: string;
  author: string;
  category: string;
  summary: string;
  image: string;
  tags: string[];
}

export interface DocFull extends DocMeta {
  content: string;
}

export interface AppState {
  currentView: 'library' | 'reader';
  currentDocId: string | null;
  searchQuery: string;
  activeCategory: string | null;
  sidebarOpen: boolean;
  historyPanelOpen: boolean;
  bookmarkPanelOpen: boolean;
}
