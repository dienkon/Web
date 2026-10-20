/* Firestore REST client: no packages, Storage bucket or Realtime Database needed. */
(() => {
  'use strict';
  const firebaseConfig=Object.freeze({
    apiKey:'AIzaSyBvMIS8IRDqyYOhMeIx5qXgHmt1ivXftzU',
    authDomain:'loveletter-f0f23.firebaseapp.com',
    databaseURL:'https://loveletter-f0f23-default-rtdb.firebaseio.com',
    projectId:'loveletter-f0f23',storageBucket:'loveletter-f0f23.firebasestorage.app',
    messagingSenderId:'688584515488',appId:'1:688584515488:web:e94a5646343464be134ec5',measurementId:'G-1JF9CC55P5'
  });
  const base=`https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/greetings`;
  function describe(error) {
    const info=error?.details?.find(item=>item.reason)?.reason;
    if(info==='SERVICE_DISABLED')return 'Dự án chưa bật Cloud Firestore API. Vào Firebase Console → Firestore Database để tạo database và bật API, rồi thử lại.';
    if(error?.status==='PERMISSION_DENIED')return 'Firestore đang từ chối quyền truy cập. Hãy cấu hình rules cho collection greetings theo file firestore.rules.';
    if(error?.status==='NOT_FOUND')return 'Không tìm thấy thiệp hoặc database Firestore chưa được tạo.';
    if(error?.status==='RESOURCE_EXHAUSTED')return 'Firestore đang hết hạn mức. Vui lòng thử lại sau.';
    return 'Chưa thể kết nối Firestore. Kiểm tra mạng và cấu hình dự án rồi thử lại.';
  }
  async function request(url,options={}) {
    let response;
    try{response=await fetch(url,{...options,signal:AbortSignal.timeout(20000)});}catch{throw Error('Kết nối quá lâu hoặc mất mạng. Lời chúc vẫn được giữ trong bản nháp. Bạn có thể thử lưu lại.');}
    const result=await response.json().catch(()=>({}));
    if(!response.ok){const error=Error(describe(result.error));error.httpStatus=response.status;throw error;}
    return result;
  }
  async function save(data,id=crypto.randomUUID().replaceAll('-','')) {
    if(!/^[a-f0-9]{32}$/.test(id))throw Error('Mã thiệp không hợp lệ.');
    const gift=GiftData.normalize(data);
    if(!gift.message.trim()||!gift.headline.trim())throw Error('Bạn cần nhập tiêu đề và lời chúc trước khi lưu.');
    const fields=Object.fromEntries(Object.entries(gift).map(([k,v])=>[k,{stringValue:v}]));
    fields.version={integerValue:'2'};
    const body=JSON.stringify({fields});
    if(new TextEncoder().encode(body).length>800000)throw Error('Thiệp quá lớn. Bạn giảm ảnh hoặc rút ngắn lời chúc nhé.');
    try{
      await request(`${base}?documentId=${id}&key=${firebaseConfig.apiKey}`,{method:'POST',headers:{'Content-Type':'application/json'},body});
    }catch(error){
      // A timed-out POST may have committed. Re-read this exact immutable ID before retrying.
      if(!error.httpStatus||error.httpStatus===409){try{const existing=await load(id);if(JSON.stringify(existing)===JSON.stringify(gift))return id;}catch{/* Retain the original actionable error. */}}
      throw error;
    }
    return id;
  }
  async function load(id) {
    if(!/^[a-f0-9]{32}$/.test(id))throw Error('Link thiệp không hợp lệ. Bạn kiểm tra lại đường dẫn nhé.');
    const doc=await request(`${base}/${id}?key=${firebaseConfig.apiKey}`);
    const value=Object.fromEntries(Object.entries(doc.fields||{}).filter(([,v])=>typeof v.stringValue==='string').map(([k,v])=>[k,v.stringValue]));
    return GiftData.normalize(value);
  }
  window.GiftStore={config:firebaseConfig,save,load};
})();
