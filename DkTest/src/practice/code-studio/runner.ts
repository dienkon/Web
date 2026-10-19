import runtimeSource from './runtime.worker.js?raw';
import { StudioProject } from './project';

/** The opaque sandbox creates the worker so user programs have no app-origin privileges. */
export function runnerDocument(project: StudioProject, language: string, stdin: string, token: string) {
  const data = { files: project.files, activeFile: project.activeFile, language, stdin };
  const script = `const token=${JSON.stringify(token)};const worker=new Worker(URL.createObjectURL(new Blob([${JSON.stringify(runtimeSource)}],{type:'text/javascript'})));worker.onmessage=e=>parent.postMessage({studioToken:token,...e.data},'*');worker.onerror=e=>{parent.postMessage({studioToken:token,type:'error',text:e.message},'*');parent.postMessage({studioToken:token,type:'done',success:false},'*')};worker.postMessage(${JSON.stringify(data)});`;
  return `<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' blob: https://cdn.jsdelivr.net; worker-src blob:; connect-src https://cdn.jsdelivr.net;"><script>${script.replace(/<\/script/gi, '<\\/script')}</script>`;
}
