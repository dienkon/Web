(function(root){
  "use strict";
  const model="gemini-3.5-flash-lite",endpoint="https://generativelanguage.googleapis.com/v1beta/models/"+model;
  let key="",active=null;
  const failure=status=>status===400||status===401||status===403?"Khóa Gemini không hợp lệ hoặc chưa có quyền dùng model. Kiểm tra trong Cài đặt.":status===429?"Gemini đang giới hạn lượt gọi hoặc hết hạn mức. Thử lại sau.":"Gemini chưa sẵn sàng ("+status+").";
  async function check(){if(!key)throw Error("Nhập khóa Gemini trong Cài đặt; bản web chỉ giữ khóa trong phiên này.");if(navigator.onLine===false)throw Error("Đang ngoại tuyến.");try{const r=await fetch(endpoint,{headers:{"x-goog-api-key":key},signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error(failure(r.status));return {model,available:true};}catch(e){if(e.name==="TypeError"||e.name==="TimeoutError")throw Error("Không kết nối được Gemini. Kiểm tra Internet.");throw e;}}
  async function ask(arg){
    if(active)throw Error("Đang xử lý vùng trước.");if(!key)throw Error("Nhập khóa Gemini trong Cài đặt; bản web chỉ giữ khóa trong phiên này.");
    const payload=GeminiProtocol.request(arg?.action,arg?.src),controller=new AbortController();active=controller;
    const timer=setTimeout(()=>controller.abort(),45000);
    try{const r=await fetch(endpoint+":generateContent",{method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":key},body:JSON.stringify(payload),signal:controller.signal});if(!r.ok)throw Error(failure(r.status));const raw=await r.text();if(raw.length>500000)throw Error("Kết quả quá lớn.");const data=JSON.parse(raw),candidate=data.candidates?.[0];if(candidate?.finishReason==="MAX_TOKENS")throw Error("Kết quả bị cắt. Khoanh vùng nhỏ hơn.");const content=candidate?.content?.parts?.filter(p=>!p.thought).map(p=>p.text||"").join("");if(!content)throw Error("Chưa đọc được vùng này. Hãy khoanh rõ đề/công thức.");return GeminiProtocol.cleanResult(JSON.parse(content.replace(/^```(?:json)?\s*|\s*```$/g,"")));}
    catch(e){if(e.name==="AbortError")throw Error("Đã hủy hoặc hết thời gian chờ Gemini.");if(e.name==="TypeError")throw Error("Không có kết nối Internet. Nét viết được giữ nguyên.");if(e instanceof SyntaxError)throw Error("Kết quả chưa hợp lệ. Thử khoanh vùng nhỏ hơn.");throw e;}
    finally{clearTimeout(timer);if(active===controller)active=null;}
  }
  root.GeminiWeb={status:async()=>({configured:!!key,model}),key:async value=>{if(typeof value!=="string"||value.length>512||/[\r\n\x00]/.test(value))throw Error("Khóa không hợp lệ.");key=value.trim();return {configured:!!key,model};},check,ask,cancel:async()=>{active?.abort();return true;}};
})(window);
