import {useSyncExternalStore} from 'react';
const media=typeof window==='undefined'?null:window.matchMedia('(pointer: coarse)');
const subscribe=(notify:()=>void)=>{media?.addEventListener('change',notify);return()=>media?.removeEventListener('change',notify);};
export const readCoarsePointer=()=>media?.matches??false;
export const useCoarsePointer=()=>useSyncExternalStore(subscribe,readCoarsePointer,()=>false);
