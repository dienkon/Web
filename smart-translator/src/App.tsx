/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from "react";
import { GoogleGenAI } from "@google/genai";
import { ApiKeyPanel } from "./components/panels/ApiKeyPanel";
import { SettingsPanel } from "./components/panels/SettingsPanel";
import { SourcePanel } from "./components/panels/SourcePanel";
import { OutputPanel } from "./components/panels/OutputPanel";
import { ProjectPanel } from "./components/panels/ProjectPanel";
import { StorageManager } from "./lib/storage";
import { AppState, Project, Chunk, HistoryEntry } from "./types";
import { splitIntoChunks } from "./lib/novel";
import { translateChunk } from "./lib/gemini";
import {
  Play,
  Square,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  FileText,
  ChevronLeft,
} from "lucide-react";

export default function App() {
  const [appState, setAppState] = useState<AppState>(
    StorageManager.getAppState(),
  );
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [isLoadingProject, setIsLoadingProject] = useState(true);

  const [isTranslating, setIsTranslating] = useState(false);

  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [showMiddlePanel, setShowMiddlePanel] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [logs, setLogs] = useState<string[]>([]);
  const [showLogPanel, setShowLogPanel] = useState(false);

  const addLog = (msg: string) => {
    setLogs((prev) =>
      [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`].slice(-100),
    );
  };

  const stopRequestedRef = useRef(false);

  // Auto-save app state
  useEffect(() => {
    StorageManager.saveAppState(appState);
  }, [appState]);

  // Auto-save active project
  useEffect(() => {
    if (activeProject) {
      StorageManager.saveProject(activeProject);
    }
  }, [activeProject]);

  useEffect(() => {
    const init = async () => {
      const pId = StorageManager.getActiveProjectId();
      if (pId) {
        const p = await StorageManager.getProject(pId);
        if (p) setActiveProject(p);
        else StorageManager.setActiveProjectId(null);
      }
      setIsLoadingProject(false);
    };
    init();
  }, []);

  const handleSelectProject = async (id: string) => {
    const p = await StorageManager.getProject(id);
    if (p) {
      setActiveProject(p);
      StorageManager.setActiveProjectId(id);
    }
  };

  const handleCloseProject = () => {
    setActiveProject(null);
    StorageManager.setActiveProjectId(null);
  };

  const updateApiKey = (apiKey: string, model: string) => {
    setAppState((s) => ({ ...s, apiKey, model }));
  };

  const updateProject = (updates: Partial<Project>) => {
    if (!activeProject) return;
    setActiveProject((prev) => (prev ? { ...prev, ...updates } : null));
  };

  const handleTranslate = async (feedback?: string) => {
    if (!appState.apiKey) {
      alert("Vui lòng nhập và kiểm tra API Key trước khi dịch!");
      return;
    }
    if (!activeProject || !activeProject.sourceText.trim()) {
      alert("Vui lòng nhập nội dung cần dịch!");
      return;
    }

    let currentAppState = appState;
    if (feedback) {
      currentAppState = {
        ...appState,
        settings: {
          ...appState.settings,
          customPrompt:
            (appState.settings.customPrompt
              ? appState.settings.customPrompt + "\n\n"
              : "") +
            "LƯU Ý ĐÁNH GIÁ: " +
            feedback,
        },
      };
      setAppState(currentAppState);
    }

    const ai = new GoogleGenAI({ apiKey: currentAppState.apiKey });
    const initialChunks = splitIntoChunks(activeProject.sourceText);

    updateProject({ chunks: initialChunks });
    setIsTranslating(true);
    stopRequestedRef.current = false;

    // Auto-open right panel if hidden
    setShowRightPanel(true);

    let previousSummary = "";
    const newChunks = [...initialChunks];
    let newGlossary = [...activeProject.glossary];

    for (let i = 0; i < newChunks.length; i++) {
      if (stopRequestedRef.current) {
        break;
      }

      newChunks[i] = { ...newChunks[i], status: "translating" };
      updateProject({ chunks: [...newChunks] });

      try {
        const result = await translateChunk(
          ai,
          currentAppState.model,
          newChunks[i],
          {
            ...currentAppState,
            characters: activeProject.characters,
            glossary: newGlossary,
          },
          previousSummary,
        );
        newChunks[i] = {
          ...newChunks[i],
          translatedText: result.translatedText,
          summary: result.summary,
          notes: result.notes,
          glossaryUpdates: result.glossaryUpdates,
          status: "success",
        };
        previousSummary = result.summary || previousSummary;

        if (result.glossaryUpdates && result.glossaryUpdates.length > 0) {
          let updatedG = false;
          result.glossaryUpdates.forEach((term) => {
            // Check if it exists and is not blocked
            const existing = newGlossary.find(
              (g) => g.original.toLowerCase() === term.original.toLowerCase(),
            );
            if (!existing) {
              newGlossary.push({
                id: Date.now().toString() + Math.random().toString(),
                original: term.original,
                translated: term.translated,
                type: "AI_SUGGESTED",
              });
              updatedG = true;
            } else if (
              !existing.preventAutoAdd &&
              existing.translated !== term.translated
            ) {
              // if it exists but not blocked, we could theoretically update it, but let's just leave it or let AI know
            }
          });
          if (updatedG) {
            updateProject({ glossary: [...newGlossary] });
          }
        }
      } catch (error: any) {
        newChunks[i] = {
          ...newChunks[i],
          status: "error",
          error: error.message,
        };
        updateProject({ chunks: [...newChunks] });
        setIsTranslating(false);
        return;
      }
      updateProject({ chunks: [...newChunks] });
    }

    if (!stopRequestedRef.current) {
      const historyEntry: HistoryEntry = {
        id: Date.now().toString(),
        title: `Bản dịch ${new Date().toLocaleTimeString()}`,
        date: new Date().toISOString(),
        sourceText: activeProject.sourceText,
        chunks: newChunks,
      };
      updateProject({
        history: [historyEntry, ...(activeProject.history || [])].slice(0, 50),
      });
    }

    setIsTranslating(false);
  };

  const handleStop = () => {
    stopRequestedRef.current = true;
    setIsTranslating(false);
  };

  const handleLoadHistory = (entry: HistoryEntry) => {
    updateProject({ sourceText: entry.sourceText, chunks: entry.chunks });
    setShowRightPanel(true);
  };

  if (isLoadingProject) {
    return (
      <div className="h-screen bg-slate-50 flex items-center justify-center text-slate-500">
        Loading...
      </div>
    );
  }

  if (!activeProject) {
    return <ProjectPanel onSelectProject={handleSelectProject} />;
  }

  const activePanelsCount = [
    showLeftPanel,
    showMiddlePanel,
    showRightPanel,
  ].filter(Boolean).length;

  const getPanelClass = (defaultWidth: string) => {
    if (activePanelsCount === 1) return "flex-1 w-full";
    if (activePanelsCount === 2) return "flex-1 md:w-1/2";
    return defaultWidth;
  };

  return (
    <div className="h-screen bg-slate-50 text-slate-800 font-sans flex flex-col overflow-hidden">
      <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-2 md:px-4 shrink-0">
        <div className="flex items-center space-x-1 md:space-x-3">
          <button
            onClick={handleCloseProject}
            className="p-1.5 text-slate-400 hover:text-slate-800 rounded-md hover:bg-slate-100 transition-colors mr-2 flex items-center gap-1"
            title="Quay lại danh sách dự án"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            onClick={() => setShowLeftPanel(!showLeftPanel)}
            className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-md hover:bg-slate-100 transition-colors"
          >
            {showLeftPanel ? (
              <PanelLeftClose className="w-5 h-5" />
            ) : (
              <PanelLeftOpen className="w-5 h-5" />
            )}
          </button>
          <div className="hidden md:flex w-8 h-8 bg-indigo-600 rounded-lg items-center justify-center ml-2">
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
              ></path>
            </svg>
          </div>
          <div className="flex flex-col ml-1">
            <h1 className="text-sm md:text-base font-bold text-slate-800 tracking-tight truncate max-w-[120px] md:max-w-[200px]">
              {activeProject.name}
            </h1>
            <span className="text-[9px] md:text-[10px] text-slate-500">
              Smart Translator v1.2
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-1 md:space-x-4">
          {isTranslating ? (
            <button
              onClick={handleStop}
              className="flex items-center gap-1 md:gap-2 bg-red-50 text-red-700 px-2 py-1.5 md:px-3 rounded-full font-medium hover:bg-red-100 transition-colors border border-red-100 text-xs"
            >
              <Square className="w-3.5 h-3.5" />{" "}
              <span className="hidden md:inline">Dừng dịch</span>
            </button>
          ) : (
            <button
              onClick={() => handleTranslate()}
              className="flex items-center gap-1 md:gap-2 bg-indigo-600 text-white px-2 py-1.5 md:px-4 rounded-full font-medium hover:bg-indigo-700 transition-colors shadow-sm text-xs"
            >
              <Play className="w-3.5 h-3.5 fill-current" />{" "}
              <span className="hidden md:inline">Bắt đầu dịch</span>
            </button>
          )}

          <button
            onClick={() => setShowMiddlePanel(!showMiddlePanel)}
            className={`p-1.5 rounded-md transition-colors ml-1 md:ml-2 ${showMiddlePanel ? "text-indigo-600 bg-indigo-50" : "text-slate-400 hover:text-indigo-600 hover:bg-slate-100"}`}
            title="Toggle Source Panel"
          >
            <FileText className="w-5 h-5" />
          </button>

          <button
            onClick={() => setShowRightPanel(!showRightPanel)}
            className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-md hover:bg-slate-100 transition-colors ml-1"
          >
            {showRightPanel ? (
              <PanelRightClose className="w-5 h-5" />
            ) : (
              <PanelRightOpen className="w-5 h-5" />
            )}
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden relative">
        {/* Left Column: Settings */}
        {showLeftPanel && (
          <aside
            className={`${getPanelClass("md:w-80")} w-full min-h-[500px] md:min-h-0 md:h-auto bg-white border-b md:border-b-0 md:border-r border-slate-200 flex flex-col shrink-0 overflow-y-auto p-4 space-y-6 transition-all duration-300`}
          >
            <ApiKeyPanel
              apiKey={appState.apiKey}
              model={appState.model}
              onUpdate={updateApiKey}
            />
            <SettingsPanel
              settings={appState.settings}
              characters={activeProject.characters}
              glossary={activeProject.glossary}
              onUpdateSettings={(s) =>
                setAppState((prev) => ({ ...prev, settings: s }))
              }
              onUpdateCharacters={(c) => updateProject({ characters: c })}
              onUpdateGlossary={(g) => updateProject({ glossary: g })}
            />
          </aside>
        )}

        {/* Middle Column: Source */}
        {showMiddlePanel && (
          <section
            className={`${getPanelClass("flex-1")} w-full min-h-[500px] md:min-h-0 md:h-auto flex flex-col p-2 md:p-6 space-y-4 overflow-hidden bg-slate-50 transition-all duration-300`}
          >
            <SourcePanel
              sourceText={activeProject.sourceText}
              onUpdateSource={(text) => updateProject({ sourceText: text })}
              corsProxy={appState.settings.corsProxy}
              addLog={addLog}
            />
          </section>
        )}

        {/* Right Column: Output */}
        {showRightPanel && (
          <aside
            className={`${getPanelClass("md:w-[450px]")} w-full min-h-[600px] md:min-h-0 md:h-auto bg-slate-50 border-t md:border-t-0 md:border-l border-slate-200 flex flex-col shrink-0 overflow-hidden p-2 md:p-4 transition-all duration-300`}
          >
            <OutputPanel
              chunks={activeProject.chunks}
              history={activeProject.history || []}
              onLoadHistory={handleLoadHistory}
              onClearHistory={() => updateProject({ history: [] })}
              onRetranslate={handleTranslate}
            />
          </aside>
        )}
      </main>

      {showLogPanel && (
        <div className="h-48 bg-slate-900 border-t border-slate-700 shrink-0 flex flex-col">
          <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
            <h4 className="text-xs font-bold text-slate-300">System Logs</h4>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setLogs([])}
                className="text-[10px] text-slate-400 hover:text-slate-200"
              >
                Clear
              </button>
              <button
                onClick={() => setShowLogPanel(false)}
                className="text-[10px] text-slate-400 hover:text-slate-200"
              >
                Close
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-1 font-mono text-[10px] text-slate-400">
            {logs.length === 0 ? (
              <div className="text-slate-500 italic">No logs yet...</div>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="break-all">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <footer className="h-8 bg-slate-800 flex items-center px-4 justify-between shrink-0 text-[10px] text-slate-400 relative z-10">
        <div className="flex items-center space-x-4">
          <span>
            System Status: <span className="text-emerald-400">Ready</span>
          </span>
          <button
            onClick={() => setShowLogPanel(!showLogPanel)}
            className={`px-2 py-1 rounded hover:bg-slate-700 transition-colors ${showLogPanel ? "bg-slate-700 text-slate-200" : ""}`}
          >
            Logs ({logs.length})
          </button>
        </div>
        <div className="flex space-x-4">
        </div>
      </footer>
    </div>
  );
}
