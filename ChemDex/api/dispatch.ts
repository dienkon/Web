import route0 from '../server/routes/feedback';
import route1 from '../server/routes/generate-questions';
import route2 from '../server/routes/health';
import route3 from '../server/routes/chemistry/search';
import route4 from '../server/routes/chemistry/structure';
import route5 from '../server/routes/experiment/ai-query';
import route6 from '../server/routes/experiment/mix';
import route7 from '../server/routes/gemini/chain';
import route8 from '../server/routes/gemini/chat';
import route9 from '../server/routes/gemini/community';
import route10 from '../server/routes/gemini/generate';
import route11 from '../server/routes/gemini/verify';
const handlers:Record<string,any>={"/api/feedback":route0,"/api/generate-questions":route1,"/api/health":route2,"/api/chemistry/search":route3,"/api/chemistry/structure":route4,"/api/experiment/ai-query":route5,"/api/experiment/mix":route6,"/api/gemini/chain":route7,"/api/gemini/chat":route8,"/api/gemini/community":route9,"/api/gemini/generate":route10,"/api/gemini/verify":route11};
const requestWindows=new Map<string,{count:number;until:number}>();
export default async function handler(req:any,res:any){
 const pathname=new URL(req.url||'/', 'https://chemdex.invalid').pathname.replace(/\/+$/,'');
 const rewritten=typeof req.query?.__route==='string'?`/api/${req.query.__route.replace(/^\/+|\/+$/g,'')}`:'';
 const route=handlers[pathname]?pathname:rewritten||pathname;
 const selected=handlers[route];if(!selected)return res.status(404).json({error:'API không tồn tại.'});
 if(req.method==='OPTIONS')return res.status(204).end();
 const origin=req.headers?.origin,host=req.headers?.host;if(origin&&host){try{if(new URL(origin).host!==host)return res.status(403).json({error:'Nguồn yêu cầu không hợp lệ.'});}catch{return res.status(403).json({error:'Nguồn yêu cầu không hợp lệ.'});}}
 if(route!=='/api/health'){const address=String(req.headers?.['x-forwarded-for']??'local').split(',')[0];const now=Date.now(),window=requestWindows.get(address);if(window&&window.until>now&&window.count>=40){res.setHeader('Retry-After','60');return res.status(429).json({error:'Đã đạt giới hạn yêu cầu. Vui lòng thử lại sau.'});}if(window&&window.until>now)window.count++;else requestWindows.set(address,{count:1,until:now+60000});if(requestWindows.size>1000)for(const[key,value]of requestWindows)if(value.until<now)requestWindows.delete(key);}
 let body=req.body;
 try{if(typeof body==='string')body=JSON.parse(body);if(body&&JSON.stringify(body).length>30000)return res.status(413).json({error:'Yêu cầu vượt quá giới hạn.'});}catch{return res.status(400).json({error:'JSON không hợp lệ.'});}
 req.body=body;res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cache-Control','no-store');
 try{return await selected(req,res);}catch{return res.status(500).json({error:'Không thể xử lý yêu cầu.'});}
}
