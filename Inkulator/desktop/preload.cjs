"use strict";
const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("InkulatorDesktop", Object.freeze({
  platform: "windows",
  flush: () => ipcRenderer.invoke("inkulator:flush"),
}));
