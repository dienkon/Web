import { useState, useEffect } from 'react';
import { StorageManager } from '../../lib/storage';
import { Project } from '../../types';
import { Plus, Trash2, Clock, FileText } from 'lucide-react';
import { generateId } from '../../lib/utils';

interface ProjectPanelProps {
  onSelectProject: (id: string) => void;
}

export function ProjectPanel({ onSelectProject }: ProjectPanelProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [newProjectName, setNewProjectName] = useState('');

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    const list = await StorageManager.getProjects();
    setProjects(list);
  };

  const handleCreateProject = async () => {
    const name = newProjectName.trim() || 'Untitled Project';
    const newProject: Project = {
      id: generateId(),
      name,
      lastModified: Date.now(),
      sourceText: '',
      chunks: [],
      characters: [],
      glossary: [],
      history: []
    };
    await StorageManager.saveProject(newProject);
    setNewProjectName('');
    onSelectProject(newProject.id);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await StorageManager.deleteProject(id);
    loadProjects();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="px-8 py-6 bg-indigo-600 flex justify-between items-center text-white">
          <div>
             <h1 className="text-2xl font-bold">Smart Translator Projects</h1>
             <p className="text-indigo-100 text-sm mt-1">Quản lý các dự án dịch thuật của bạn độc lập</p>
          </div>
        </div>
        
        <div className="p-8">
          <div className="flex gap-4 mb-8">
            <input 
              type="text"
              value={newProjectName}
              onChange={e => setNewProjectName(e.target.value)}
              placeholder="Tên dự án mới..."
              className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              onKeyDown={e => e.key === 'Enter' && handleCreateProject()}
            />
            <button 
              onClick={handleCreateProject}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors shadow-sm"
            >
              <Plus className="w-5 h-5" />
              Tạo mới
            </button>
          </div>

          <div className="space-y-4">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Dự án gần đây ({projects.length})</h2>
            
            {projects.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">Chưa có dự án nào</p>
                <p className="text-slate-400 text-sm mt-1">Hãy tạo dự án đầu tiên để bắt đầu dịch</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {projects.map(p => (
                  <div 
                    key={p.id}
                    onClick={() => onSelectProject(p.id)}
                    className="group flex flex-col p-4 bg-white border-2 border-slate-100 hover:border-indigo-500 rounded-xl cursor-pointer transition-all hover:shadow-md"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-slate-800 text-lg truncate pr-4">{p.name}</h3>
                      <button 
                        onClick={(e) => handleDelete(p.id, e)}
                        className="text-slate-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Xóa dự án"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="mt-auto flex items-center justify-between text-xs text-slate-500">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(p.lastModified).toLocaleDateString()} {new Date(p.lastModified).toLocaleTimeString()}
                      </div>
                      <div className="font-medium bg-slate-100 px-2 py-1 rounded">
                         {p.chunks.length} chunks
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
