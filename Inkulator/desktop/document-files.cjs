"use strict";
const {app,dialog,ipcMain,shell}=require("electron");
const fs=require("node:fs/promises"),path=require("node:path"),crypto=require("node:crypto");
const replaceFile=require("./replace-file.cjs");
module.exports=function installDocuments(win){
  const trusted=e=>e.sender===win.webContents&&e.senderFrame===win.webContents.mainFrame;
  const root=process.env.INKULATOR_TEST_PROFILE?path.join(app.getPath("userData"),"Documents"):path.join(app.getPath("documents"),"Inkulator");
  const indexPath=path.join(app.getPath("userData"),"document-index.json");
  let queue=Promise.resolve(),index={files:{},recent:[]};const pendingOpens=new Map();
  const ready=(async()=>{
    for(const file of [indexPath,indexPath+".bak"]){try{const value=JSON.parse(await fs.readFile(file,"utf8"));if(value.files&&Array.isArray(value.recent)){index=value;return;}}catch{}}
    const folder=path.join(root,"Tai lieu"),names=(await fs.readdir(folder).catch(()=>[])).filter(name=>name.endsWith(".smath.json")).slice(0,300);
    for(const name of names){try{const file=path.join(folder,name),stat=await fs.stat(file);if(stat.size>100*1024*1024)continue;const data=validate(await fs.readFile(file,"utf8")),n=data.notebook;index.files[n.id]=file;index.recent.push({id:n.id,title:String(n.title||"Sổ tay").slice(0,300),file,modified:n.modified});}catch{}}
  })();
  async function atomic(file,content){
    await fs.mkdir(path.dirname(file),{recursive:true});
    const temp=file+"."+crypto.randomBytes(6).toString("hex")+".tmp";
    try{await fs.writeFile(temp,content,"utf8");const handle=await fs.open(temp,"r+");try{await handle.sync();}finally{await handle.close();}if(file===indexPath)await fs.copyFile(indexPath,indexPath+".bak").catch(e=>{if(e.code!=="ENOENT")throw e;});await replaceFile(temp,file);}finally{await fs.unlink(temp).catch(()=>{});}
  }
  function validate(raw){
    if(typeof raw!=="string"||Buffer.byteLength(raw)>100*1024*1024)throw Error("Tệp sổ tay tối đa 100 MB.");
    const data=JSON.parse(raw);
    if(data.format!=="scrble-math"||data.version!==1||!data.notebook||!/^[\w-]{1,100}$/.test(data.notebook.id)||!Array.isArray(data.notebook.pages)||data.notebook.pages.length<1||data.notebook.pages.length>300)throw Error("Tệp sổ tay không hợp lệ.");
    return data;
  }
  async function write(raw,file){
    const data=validate(raw),id=data.notebook.id;
    const name=String(data.notebook.title||"So tay").replace(/[<>:\"/\\|?*\x00-\x1f]/g,"_").slice(0,80);
    file=file||index.files[id]||path.join(root,"Tai lieu",name+"-"+id.slice(0,8)+".smath.json");
    if(!path.isAbsolute(file)||!file.toLowerCase().endsWith(".smath.json"))throw Error("Đường dẫn tài liệu không hợp lệ.");
    const previous=await fs.readFile(file,"utf8").catch(e=>{if(e.code!=="ENOENT")throw e;return null;});
    if(previous!==raw){
      if(previous){
        const token=crypto.createHash("sha256").update(file).digest("hex").slice(0,16),backup=path.join(root,"Khoi phuc",token);
        await fs.mkdir(backup,{recursive:true});await atomic(path.join(backup,Date.now()+".smath.json"),previous);
        const names=(await fs.readdir(backup)).filter(n=>/^\d+\.smath\.json$/.test(n)).sort();
        for(const name of names.slice(0,-10))await fs.unlink(path.join(backup,name));
      }
      await atomic(file,raw);
    }
    index.files[id]=file;
    index.recent=[{id,title:String(data.notebook.title||"Sổ tay").slice(0,300),file,modified:data.notebook.modified},...index.recent.filter(item=>item.id!==id)].slice(0,300);
    await atomic(indexPath,JSON.stringify(index));
    return {id,file,title:data.notebook.title,folder:root};
  }
  function enqueue(task){const result=queue.catch(()=>{}).then(()=>ready).then(task);queue=result;return result;}
  function handler(name,fn){ipcMain.handle("inkulator:documents-"+name,(e,arg)=>{if(!trusted(e))throw Error("Nguồn tài liệu không hợp lệ.");return fn(arg);});}
  handler("save",arg=>enqueue(async()=>{
    if(!arg||typeof arg!=="object")throw Error("Thiếu tài liệu.");validate(arg.raw);
    let file;
    if(arg.saveAs){const d=await dialog.showSaveDialog(win,{title:"Lưu sổ tay trên máy",defaultPath:path.join(root,(String(JSON.parse(arg.raw).notebook.title||"So tay").replace(/[<>:\"/\\|?*\x00-\x1f]/g,"_").slice(0,90))+".smath.json"),filters:[{name:"Sổ tay Inkulator",extensions:["smath.json"]}]});if(d.canceled)return null;file=d.filePath;}
    return write(arg.raw,file);
  }));
  handler("list",()=>enqueue(async()=>({folder:root,items:index.recent})));
  handler("open",id=>enqueue(async()=>{
    let file=index.files[id];
    if(id===undefined||id===null){const d=await dialog.showOpenDialog(win,{title:"Mở sổ tay trên máy",defaultPath:root,properties:["openFile"],filters:[{name:"Sổ tay Inkulator",extensions:["json"]}]});if(d.canceled)return null;file=d.filePaths[0];}
    if(!file)throw Error("Không tìm thấy tài liệu.");
    const stat=await fs.stat(file);if(stat.size>100*1024*1024)throw Error("Tệp tối đa 100 MB.");
    const raw=await fs.readFile(file,"utf8"),data=validate(raw),token=crypto.randomBytes(20).toString("hex");
    pendingOpens.set(token,{id:data.notebook.id,file,created:Date.now()});
    for(const [key,value]of pendingOpens)if(Date.now()-value.created>600000)pendingOpens.delete(key);
    return {raw,file,token};
  }));
  handler("accept",token=>enqueue(async()=>{const value=pendingOpens.get(token);if(!value)throw Error("Phiên mở tài liệu đã hết hạn.");pendingOpens.delete(token);index.files[value.id]=value.file;await atomic(indexPath,JSON.stringify(index));return true;}));
  handler("folder",()=>enqueue(async()=>{await fs.mkdir(root,{recursive:true});const error=await shell.openPath(root);if(error)throw Error(error);return true;}));
  handler("recovery",id=>enqueue(async()=>{
    const file=index.files[id];if(!file)return [];
    const token=crypto.createHash("sha256").update(file).digest("hex").slice(0,16),folder=path.join(root,"Khoi phuc",token);
    return (await fs.readdir(folder).catch(()=>[])).filter(n=>/^\d+\.smath\.json$/.test(n)).sort().reverse().map(name=>({stamp:Number(name.split(".")[0]),name}));
  }));
  handler("restore",arg=>enqueue(async()=>{
    const file=index.files[arg?.id];if(!file||!/^\d+\.smath\.json$/.test(arg?.name||""))throw Error("Bản khôi phục không hợp lệ.");
    const token=crypto.createHash("sha256").update(file).digest("hex").slice(0,16);
    const raw=await fs.readFile(path.join(root,"Khoi phuc",token,arg.name),"utf8");validate(raw);return {raw,file};
  }));
  handler("flush",()=>queue.catch(()=>{}));
  return {flush:()=>queue.catch(()=>{})};
};
