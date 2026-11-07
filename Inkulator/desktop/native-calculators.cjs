"use strict";
const {app,ipcMain,dialog}=require("electron"),fs=require("node:fs/promises"),path=require("node:path"),{execFile}=require("node:child_process");
module.exports=function installCalculators(win){
  const bundled=app.isPackaged?path.join(process.resourcesPath,'emulators'):path.join(__dirname,'../.local/emulators');
  const defaults={"580":path.join(bundled,'580','fx-580VN X Emulator.exe'),"880":path.join(bundled,'880','ClassWizEmulator.exe')};
  const config=path.join(app.getPath("userData"),"native-calculators.json"),paths={...defaults};
  const ready=fs.readFile(config,"utf8").then(raw=>{const saved=JSON.parse(raw);if(saved.version===2)for(const id of Object.keys(defaults))if(typeof saved.paths?.[id]==="string"&&path.isAbsolute(saved.paths[id]))paths[id]=saved.paths[id];}).catch(()=>{});
  function helper(mode,file){return new Promise((resolve,reject)=>{
    const script=app.isPackaged?path.join(process.resourcesPath,"app.asar.unpacked","desktop","native-window.ps1"):path.join(__dirname,"native-window.ps1");
    const child=execFile("powershell.exe",["-NoProfile","-NonInteractive","-ExecutionPolicy","Bypass","-File",script],{windowsHide:true,timeout:12000,maxBuffer:12*1024*1024},(error,stdout)=>{if(error)return reject(Error("Chưa điều khiển được cửa sổ máy tính. Có thể mở máy từ thư mục gốc."));try{resolve(JSON.parse(stdout.replace(/^\uFEFF/,"").trim()||"null"));}catch{reject(Error("Không đọc được trạng thái máy tính."));}});
    child.stdin.end(JSON.stringify({mode,file}));
  });}
  function handle(name,fn){ipcMain.handle("inkulator:native-"+name,async(e,arg)=>{if(e.sender!==win.webContents||e.senderFrame!==win.webContents.mainFrame)throw Error("Nguồn yêu cầu không hợp lệ.");await ready;return fn(arg);});}
  function idFor(id){if(!Object.hasOwn(defaults,id))throw Error("Chọn máy 580 hoặc 880.");return id;}
  handle("list",async()=>Promise.all(Object.keys(defaults).map(async id=>({id,file:paths[id],available:await fs.stat(paths[id]).then(s=>s.isFile()).catch(()=>false)}))));
  handle("choose",async id=>{idFor(id);const d=await dialog.showOpenDialog(win,{title:"Chọn chương trình giả lập "+id,defaultPath:paths[id],properties:["openFile"],filters:[{name:"Chương trình giả lập",extensions:["exe"]}]});if(d.canceled)return null;const file=d.filePaths[0],expected=id==="580"?"fx-580vn x emulator.exe":"classwizemulator.exe";if(path.basename(file).toLowerCase()!==expected)throw Error("Chọn đúng tệp EXE của máy "+id+".");paths[id]=file;await fs.writeFile(config,JSON.stringify({version:2,paths}));return {id,file};});
  handle("open",async id=>{
    idFor(id);const file=paths[id];if(!await fs.stat(file).then(s=>s.isFile()).catch(()=>false))throw Error("Chưa tìm thấy máy "+id+". Chọn vị trí EXE trong bộ chọn máy tính.");
    const result=await helper("open",file);if(!result?.pid)throw Error("Không mở được máy "+id+". Kiểm tra thư mục và DLL đi kèm.");return {...result,id};
  });
  handle("capture",async id=>{idFor(id);const result=await helper("capture",paths[id]);if(!result?.src)throw Error("Mở máy "+id+" và đưa máy ra khỏi trạng thái thu nhỏ trước khi chụp.");return result;});
};
