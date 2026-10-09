/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Knowledge Constellation Modal for DkTEST 3D Learning Journey
 * Visualizes educational topic relationships (prerequisites, extensions, applications).
 * Fully supports Light & Dark themes.
 */

import React, { useState, useMemo } from "react";
import {
  X,
  Share2,
  Search,
  BookOpen,
  ArrowRight,
  Link2,
  Layers,
  Play,
  Info,
} from "lucide-react";
import clsx from "clsx";
import { useNavigate } from "react-router-dom";
import type { SubjectThemeType } from "../types/journey3D";
import type { KnowledgeNode, KnowledgeRelationshipType } from "../types/knowledgeConstellation";
import {
  getKnowledgeGraph,
  searchKnowledgeNodes,
} from "../services/knowledgeGraphService";

interface KnowledgeConstellationModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSubject: SubjectThemeType;
}

export default function KnowledgeConstellationModal({
  isOpen,
  onClose,
  activeSubject,
}: KnowledgeConstellationModalProps) {
  const navigate = useNavigate();
  const [selectedSubject, setSelectedSubject] = useState<SubjectThemeType>(activeSubject);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNode, setSelectedNode] = useState<KnowledgeNode | null>(null);

  const graphData = useMemo(() => {
    return getKnowledgeGraph(selectedSubject);
  }, [selectedSubject]);

  const filteredNodes = useMemo(() => {
    return searchKnowledgeNodes(searchQuery, selectedSubject);
  }, [searchQuery, selectedSubject]);

  if (!isOpen) return null;

  // Find incoming and outgoing edges for selected node
  const incomingEdges = selectedNode
    ? graphData.edges.filter((e) => e.targetNodeId === selectedNode.id)
    : [];
  const outgoingEdges = selectedNode
    ? graphData.edges.filter((e) => e.sourceNodeId === selectedNode.id)
    : [];

  const getRelationshipBadge = (rel: KnowledgeRelationshipType) => {
    switch (rel) {
      case "prerequisite_for":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30">Tiên quyết cho</span>;
      case "applied_in":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">Ứng dụng trong</span>;
      case "extends":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30">Phát triển từ</span>;
      case "related_to":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30">Liên kết cùng</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300">Liên quan</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl h-[88vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-900 dark:text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-50 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center border border-cyan-200 dark:border-cyan-500/30">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Chòm Sao Tri Thức
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-50 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-500/30">
                  Knowledge Constellation
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Mạng lưới liên kết bản chất giữa các chủ đề: Tiên quyết, Mở rộng & Ứng dụng thực tiễn
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters & Search Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-2.5 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800/80">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mr-1">Môn học:</span>
            {(["math", "physics", "chemistry"] as SubjectThemeType[]).map((sub) => {
              const isSel = selectedSubject === sub;
              const label = sub === "math" ? "Toán" : sub === "physics" ? "Vật Lý" : "Hóa";
              return (
                <button
                  key={sub}
                  onClick={() => {
                    setSelectedSubject(sub);
                    setSelectedNode(null);
                  }}
                  className={clsx(
                    "px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer",
                    isSel
                      ? "bg-cyan-600 text-white shadow-md shadow-cyan-600/30"
                      : "bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-200"
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm chủ đề, mục tiêu..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-cyan-500"
            />
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Visual Topic Node Grid / Constellation Map */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
              <span>Tìm thấy {filteredNodes.length} nút kiến thức trong chòm sao</span>
              <span className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
                <Info className="w-3.5 h-3.5" />
                Nhấp vào nút để soi sáng các liên kết
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {filteredNodes.map((node) => {
                const isSelected = selectedNode?.id === node.id;
                const edgeCount = graphData.edges.filter(
                  (e) => e.sourceNodeId === node.id || e.targetNodeId === node.id
                ).length;

                return (
                  <div
                    key={node.id}
                    onClick={() => setSelectedNode(node)}
                    className={clsx(
                      "p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group shadow-xs",
                      isSelected
                        ? "bg-cyan-50 dark:bg-cyan-950/60 border-cyan-500 ring-2 ring-cyan-500/30 shadow-lg shadow-cyan-900/10"
                        : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-cyan-500/50"
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 border border-slate-200 dark:border-cyan-500/20">
                          {node.code}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Link2 className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
                          {edgeCount} liên kết
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition-colors">
                        {node.label}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">{node.chapter}</p>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="capitalize">Cấp độ: {node.cognitiveLevel.replace("_", " ")}</span>
                      <span className="text-cyan-600 dark:text-cyan-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform font-semibold">
                        Xem chi tiết <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Node Details & Connected Edges */}
          <div className="w-full md:w-96 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 p-6 flex flex-col justify-between overflow-y-auto">
            {selectedNode ? (
              <div className="space-y-5">
                <div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-50 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-500/30">
                    {selectedNode.code}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1.5">{selectedNode.label}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{selectedNode.chapter}</p>
                </div>

                {/* Learning Objectives */}
                <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 shadow-xs">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <BookOpen className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                    Mục tiêu năng lực cốt lõi:
                  </div>
                  <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1 pl-4 list-disc marker:text-cyan-500">
                    {selectedNode.learningObjectives.map((obj, i) => (
                      <li key={i}>{obj}</li>
                    ))}
                  </ul>
                </div>

                {/* Educational Relationships */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Link2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                    Mối quan hệ liên kết trong chòm sao
                  </h4>

                  {incomingEdges.length === 0 && outgoingEdges.length === 0 && (
                    <p className="text-xs text-slate-400 italic">Chưa có liên kết phụ thuộc nào.</p>
                  )}

                  {/* Prerequisites (Incoming) */}
                  {incomingEdges.map((e) => {
                    const sourceNode = graphData.nodes.find((n) => n.id === e.sourceNodeId);
                    return (
                      <div
                        key={e.id}
                        className="p-3 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs shadow-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-900 dark:text-white">{sourceNode?.label}</span>
                          {getRelationshipBadge(e.relationship)}
                        </div>
                        {e.description && (
                          <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                            {e.description}
                          </p>
                        )}
                      </div>
                    );
                  })}

                  {/* Outgoing edges */}
                  {outgoingEdges.map((e) => {
                    const targetNode = graphData.nodes.find((n) => n.id === e.targetNodeId);
                    return (
                      <div
                        key={e.id}
                        className="p-3 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs shadow-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-900 dark:text-white">{targetNode?.label}</span>
                          {getRelationshipBadge(e.relationship)}
                        </div>
                        {e.description && (
                          <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                            {e.description}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-6 space-y-3 h-full">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center">
                  <Layers className="w-6 h-6" />
                </div>
                <h4 className="font-semibold text-sm text-slate-700 dark:text-slate-300">Chọn nút chủ đề</h4>
                <p className="text-xs text-slate-500 max-w-xs">
                  Chọn bất kỳ chủ đề nào bên trái để phân tích các điều kiện tiên quyết và hướng ứng dụng thực tế.
                </p>
              </div>
            )}

            {selectedNode?.practiceRoute && (
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 mt-4">
                <button
                  onClick={() => {
                    navigate(selectedNode.practiceRoute!);
                    onClose();
                  }}
                  className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white shadow-lg shadow-cyan-600/30 flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  Luyện tập chuyên sâu chủ đề này
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
