import { useState, useMemo } from "react";
import { Settings, Users, BookOpen, Plus, Trash2, Ban, Search } from "lucide-react";
import { AppState, Character, Glossary, TranslationSettings } from "../../types";
import { generateId } from "../../lib/utils";

interface Props {
  settings: TranslationSettings;
  characters: Character[];
  glossary: Glossary[];
  onUpdateSettings: (settings: TranslationSettings) => void;
  onUpdateCharacters: (chars: Character[]) => void;
  onUpdateGlossary: (gloss: Glossary[]) => void;
}

export function SettingsPanel({ settings, characters, glossary, onUpdateSettings, onUpdateCharacters, onUpdateGlossary }: Props) {
  const [activeTab, setActiveTab] = useState<"characters" | "glossary">("characters");
  const [charSearch, setCharSearch] = useState("");
  const [termSearch, setTermSearch] = useState("");

  const handleAddCharacter = () => {
    onUpdateCharacters([{
      id: generateId(), originalName: "", vietnameseName: "", gender: "", relationship: "", notes: "", preventAutoAdd: false
    }, ...characters]);
  };

  const handleUpdateChar = (id: string, field: keyof Character, value: any) => {
    onUpdateCharacters(characters.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const handleRemoveChar = (id: string) => {
    onUpdateCharacters(characters.filter(c => c.id !== id));
  };

  const handleAddGlossary = () => {
    onUpdateGlossary([{ id: generateId(), original: "", translated: "", type: "Chung", preventAutoAdd: false }, ...glossary]);
  };

  const handleUpdateGlossary = (id: string, field: keyof Glossary, value: any) => {
    onUpdateGlossary(glossary.map(g => g.id === id ? { ...g, [field]: value } : g));
  };

  const handleRemoveGlossary = (id: string) => {
    onUpdateGlossary(glossary.filter(g => g.id !== id));
  };

  const filteredCharacters = useMemo(() => {
    return characters.filter(c => 
      c.originalName.toLowerCase().includes(charSearch.toLowerCase()) || 
      c.vietnameseName.toLowerCase().includes(charSearch.toLowerCase())
    );
  }, [characters, charSearch]);

  const filteredGlossary = useMemo(() => {
    return glossary.filter(g => 
      g.original.toLowerCase().includes(termSearch.toLowerCase()) || 
      g.translated.toLowerCase().includes(termSearch.toLowerCase())
    );
  }, [glossary, termSearch]);

  return (
    <div className="space-y-6 flex-1 flex flex-col">
      <section>
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Translation Styles</label>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100">
              <span className="text-slate-600">Tone</span>
              <input
                type="text"
                list="style-list"
                value={settings.style}
                onChange={e => onUpdateSettings({ ...settings, style: e.target.value as any })}
                className="font-medium text-slate-900 bg-transparent text-right outline-none w-32 border-b border-transparent focus:border-indigo-500 text-xs"
              />
              <datalist id="style-list">
                <option value="Tiểu thuyết" />
                <option value="Tự nhiên" />
                <option value="Trang trọng" />
                <option value="Hài hước" />
                <option value="Sát nghĩa" />
              </datalist>
            </div>
            <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100">
              <span className="text-slate-600">Ngôi kể</span>
              <input
                type="text"
                list="pov-list"
                value={settings.pov}
                onChange={e => onUpdateSettings({ ...settings, pov: e.target.value as any })}
                className="font-medium text-slate-900 bg-transparent text-right outline-none w-32 border-b border-transparent focus:border-indigo-500 text-xs"
              />
              <datalist id="pov-list">
                <option value="Linh hoạt" />
                <option value="Ngôi thứ 1" />
                <option value="Ngôi thứ 3" />
              </datalist>
            </div>
            <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100">
              <span className="text-slate-600">Việt hóa</span>
              <input
                type="text"
                list="vi-list"
                value={settings.vietnameseLevel}
                onChange={e => onUpdateSettings({ ...settings, vietnameseLevel: e.target.value as any })}
                className="font-medium text-slate-900 bg-transparent text-right outline-none w-32 border-b border-transparent focus:border-indigo-500 text-xs"
              />
              <datalist id="vi-list">
                <option value="Vừa phải" />
                <option value="Thấp" />
                <option value="Cao" />
              </datalist>
            </div>
            
            <label className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100 cursor-pointer">
              <span className="text-slate-600">Giữ thuật ngữ</span>
              <input type="checkbox" checked={settings.keepTerms} onChange={e => onUpdateSettings({...settings, keepTerms: e.target.checked})} className="rounded text-indigo-600 focus:ring-indigo-500" />
            </label>
            <label className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100 cursor-pointer">
              <span className="text-slate-600">Chuẩn hóa tên</span>
              <input type="checkbox" checked={settings.autoFormatName} onChange={e => onUpdateSettings({...settings, autoFormatName: e.target.checked})} className="rounded text-indigo-600 focus:ring-indigo-500" />
            </label>
          </div>
        </div>

        <div className="mt-4">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">System Prompt (Tùy chỉnh thêm)</label>
          <textarea
            value={settings.customPrompt || ""}
            onChange={e => onUpdateSettings({ ...settings, customPrompt: e.target.value })}
            placeholder="VD: Dịch theo phong cách kiếm hiệp cổ điển, xưng hô 'tại hạ', 'các hạ'..."
            className="w-full p-2 border border-slate-200 rounded-md text-xs bg-slate-50 outline-none focus:border-indigo-500 resize-none h-16"
          />
        </div>
      </section>

      <section className="flex-1 flex flex-col min-h-0 bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
        <div className="flex border-b border-slate-200">
          <button 
            className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider ${activeTab === 'characters' ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-500' : 'text-slate-500 hover:bg-slate-50'}`}
            onClick={() => setActiveTab('characters')}
          >
            Nhân vật ({characters.length})
          </button>
          <button 
            className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider ${activeTab === 'glossary' ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-500' : 'text-slate-500 hover:bg-slate-50'}`}
            onClick={() => setActiveTab('glossary')}
          >
            Thuật ngữ ({glossary.length})
          </button>
        </div>
        
        {activeTab === 'characters' ? (
          <div className="flex flex-col flex-1 min-h-0 p-2">
            <div className="flex gap-2 mb-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  value={charSearch}
                  onChange={e => setCharSearch(e.target.value)}
                  placeholder="Tìm kiếm..." 
                  className="w-full pl-7 pr-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded outline-none focus:border-indigo-500"
                />
              </div>
              <button onClick={handleAddCharacter} className="px-2 py-1.5 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 text-xs font-bold" title="Thêm nhân vật">
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            
            <div className="space-y-2 overflow-y-auto flex-1 pr-1">
              {filteredCharacters.map(char => (
                <div key={char.id} className="p-2 bg-slate-50 rounded border border-slate-200">
                  <div className="flex justify-between items-start mb-1">
                    <input placeholder="Tên gốc" value={char.originalName} onChange={e => handleUpdateChar(char.id, 'originalName', e.target.value)} className="text-xs font-bold text-slate-800 bg-transparent outline-none flex-1 border-b border-transparent hover:border-slate-300 focus:border-indigo-400" />
                    <input placeholder="Tên Việt" value={char.vietnameseName} onChange={e => handleUpdateChar(char.id, 'vietnameseName', e.target.value)} className="ml-2 px-1.5 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded outline-none w-24 text-right" />
                  </div>
                  <div className="flex space-x-2 mb-1">
                    <input placeholder="Giới tính" value={char.gender} onChange={e => handleUpdateChar(char.id, 'gender', e.target.value)} className="text-[10px] text-slate-500 bg-transparent outline-none w-1/3 border-b border-transparent hover:border-slate-300 focus:border-indigo-400" />
                    <input placeholder="Quan hệ" value={char.relationship} onChange={e => handleUpdateChar(char.id, 'relationship', e.target.value)} className="text-[10px] text-slate-500 bg-transparent outline-none flex-1 border-b border-transparent hover:border-slate-300 focus:border-indigo-400" />
                  </div>
                  <div className="flex space-x-2 mb-1">
                    <input placeholder="Ghi chú thêm" value={char.notes} onChange={e => handleUpdateChar(char.id, 'notes', e.target.value)} className="text-[10px] text-slate-500 bg-transparent outline-none flex-1 border-b border-transparent hover:border-slate-300 focus:border-indigo-400" />
                  </div>
                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-200">
                    <label className="flex items-center space-x-1 cursor-pointer">
                      <input 
                         type="checkbox" 
                         checked={char.preventAutoAdd} 
                         onChange={e => handleUpdateChar(char.id, 'preventAutoAdd', e.target.checked)}
                         className="rounded text-amber-500 focus:ring-amber-500" 
                      />
                      <span className="text-[9px] text-slate-500 flex items-center gap-1" title="Ngăn AI tự động thêm/cập nhật lại nhân vật này (nếu bạn không muốn dùng)"><Ban className="w-2.5 h-2.5 text-amber-500"/> Chặn tự thêm</span>
                    </label>
                    <button onClick={() => handleRemoveChar(char.id)} className="text-slate-400 hover:text-red-500 bg-white p-1 rounded border border-slate-200 shadow-sm" title="Xóa nhân vật">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {filteredCharacters.length === 0 && (
                <div className="text-center py-4 text-xs text-slate-400">Không tìm thấy nhân vật nào.</div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col flex-1 min-h-0 p-2">
            <div className="flex gap-2 mb-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  value={termSearch}
                  onChange={e => setTermSearch(e.target.value)}
                  placeholder="Tìm kiếm..." 
                  className="w-full pl-7 pr-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded outline-none focus:border-indigo-500"
                />
              </div>
              <button onClick={handleAddGlossary} className="px-2 py-1.5 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 text-xs font-bold" title="Thêm thuật ngữ">
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            
            <div className="space-y-2 overflow-y-auto flex-1 pr-1">
              {filteredGlossary.map(item => (
                <div key={item.id} className="p-2 bg-slate-50 rounded border border-slate-200 flex flex-col space-y-2">
                  <div className="flex items-center gap-2">
                    <input placeholder="Từ gốc" value={item.original} onChange={e => handleUpdateGlossary(item.id, 'original', e.target.value)} className="text-xs font-bold text-slate-800 bg-transparent outline-none flex-1 border-b border-transparent hover:border-slate-300 focus:border-indigo-400" />
                    <span className="px-1.5 py-0.5 bg-slate-200 text-slate-700 text-[9px] font-bold rounded">TERM</span>
                  </div>
                  <input placeholder="Nghĩa dịch" value={item.translated} onChange={e => handleUpdateGlossary(item.id, 'translated', e.target.value)} className="text-[11px] font-medium text-indigo-700 bg-transparent outline-none w-full border-b border-transparent hover:border-slate-300 focus:border-indigo-400" />
                  
                  <div className="flex justify-between items-center mt-1 pt-2 border-t border-slate-200">
                    <label className="flex items-center space-x-1 cursor-pointer">
                      <input 
                         type="checkbox" 
                         checked={item.preventAutoAdd} 
                         onChange={e => handleUpdateGlossary(item.id, 'preventAutoAdd', e.target.checked)}
                         className="rounded text-amber-500 focus:ring-amber-500" 
                      />
                      <span className="text-[9px] text-slate-500 flex items-center gap-1" title="Ngăn AI tự động thêm/cập nhật lại thuật ngữ này"><Ban className="w-2.5 h-2.5 text-amber-500"/> Chặn tự thêm</span>
                    </label>
                    <button onClick={() => handleRemoveGlossary(item.id)} className="text-slate-400 hover:text-red-500 bg-white p-1 rounded border border-slate-200 shadow-sm" title="Xóa thuật ngữ">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {filteredGlossary.length === 0 && (
                <div className="text-center py-4 text-xs text-slate-400">Không tìm thấy thuật ngữ nào.</div>
              )}
            </div>
          </div>
        )}
      </section>
      
      <section>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">CORS Proxy</label>
            <input
                 type="text"
                 value={settings.corsProxy}
                 onChange={e => onUpdateSettings({ ...settings, corsProxy: e.target.value })}
                 className="w-full px-3 py-1.5 border border-slate-200 rounded-md text-xs mono bg-slate-50 outline-none focus:border-indigo-500"
                 placeholder="https://corsproxy.io/?"
            />
          </div>
      </section>
    </div>
  );
}

