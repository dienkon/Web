/* Shared data contract for the creator, live preview and saved greetings. */
(() => {
  'use strict';
  const defaults = Object.freeze({
    recipient:'',sender:'Một người luôn quý mến bạn',
    eyebrow:'GỬI MỘT NỬA THẾ GIỚI, VỚI TẤT CẢ YÊU THƯƠNG',
    day:'20',month:'10',caption:'một đóa hoa, dành riêng bạn',
    salutation:'Gửi bạn, người luôn xứng đáng được yêu thương',
    headline:'Hôm nay, dành tặng bạn',headlineSecond:'cả một',headlineAccent:'vườn dịu dàng.',
    subtitle:'Mong bạn luôn rạng rỡ như hoa, an yên như nắng,\nvà được yêu thương theo cách đẹp đẽ nhất.',
    buttonText:'Có một lời thương gửi bạn',footer:'Một ngày thật đẹp. Một người thật đặc biệt.',
    letterTitle:'Gửi bạn thương,',letterEyebrow:'MỘT CHÚT YÊU THƯƠNG · 20/10',
    message:'Hôm nay, chẳng cần phải thật mạnh mẽ, cũng chẳng cần vội vàng. Cứ là bạn thôi — dịu dàng, rạng rỡ, và thật hạnh phúc.\n\nChúc bạn một ngày 20/10 ngập tràn những nụ cười, những cái ôm ấm áp và những yêu thương chân thành. Mong những điều bạn ấp ủ đều sẽ nở hoa, theo cách riêng của mình.\n\nCảm ơn vì bạn đã có mặt, và làm thế giới này trở nên đẹp hơn một chút. ♡',
    signoff:'Với tất cả dịu dàng,',paperBottom:'BẠN XỨNG ĐÁNG VỚI NHỮNG ĐIỀU ĐẸP ĐẼ NHẤT.',
    photoBase64:'',theme:'rose',effect:'enchanted',fontSize:'normal'
  });
  const limits={recipient:60,sender:100,eyebrow:160,day:2,month:2,caption:100,salutation:180,headline:100,headlineSecond:70,headlineAccent:100,subtitle:600,buttonText:80,footer:180,letterTitle:120,letterEyebrow:160,message:5000,signoff:100,paperBottom:180,photoBase64:650000,theme:15,effect:15,fontSize:15};
  function normalize(input={}) {
    const result={...defaults};
    for(const key of Object.keys(defaults))if(typeof input?.[key]==='string')result[key]=input[key].slice(0,limits[key]);
    if(!['rose','lavender','forest'].includes(result.theme))result.theme='rose';
    if(!['enchanted','gentle'].includes(result.effect))result.effect='enchanted';
    if(!['normal','small'].includes(result.fontSize))result.fontSize='normal';
    if(!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(result.photoBase64))result.photoBase64='';
    return result;
  }
  async function compressPhoto(file) {
    if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('Bạn chọn ảnh JPG, PNG hoặc WebP nhé.');
    if(file.size>15*1024*1024)throw Error('Ảnh gốc cần nhỏ hơn 15 MB.');
    const url=URL.createObjectURL(file);
    try{
      const img=new Image();img.src=url;await img.decode();
      const ratio=Math.min(1,800/Math.max(img.naturalWidth,img.naturalHeight));
      const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.naturalWidth*ratio));canvas.height=Math.max(1,Math.round(img.naturalHeight*ratio));
      const ctx=canvas.getContext('2d');ctx.fillStyle='#f4e3dc';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
      for(const quality of [.86,.75,.62,.48,.35]){const data=canvas.toDataURL('image/jpeg',quality);if(data.length<=650000)return data;}
      throw Error('Ảnh vẫn quá lớn sau tối ưu. Bạn chọn ảnh đơn giản hơn nhé.');
    }catch(error){throw Error(error.message.includes('Ảnh')?error.message:'Không đọc được ảnh này. Bạn thử ảnh khác nhé.');}finally{URL.revokeObjectURL(url);}
  }
  window.GiftData={defaults,limits,normalize,compressPhoto};
})();
