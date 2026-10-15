import { audioGraph } from './AudioGraph';
import { playerCoords } from '../store/useStore';
class SpatialSoundEngine {
  private footPosition:[number,number]|null=null;
  private footDistance=0;
  private footSide=1;
  suspend(){this.resetSteps();return audioGraph.suspend();}
  resume(){return audioGraph.resume();}
  resetSteps(){this.footPosition=null;this.footDistance=0;}
  stopAll(){this.resetSteps();audioGraph.stopWorld();}
  updateListener(x:number,y:number,z:number,forwardX:number,forwardZ:number){
    const ctx=audioGraph.context;if(!ctx)return;const l=ctx.listener,now=ctx.currentTime;
    if(l.positionX){l.positionX.value=x;l.positionY.value=y+1.6;l.positionZ.value=z;l.forwardX.value=forwardX;l.forwardY.value=0;l.forwardZ.value=forwardZ;l.upX.value=0;l.upY.value=1;l.upZ.value=0;}
    else {l.setPosition(x,y+1.6,z);l.setOrientation(forwardX,0,forwardZ,0,1,0);}
  }
  playAt(name:'fizz'|'snap'|'shatter'|'pop'|'step',position:[number,number,number],volume=1){
    const filter=name==='step'?'lowpass':name==='shatter'?'highpass':'bandpass';
    audioGraph.play(`physical-${name}`,'noise','world',name==='step'?.12:.3,(name==='step'?.07:.09)*volume,{filter,cutoff:name==='step'?750:name==='shatter'?2600:1500,position,rate:.95+Math.random()*.1},name==='step'?160:220);
  }
  tickFootsteps(moving:boolean,running:boolean){
    const [x,,z]=playerCoords.position;
    if(!moving){this.resetSteps();return;}
    if(!this.footPosition){this.footPosition=[x,z];return;}
    const travel=Math.hypot(x-this.footPosition[0],z-this.footPosition[1]);this.footPosition=[x,z];
    if(travel>.5){this.footDistance=0;return;}
    this.footDistance+=travel;
    if(this.footDistance>(running?1.05:.8)){this.footDistance=0;this.footSide*=-1;this.playAt('step',[x+this.footSide*.07,.05,z],running?1.2:.85);}
  }
  startFumeHoodAmbient(){audioGraph.startLoop('ventilation','ambient',.025,{filter:'lowpass',cutoff:320,position:[8.8,1.8,-3.5]});}
  stopFumeHoodAmbient(){audioGraph.stopLoop('ventilation');}
  startExtinguisherHiss(){audioGraph.startLoop('co2-hiss','world',.11,{filter:'bandpass',cutoff:1900});}
  stopExtinguisherHiss(){audioGraph.stopLoop('co2-hiss');}
  setFire(active:boolean,intensity:number,position:[number,number,number]){
    if(!active){audioGraph.stopLoop('fire-crackle');return;}
    audioGraph.startLoop('fire-crackle','world',.045,{filter:'lowpass',cutoff:650,position});audioGraph.updateLoop('fire-crackle',.02+intensity*.025);
  }
  triggerAlarm(active:boolean){if(active)audioGraph.play('fire-alarm','tone','world',.65,.055,{frequency:650,endFrequency:480,type:'sine'},5000);}
}
export const spatialSound=new SpatialSoundEngine();
