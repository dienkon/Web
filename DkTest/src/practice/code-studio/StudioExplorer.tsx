import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, FileCode2, FilePlus2, Folder, FolderPlus, GripVertical, MoreHorizontal, Search, X } from 'lucide-react';
import { languageFor, projectFolders, StudioProject } from './project';
import { usePointerGesture } from './usePointerGesture';

interface Props {
  project: StudioProject;
  onOpen: (path: string) => void;
  onCreate: (kind: 'file' | 'folder', parent: string) => void;
  onRename: (path: string) => void;
  onMoveDialog: (path: string) => void;
  onMove: (source: string, destination: string) => void;
  onDelete: (path: string) => void;
  onRenameProject: () => void;
  onClose: () => void;
  children: React.ReactNode;
}
export default function StudioExplorer({ project, onOpen, onCreate, onRename, onMoveDialog, onMove, onDelete, onRenameProject, onClose, children }: Props) {
  const [collapsed, setCollapsed] = useState(new Set<string>());
  const [selectedFolder, setSelectedFolder] = useState('');
  const [filter, setFilter] = useState('');
  const [menu, setMenu] = useState('');
  const [drag, setDrag] = useState<{ source: string; target: string | null; x: number; y: number } | null>(null);
  const treeElement = useRef<HTMLDivElement>(null);
  const gesture = usePointerGesture();
  useEffect(() => {
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenu(''); };
    window.addEventListener('keydown', escape); return () => window.removeEventListener('keydown', escape);
  }, []);
  const pathKey = JSON.stringify([project.files.map(f => f.path), project.folders]);
  const tree = useMemo(() => {
    const nodes = [...projectFolders(project).map(path => ({ path, folder: true })), ...project.files.map(f => ({ path: f.path, folder: false }))];
    return nodes.sort((a, b) => {
      const ap = a.path.split('/'), bp = b.path.split('/');
      for (let i = 0; i < Math.min(ap.length, bp.length); i++) {
        if (ap[i] === bp[i]) continue;
        const af = i < ap.length - 1 || a.folder, bf = i < bp.length - 1 || b.folder;
        return af !== bf ? (af ? -1 : 1) : ap[i].localeCompare(bp[i]);
      } return ap.length - bp.length;
    });
  }, [pathKey]);
  const validParent = tree.some(n => n.folder && n.path === selectedFolder) ? selectedFolder : '';
  function create(kind: 'file' | 'folder', parent = validParent) {
    setCollapsed(all => new Set([...all].filter(path => path !== parent && !parent.startsWith(path + '/'))));
    onCreate(kind, parent); setMenu('');
  }
  function startDrag(event: React.PointerEvent<HTMLButtonElement>, source: string) {
    const origin = { x: event.clientX, y: event.clientY };
    let moved = false; let destination: string | null = null;
    setMenu('');
    gesture.begin(event, point => {
      if (!moved && Math.hypot(point.x - origin.x, point.y - origin.y) < 6) return;
      moved = true;
      const target = document.elementFromPoint(point.x, point.y)?.closest<HTMLElement>('[data-studio-drop]');
      destination = target?.dataset.studioDrop ?? null;
      if (destination === source || destination?.startsWith(source + '/')) destination = null;
      setDrag({ source, target: destination, ...point });
      const bounds = treeElement.current?.getBoundingClientRect();
      if (bounds && point.x >= bounds.left && point.x <= bounds.right) {
        if (point.y < bounds.top + 35) treeElement.current?.scrollBy(0, -12);
        else if (point.y > bounds.bottom - 35) treeElement.current?.scrollBy(0, 12);
      }
    }, cancelled => {
      setDrag(null);
      if (!cancelled && moved && destination !== null) {
        onMove(source, destination);
        setSelectedFolder(destination);
        setCollapsed(all => new Set([...all].filter(p => !(destination === p || destination!.startsWith(p + '/')))));
      }
    });
  }
  return <aside className={`studio-explorer ${gesture.active ? 'is-dragging' : ''}`}>
    <div className="studio-pane-title"><span>EXPLORER</span><div><button aria-label="Tạo file" title={validParent ? `Tạo file trong ${validParent}` : 'Tạo file'} onClick={() => create('file')}><FilePlus2 size={16} /></button><button aria-label="Tạo thư mục" onClick={() => create('folder')}><FolderPlus size={16} /></button><button className="studio-mobile-only" aria-label="Đóng thư mục" onClick={onClose}><X size={16} /></button></div></div>
    <div className={`studio-project-heading ${drag?.target === '' ? 'studio-drop-target' : ''}`} data-studio-drop=""><button className="studio-root-folder" onClick={() => setSelectedFolder('')} title="Chọn thư mục gốc"><ChevronDown size={13} /><span>{project.name}</span></button><button onClick={onRenameProject} aria-label="Đổi tên dự án"><MoreHorizontal size={16} /></button></div>
    <label className="studio-file-filter"><Search size={13} /><input id="studio-file-search" value={filter} onChange={e => setFilter(e.target.value)} placeholder="Tìm file…" /></label>
    <div className="studio-tree" ref={treeElement} role="tree" aria-label="File dự án" data-studio-drop="">
      {tree.filter(node => filter ? node.path.toLowerCase().includes(filter.toLowerCase()) : ![...collapsed].some(p => node.path.startsWith(p + '/'))).map(node => <div key={node.path} data-studio-path={node.path} data-studio-drop={node.folder ? node.path : node.path.split('/').slice(0, -1).join('/')} className={`studio-tree-row ${project.activeFile === node.path || (node.folder && validParent === node.path) ? 'selected' : ''} ${drag?.target === node.path && node.folder ? 'studio-drop-target' : ''} ${drag?.source === node.path ? 'studio-drag-source' : ''}`} style={{ paddingLeft: 5 + (filter ? 0 : node.path.split('/').length - 1) * 12 }}>
        <button className="studio-drag-handle" aria-label={`Kéo di chuyển ${node.path}`} title="Kéo để chuyển · Enter để chọn thư mục đích" onPointerDown={e => startDrag(e, node.path)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onMoveDialog(node.path); } }}><GripVertical size={13} /></button>
        <button role="treeitem" aria-selected={project.activeFile === node.path || (node.folder && validParent === node.path)} aria-expanded={node.folder ? !collapsed.has(node.path) : undefined} className="studio-tree-item" onClick={() => { if (node.folder) { setSelectedFolder(node.path); setCollapsed(all => { const next = new Set(all); next.has(node.path) ? next.delete(node.path) : next.add(node.path); return next; }); } else { setSelectedFolder(node.path.split('/').slice(0, -1).join('/')); onOpen(node.path); } }}>
          {node.folder ? <>{collapsed.has(node.path) ? <ChevronRight size={12} /> : <ChevronDown size={12} />}<Folder size={15} className="studio-folder-icon" /></> : <><span className="studio-tree-indent" /><FileCode2 size={15} className={`file-${languageFor(node.path)}`} /></>}<span>{node.path.split('/').at(-1)}</span>
        </button><button className="studio-file-menu" aria-label={`Thao tác ${node.path}`} onClick={() => setMenu(menu === node.path ? '' : node.path)}><MoreHorizontal size={15} /></button>
        {menu === node.path && <div className="studio-context-menu"><button onClick={() => { onRename(node.path); setMenu(''); }}>Đổi tên / di chuyển</button><button onClick={() => { onMoveDialog(node.path); setMenu(''); }}>Di chuyển tới thư mục…</button>{node.folder && <><button onClick={() => create('file', node.path)}>Tạo file bên trong</button><button onClick={() => create('folder', node.path)}>Tạo thư mục bên trong</button></>}<button onClick={() => { onDelete(node.path); setMenu(''); }}>Xóa {node.folder ? 'thư mục' : 'file'}</button><button onClick={() => setMenu('')}>Đóng menu</button></div>}
      </div>)}
    </div>
    <div className={`studio-drop-root ${drag?.target === '' ? 'studio-drop-target' : ''}`} data-studio-drop="">{drag ? 'Thả ở đây để chuyển ra thư mục gốc' : <span>Chọn thư mục rồi bấm + · Kéo bằng tay nắm ⋮</span>}</div>
    {children}
    {drag && <div className="studio-drag-ghost" style={{ left: Math.min(drag.x + 12, window.innerWidth - 190), top: drag.y + 14 }} role="status">{drag.source.split('/').at(-1)}<small>{drag.target === null ? 'Không thể thả ở đây' : '→ ' + (drag.target || 'Thư mục gốc')}</small></div>}
  </aside>;
}
