import { useSyncExternalStore } from 'react';
import { useStore } from '../../store/useStore';
const query=typeof window==='undefined'?null:window.matchMedia('(prefers-reduced-motion: reduce)');
const subscribe=(notify:()=>void)=>{query?.addEventListener('change',notify);return()=>query?.removeEventListener('change',notify);};
export function useReducedLabMotion(){
 const setting=useStore(s=>s.settings.reduceMotion);
 const system=useSyncExternalStore(subscribe,()=>query?.matches??false,()=>false);
 return setting||system;
}
