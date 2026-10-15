import { audioGraph } from './AudioGraph';
export type SoundEffect='click'|'success'|'error'|'snap'|'pop'|'chime'|'shatter'|'step'|'fizz'|'water'|'complete';
class SoundManager {
  private safe=false;
  setVolumes(sfx:number,music:number){audioGraph.setVolumes(sfx,music);}
  setSafeEffects(enabled:boolean){this.safe=enabled;audioGraph.setSafeEffects(enabled);}
  getSafeEffects(){return this.safe;}
  suspend(){return audioGraph.suspend();}
  resume(){return audioGraph.resume();}
  stopAll(){audioGraph.stopAll();}
  play(name:SoundEffect){
    // Short, quiet UI accents; physical actions use filtered noise instead of alarm-like beeps.
    if(name==='click')audioGraph.play('click','noise','ui',.035,.035,{filter:'highpass',cutoff:1700},65);
    else if(name==='snap')audioGraph.play('snap','noise','world',.09,.11,{filter:'bandpass',cutoff:1200},160);
    else if(name==='fizz')audioGraph.play('fizz','noise','world',.45,.075,{filter:'bandpass',cutoff:1800},260);
    else if(name==='water')audioGraph.play('water','noise','world',.35,.055,{filter:'lowpass',cutoff:1800},200);
    else if(name==='shatter')audioGraph.play('shatter','noise','world',.3,.09,{filter:'highpass',cutoff:2800},400);
    else if(name==='step')audioGraph.play('step','noise','world',.1,.06,{filter:'lowpass',cutoff:850},150);
    else if(name==='error')audioGraph.play('error','tone','ui',.2,.045,{frequency:240,endFrequency:180,type:'sine'},600);
    else if(name==='pop')audioGraph.play('pop','tone','world',.06,.045,{frequency:180,endFrequency:70},150);
    else audioGraph.play('reward','tone','ui',name==='complete'?.45:.25,.045,{frequency:name==='complete'?660:520,endFrequency:name==='complete'?880:660},500);
  }
  startLoop(name:'co2'|'fire'|'water_stream'){return audioGraph.startLoop(`effect-${name}`,'world',name==='fire'?.045:.08,{filter:name==='fire'?'lowpass':'bandpass',cutoff:name==='fire'?450:1600});}
  stopLoop(id:string){audioGraph.stopLoop(id);}
}
export const soundManager=new SoundManager();
export const playSound=(name:SoundEffect)=>soundManager.play(name);
