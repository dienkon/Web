import React from 'react';
import * as THREE from 'three';
import {WARDROBE as W} from './wardrobe';
import {useBakedGeometry,spherePart,capsulePart,boxPart,tubePart,type BakedPart} from './BakedParts';

/** Local +Y points up the arm, with palm center at the local origin. */
export function SleeveCuffAsset({coat=true,gloved=false,shirt='#87adb0',skin='#e6b89b',length=.38,radius=.056}:{coat?:boolean;gloved?:boolean;shirt?:string;skin?:string;length?:number;radius?:number}){
 const geometry=useBakedGeometry(()=>{
  const color=coat?W.coat:skin,parts:BakedPart[]=[capsulePart([0,length*.51,0],radius,length-radius*2,color)];
  if(coat){
   parts.push({geometry:new THREE.CylinderGeometry(radius*.91,radius*.86,.038,20,1,true),color:W.lapel,at:[0,.041,0]});
   parts.push(tubePart([[radius*.89,.06,0],[radius*.98,length*.5,0],[radius*.88,length-.025,0]],.0012,W.seam));
   parts.push(tubePart([[-radius*.89,.06,0],[0,.058,radius*.89],[radius*.89,.06,0]],.0011,W.seam));
  }else{
   parts.push(capsulePart([0,length-.075,0],radius*1.06,.052,shirt));
  }
  if(gloved){
   parts.push({geometry:new THREE.CylinderGeometry(radius*.79,radius*.83,.04,20,1,true),color:W.glove,at:[0,.012,0]});
   parts.push(tubePart([[-radius*.7,.027,radius*.38],[0,.03,radius*.8],[radius*.7,.027,radius*.38]],.0012,W.gloveFold));
  }
  return parts;
 },[coat,gloved,shirt,skin,length,radius]);
 return <mesh name="asset-sleeve-cuff" geometry={geometry} castShadow userData={{wardrobe:{coat,gloved,fabric:coat?W.coat:shirt}}}><meshStandardMaterial vertexColors roughness={.88}/></mesh>;
}

export function ShoeAsset({closed=true,skin='#e6b89b'}:{closed?:boolean;skin?:string}){
 const geometry=useBakedGeometry(()=>{
  const outline=new THREE.Shape();outline.moveTo(-.065,-.072);outline.quadraticCurveTo(-.083,-.07,-.078,-.035);outline.lineTo(-.075,.12);outline.quadraticCurveTo(-.073,.19,0,.19);outline.quadraticCurveTo(.073,.19,.075,.12);outline.lineTo(.078,-.035);outline.quadraticCurveTo(.083,-.07,.065,-.072);outline.closePath();
  const sole=new THREE.ExtrudeGeometry(outline,{depth:.025,bevelEnabled:false,steps:1,curveSegments:16});sole.rotateX(Math.PI/2);sole.translate(0,.025,0);
  const parts:BakedPart[]=[{geometry:sole,color:W.sole}];
  if(closed){
   parts.push({geometry:new THREE.SphereGeometry(1,24,12,0,Math.PI*2,0,Math.PI/2),at:[0,.025,.055],scale:[.073,.085,.12],color:W.shoe});
   parts.push({geometry:new THREE.CylinderGeometry(.047,.056,.055,24,1,true),at:[0,.095,-.018],scale:[1,1,.91],color:W.shoe});
   parts.push(tubePart([[-.055,.057,.10],[0,.066,.153],[.055,.057,.10]],.0018,'#78919c'));
   const shoeY=(x:number,z:number)=>.025+.085*Math.sqrt(Math.max(.001,1-Math.pow(x/.073,2)-Math.pow((z-.055)/.12,2)))+.0015;
   for(const z of [.005,.03,.055])parts.push(tubePart([[-.031,shoeY(-.031,z),z],[0,shoeY(0,z+.008),z+.008],[.031,shoeY(.031,z),z]],.002,W.laces));
   parts.push(boxPart([0,.066,-.072],[.028,.035,.005],W.laces));
  }else{
   parts.push(spherePart([0,.043,.025],[.061,.025,.105],skin));
   parts.push(tubePart([[-.06,.04,.035],[0,.075,.05],[.06,.04,.035]],.009,'#8b7963'));
   parts.push(tubePart([[-.045,.06,-.03],[0,.085,-.055],[.045,.06,-.03]],.008,'#8b7963'));
   for(let i=0;i<5;i++)parts.push(spherePart([-.043+i*.021,.041,.137-i*.004],[.012-i*.001,.015,.026],skin,10));
  }
  return parts;
 },[closed,skin]);
 return <mesh name={closed?'asset-closed-shoe':'asset-open-sandal'} geometry={geometry} userData={{wardrobe:{closed}}} castShadow><meshStandardMaterial vertexColors roughness={.84}/></mesh>;
}

export function TrouserLegAsset(){
 const geometry=useBakedGeometry(()=>[
  capsulePart([0,-.35,0],.072,.56,W.trousers),
  tubePart([[.065,-.08,.015],[.071,-.34,.019],[.055,-.67,.021]],.0012,W.trouserSeam),
  tubePart([[-.05,-.678,.019],[0,-.678,.0537],[.05,-.678,.019]],.0014,W.trouserSeam),
 ],[]);
 return <mesh name="asset-trouser-leg" geometry={geometry} castShadow><meshStandardMaterial vertexColors roughness={.95}/></mesh>;
}

export function FaceDetailsAsset({skin='#e6b89b',hair='#5b4f43'}:{skin?:string;hair?:string}){
 const geometry=useBakedGeometry(()=>{
  const parts:BakedPart[]=[];
  const innerEar='#'+new THREE.Color(skin).lerp(new THREE.Color('#b77c72'),.24).getHexString();
  for(const side of [-1,1]){
   parts.push(spherePart([side*.166,-.005,0],[.018,.036,.023],skin));
   parts.push(spherePart([side*.18,-.006,.005],[.005,.019,.013],innerEar));
   parts.push(spherePart([side*.064,.005,.154],[.021,.024,.009],'#eee8dc'));
   parts.push(spherePart([side*.064,.005,.163],[.010,.012,.0035],'#5f665a'));
   parts.push(spherePart([side*.064,.004,.166],[.005,.007,.0025],'#293b42'));
   parts.push(spherePart([side*.060,.011,.168],[.003,.003,.0015],'#f4faf5',8));
   parts.push(tubePart([[side*.038,.04,.149],[side*.061,.045,.150],[side*.085,.037,.14]],.003,hair));
  }
  parts.push(spherePart([0,-.03,.163],[.012,.026,.016],skin));parts.push(spherePart([0,-.044,.177],[.018,.013,.013],skin));
  parts.push(tubePart([[-.026,-.081,.143],[0,-.087,.148],[.026,-.081,.143]],.0025,'#a76f64'));
  return parts;
 },[skin,hair]);
 return <mesh name="asset-face-details" geometry={geometry}><meshStandardMaterial vertexColors roughness={.8}/></mesh>;
}
