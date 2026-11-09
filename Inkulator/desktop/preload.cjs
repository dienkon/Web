"use strict";
const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("InkulatorDesktop", Object.freeze({
  platform: "windows",
  flush: () => ipcRenderer.invoke("inkulator:flush"),
  saveCapture: (src) => ipcRenderer.invoke("inkulator:capture-save", src),
  readCapture: () => ipcRenderer.invoke("inkulator:capture-read"),
  questionOCR: src => ipcRenderer.invoke("inkulator:question-ocr",src),
  documents: Object.freeze(Object.fromEntries(["save","list","open","accept","folder","recovery","restore","flush","location","export","backupCache"].map(name=>[name,arg=>ipcRenderer.invoke("inkulator:documents-"+name,arg)]))),
  gemini: Object.freeze(Object.fromEntries(["status","key","check","ask","cancel"].map(name=>[name,arg=>ipcRenderer.invoke("inkulator:gemini-"+name,arg)]))),
  calculators: Object.freeze(Object.fromEntries(["list","open","choose","capture"].map(name=>[name,arg=>ipcRenderer.invoke("inkulator:native-"+name,arg)]))),
  onPrepareClose: callback => { ipcRenderer.on("inkulator:prepare-close",()=>callback()); },
  closeReady: ok => ipcRenderer.send("inkulator:close-ready",ok===true),
}));
