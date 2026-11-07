"use strict";
const {app,ipcMain,safeStorage}=require("electron"),fs=require("node:fs/promises"),path=require("node:path");
const core=require("./ai-core.cjs");
const defaultKey=require('./default-key.cjs');
const model="gemini-3.5-flash-lite",endpoint="https://generativelanguage.googleapis.com/v1beta/models/"+model;
module.exports=function installGemini(win){
  const file=path.join(app.getPath("userData"),"gemini-key.enc");
  const trusted=e=>e.sender===win.webContents&&e.senderFrame===win.webContents.mainFrame;
  let active=null,writes=Promise.resolve(),lastFailure=null;
  async function getKey(){await writes;try{const key=(await safeStorage.decryptStringAsync(await fs.readFile(file))).result;if(key)return key;}catch{}const key=await defaultKey();if(key){try{if(await safeStorage.isAsyncEncryptionAvailable())await fs.writeFile(file,await safeStorage.encryptStringAsync(key));}catch{}}return key;}
  function handle(name,fn){ipcMain.handle("inkulator:gemini-"+name,(event,arg)=>{if(!trusted(event))throw Error("Nguồn yêu cầu không hợp lệ.");return fn(arg);});}
  handle("status",async()=>{const key=await getKey(),builtIn=await defaultKey();return {configured:!!key,model,hasDefault:!!builtIn,usesDefault:!!builtIn&&key===builtIn,lastFailure};});
  handle("key",key=>{
    if(typeof key!=="string"||key.length>512||/[\r\n\x00]/.test(key))throw Error("Khóa API không hợp lệ.");
    const save=async()=>{if(!key){await fs.unlink(file).catch(e=>{if(e.code!=="ENOENT")throw e;});return {configured:false,model};}if(!await safeStorage.isAsyncEncryptionAvailable())throw Error("Windows chưa sẵn sàng mã hóa khóa API.");await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,await safeStorage.encryptStringAsync(key.trim()));return {configured:true,model};};
    writes=writes.catch(()=>{}).then(save);return writes;
  });
  function errorFor(status){return status===401||status===403?"Khóa Gemini không có quyền dùng model này. Kiểm tra khóa trong Cài đặt.":status===400?"Google từ chối yêu cầu. Kiểm tra khóa Gemini và model trong tài khoản.":status===404?"Tài khoản chưa truy cập được gemini-3.5-flash-lite.":status===429?"Gemini hết hạn mức hoặc đang giới hạn lượt gọi. Thử lại sau.":"Gemini tạm thời không sẵn sàng ("+status+").";}
  handle("check",async()=>{const key=await getKey();if(!key)throw Error("Chưa cấu hình khóa Gemini.");try{const response=await fetch(endpoint,{headers:{"x-goog-api-key":key},signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error(errorFor(response.status));return {model,available:true};}catch(e){if(e.name==="TimeoutError"||e.name==="TypeError")throw Error("Không kết nối được Gemini. Kiểm tra Internet.");throw e;}});
  handle("ask",async arg=>{
    if(active)throw Error("Đang xử lý vùng trước. Hủy hoặc chờ hoàn tất.");
    const payload=core.request(arg?.action,arg?.src),key=await getKey();if(!key)throw Error("Thêm khóa Gemini trong Cài đặt để dùng AI.");
    if(active)throw Error("Đang xử lý vùng trước. Hủy hoặc chờ hoàn tất.");
    const controller=new AbortController();active=controller;
    const timer=setTimeout(()=>controller.abort(),45000);
    try{
      const response=await fetch(endpoint+":generateContent",{method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":key},body:JSON.stringify(payload),signal:controller.signal});
      if(!response.ok){lastFailure={status:response.status,action:arg.action,time:new Date().toISOString()};throw Error(errorFor(response.status));}
      const raw=await response.text();if(raw.length>500000)throw Error("Kết quả Gemini quá lớn.");
      const data=JSON.parse(raw),candidate=data.candidates?.[0];
      if(candidate?.finishReason==="MAX_TOKENS")throw Error("Kết quả bị cắt. Hãy khoanh một phần đề nhỏ hơn.");
      const content=candidate?.content?.parts?.filter(p=>!p.thought).map(p=>p.text||"").join("");
      if(!content)throw Error("Gemini chưa đọc được vùng này. Hãy khoanh rõ đề/công thức.");
      const result=core.cleanResult(JSON.parse(content.replace(/^```(?:json)?\s*|\s*```$/g,"")));lastFailure=null;return result;
    }catch(e){if(e.name==="AbortError")throw Error("Đã hủy hoặc hết thời gian chờ Gemini.");if(e.name==="TypeError")throw Error("Không có kết nối Internet. Nét viết được giữ nguyên.");if(e instanceof SyntaxError)throw Error("Gemini trả kết quả chưa hợp lệ. Hãy thử khoanh vùng nhỏ hơn.");throw e;}
    finally{clearTimeout(timer);if(active===controller)active=null;}
  });
  handle("cancel",()=>{active?.abort();return true;});
};
