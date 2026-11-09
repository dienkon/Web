"use strict";
const {app,ipcMain,nativeImage}=require('electron'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),{execFile}=require('node:child_process');
module.exports=function(win){
 let busy=false;
 ipcMain.handle('inkulator:question-ocr',async(event,src)=>{
  if(event.sender!==win.webContents||event.senderFrame!==win.webContents.mainFrame)throw Error('Nguồn yêu cầu OCR không hợp lệ.');
  if(typeof src!=='string'||src.length>7e6||!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(src))throw Error('Ảnh OCR không hợp lệ.');
  if(busy)return {text:'',available:false,engine:'Windows OCR'};
  const image=nativeImage.createFromDataURL(src),size=image.getSize();
  if(image.isEmpty()||size.width*size.height>8e6)throw Error('Ảnh OCR quá lớn hoặc lỗi.');
  busy=true;let folder;
  try{
   folder=await fs.mkdtemp(path.join(os.tmpdir(),'inkulator-question-ocr-'));const file=path.join(folder,'region.png'),scale=Math.min(1,2400/Math.max(size.width,size.height)),ocrImage=scale<1?image.resize({width:Math.max(1,Math.round(size.width*scale)),height:Math.max(1,Math.round(size.height*scale)),quality:'best'}):image;await fs.writeFile(file,ocrImage.toPNG());
   const script=app.isPackaged?path.join(process.resourcesPath,'app.asar.unpacked','desktop','question-ocr.ps1'):path.join(__dirname,'question-ocr.ps1');
   return await new Promise(resolve=>{const child=execFile('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',script],{windowsHide:true,timeout:20000,maxBuffer:256000},(error,stdout)=>{if(error)return resolve({text:'',available:false,engine:'Windows OCR'});try{const value=JSON.parse(stdout.replace(/^\uFEFF/,''));resolve({text:String(value.text||'').slice(0,12000),available:!!value.available,engine:'Windows OCR'});}catch{resolve({text:'',available:false,engine:'Windows OCR'});}});child.stdin.end(JSON.stringify({file}));});
  }finally{busy=false;if(folder){await fs.unlink(path.join(folder,'region.png')).catch(()=>{});await fs.rmdir(folder).catch(()=>{});}}
 });
};
