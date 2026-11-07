"use strict";
const { app, ipcMain, nativeImage, clipboard, ClipboardItem } = require("electron");
const fs = require("node:fs/promises"), path = require("node:path");
const replaceFile=require("./replace-file.cjs");
module.exports = function installCapture(mainWindow) {
  const folder=path.join(app.getPath("userData"),"captures");
  const trusted=event=>event.sender===mainWindow.webContents && event.senderFrame===mainWindow.webContents.mainFrame;
  let writes=Promise.resolve(),serial=0;
  ipcMain.handle("inkulator:capture-save",(event,src)=>{
    if(!trusted(event) || typeof src!=="string" || src.length>7e6 || !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(src)) throw Error("Ảnh chụp không hợp lệ.");
    const image=nativeImage.createFromDataURL(src), size=image.getSize();
    if(image.isEmpty() || size.width*size.height>8e6) throw Error("Ảnh chụp quá lớn hoặc bị lỗi.");
    const png=image.toPNG();
    const save=async()=>{
      let copied=true;
      try {await clipboard.write([new ClipboardItem({"image/png":new Blob([new Uint8Array(png)],{type:"image/png"})})]);} catch {copied=false;}
      await fs.mkdir(folder,{recursive:true});
      const name="Inkulator-Capture-"+new Date().toISOString().replace(/[:.]/g,"-")+"-"+(++serial)+".png";
      await fs.writeFile(path.join(folder,name),png,{flag:"wx"});
      await fs.writeFile(path.join(folder,"latest.tmp"),png);
      await replaceFile(path.join(folder,"latest.tmp"),path.join(folder,"latest.png"));
      return {name,width:size.width,height:size.height,copied};
    };
    writes=writes.catch(()=>{}).then(save);
    return writes;
  });
  ipcMain.handle("inkulator:capture-read",async event=>{
    if(!trusted(event)) return null;
    try {
      await writes.catch(()=>{});
      const file=path.join(folder,"latest.png"),stat=await fs.stat(file);
      if(stat.size>6e6) return null;
      const image=nativeImage.createFromBuffer(await fs.readFile(file));
      if(image.isEmpty()) return null;
      return {src:image.toDataURL(),...image.getSize()};
    } catch {return null;}
  });
};
