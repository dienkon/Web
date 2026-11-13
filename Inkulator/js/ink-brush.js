(function(root){
  "use strict";
  const catalog=[
    ["ballpoint","Bút bi · nét đều",2.5],["fountain","Bút mực · áp lực",3],
    ["pencil","Bút chì",2],["marker","Bút lông",4],
    ["fineliner","Bút kỹ thuật · nét mảnh",1.2],["brush","Bút cọ · thuôn nét",5],
    ["calligraphy","Calligraphy Pen · Bút thư pháp",6],["soft-pencil","Bút chì mềm · nét đậm nhạt",4],
    ["dashed","Bút nét đứt",2.5],["dotted","Bút nét chấm",2.5]
  ];
  const custom=new Set(catalog.slice(4).map(p=>p[0]));
  function path(ctx,points){ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);for(let i=1;i<points.length;i++)ctx.lineTo(points[i][0],points[i][1]);}
  function draw(ctx,points,type,width){
    if(!custom.has(type)||!points.length)return false;
    ctx.save();ctx.lineJoin="round";ctx.lineCap="round";
    if(type==="fineliner")width*=.65;
    if(type==="soft-pencil"){width*=1.4;ctx.globalAlpha*=.42;}
    if(points.length===1){ctx.beginPath();ctx.arc(points[0][0],points[0][1],width/2,0,2*Math.PI);ctx.fill();ctx.restore();return true;}
    if(type==="brush"||type==="calligraphy"){
      let smoothed=width;
      for(let i=1;i<points.length;i++){
        const a=points[i-1],b=points[i],pressure=Math.max(.05,Math.min(1,b[2]??.5));
        const tangent=Math.atan2(b[1]-a[1],b[0]-a[0]);
        const nib=type==="calligraphy"?.25+1.6*Math.abs(Math.sin(tangent-Math.PI/4)):.2+1.8*pressure;
        const taper=type==="brush"?Math.min(1,.3+i/5,.3+(points.length-i)/5):1;
        const target=Math.max(.25,width*nib*taper*(type==="calligraphy"?(.65+.7*pressure):1));
        smoothed=smoothed*.6+target*.4;ctx.lineWidth=smoothed;ctx.lineCap="round";
        ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke();
      }
    }else{
      ctx.lineWidth=width;
      if(type==="dashed")ctx.setLineDash([width*4,width*2.6]);
      if(type==="dotted")ctx.setLineDash([.01,width*2.5]);
      path(ctx,points);ctx.stroke();
      if(type==="soft-pencil"){ctx.lineWidth=width*.28;ctx.globalAlpha*=.8;path(ctx,points);ctx.stroke();}
    }
    ctx.restore();return true;
  }
  root.InkBrush={catalog,draw};
})(typeof window!=="undefined"?window:globalThis);
