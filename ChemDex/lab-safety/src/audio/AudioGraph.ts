export type AudioChannel = 'ui' | 'world' | 'ambient';
type Source = AudioBufferSourceNode | OscillatorNode;
interface Voice { source: Source; gain: GainNode; nodes: AudioNode[]; channel: AudioChannel; stopping: boolean; volume: number; }
interface ToneOptions { frequency?: number; endFrequency?: number; type?: OscillatorType; filter?: BiquadFilterType; cutoff?: number; position?: [number,number,number]; rate?: number; }

// One owned graph. Audio-clock stops and source-local cleanup cannot kill a newer loop.
class AudioGraph {
  context: AudioContext | null = null;
  private master: GainNode | null = null;
  private channels: Partial<Record<AudioChannel, GainNode>> = {};
  private voices = new Set<Voice>();
  private loops = new Map<string, Voice>();
  private buffers = new Map<number, AudioBuffer>();
  private lastCue = new Map<string, number>();
  private starts: Record<string,number> = {};
  private worldBlocked = true;
  private inactive = false;
  private sfx = .8;
  private ambient = .6;
  private safe = false;
  private userPaused = false;

  private ensure() {
    if (this.context) return this.context;
    const Ctor = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctor) return null;
    const ctx: AudioContext = new Ctor(); this.context = ctx;
    this.master = ctx.createGain(); this.master.gain.value = this.inactive ? 0 : 1; this.master.connect(ctx.destination);
    for (const channel of ['ui','world','ambient'] as const) { const gain=ctx.createGain(); gain.connect(this.master); this.channels[channel]=gain; }
    this.applyVolumes(); return ctx;
  }
  unlock() { const ctx=this.ensure(); if(ctx?.state==='suspended' && !this.userPaused && !this.inactive) void ctx.resume().catch(()=>undefined); }
  private ramp(node: GainNode | undefined | null, value: number, seconds=.03) {
    if (!node || !this.context) return;
    const param=node.gain, now=this.context.currentTime;
    param.cancelScheduledValues(now); param.setTargetAtTime(value,now,seconds);
  }
  private applyVolumes() {
    const attenuation=this.safe?.6:1;
    this.ramp(this.channels.ui,this.sfx*attenuation);
    this.ramp(this.channels.world,this.worldBlocked?0:this.sfx*attenuation);
    this.ramp(this.channels.ambient,this.worldBlocked?0:this.sfx*this.ambient*attenuation);
  }
  setVolumes(sfx: number, ambient: number) { this.sfx=Math.max(0,Math.min(1,sfx));this.ambient=Math.max(0,Math.min(1,ambient));this.applyVolumes();if(this.sfx===0)this.stopAll(); }
  setSafeEffects(safe: boolean) { this.safe=safe;this.applyVolumes(); }
  setWorldBlocked(blocked: boolean) { if(this.worldBlocked===blocked)return;this.worldBlocked=blocked;if(blocked)this.stopWorld();this.applyVolumes(); }
  setInactive(inactive: boolean) { this.inactive=inactive;if(inactive)this.stopAll();this.ramp(this.master,inactive?0:1,.015); }
  async suspend() { this.userPaused=true;this.stopAll();if(this.context?.state==='running')await this.context.suspend().catch(()=>undefined); }
  async resume() { this.userPaused=false;this.unlock(); }
  private noise(duration: number) {
    const ctx=this.ensure()!;
    if(this.buffers.has(duration))return this.buffers.get(duration)!;
    const buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*duration),ctx.sampleRate), data=buffer.getChannelData(0);
    // Seeded noise is reused; no per-frame buffer allocation.
    let seed=41321;for(let i=0;i<data.length;i++){seed=(Math.imul(seed,1664525)+1013904223)|0;data[i]=((seed>>>0)/4294967296)*2-1;}
    this.buffers.set(duration,buffer);return buffer;
  }
  private createVoice(kind: 'tone' | 'noise', channel: AudioChannel, options: ToneOptions, loop=false): Voice | null {
    if(this.inactive || this.userPaused || this.sfx<=0 || (channel!=='ui' && this.worldBlocked))return null;
    const ctx=this.ensure();if(!ctx || ctx.state!=='running' || this.voices.size>=24)return null;
    const source=kind==='tone'?ctx.createOscillator():ctx.createBufferSource();
    if(source instanceof OscillatorNode){source.type=options.type??'sine';source.frequency.value=options.frequency??300;}
    else {source.buffer=this.noise(loop?2:.8);source.loop=loop;source.playbackRate.value=options.rate??1;}
    const gain=ctx.createGain(), nodes:AudioNode[]=[source,gain];let output:AudioNode=source;
    if(options.filter){const filter=ctx.createBiquadFilter();filter.type=options.filter;filter.frequency.value=options.cutoff??1200;filter.Q.value=.7;output.connect(filter);output=filter;nodes.push(filter);}
    output.connect(gain);output=gain;
    if(options.position){const p=ctx.createPanner();p.panningModel='equalpower';p.distanceModel='inverse';p.refDistance=1.4;p.maxDistance=25;p.rolloffFactor=1.2;p.positionX.value=options.position[0];p.positionY.value=options.position[1];p.positionZ.value=options.position[2];output.connect(p);output=p;nodes.push(p);}
    output.connect(this.channels[channel]!);
    const voice:Voice={source,gain,nodes,channel,stopping:false,volume:0};this.voices.add(voice);
    source.onended=()=>{for(const node of nodes)node.disconnect();this.voices.delete(voice);for(const [key,current] of this.loops)if(current===voice)this.loops.delete(key);};
    return voice;
  }
  play(key: string, kind: 'tone' | 'noise', channel: AudioChannel, duration: number, volume: number, options: ToneOptions={}, cooldown=120) {
    const time=performance.now();if(time-(this.lastCue.get(key)??-Infinity)<cooldown)return false;
    const voice=this.createVoice(kind,channel,options);if(!voice || !this.context)return false;
    this.lastCue.set(key,time);this.starts[key]=(this.starts[key]??0)+1;
    const now=this.context.currentTime;
    voice.gain.gain.setValueAtTime(.0001,now);voice.gain.gain.linearRampToValueAtTime(volume,now+.008);voice.gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
    if(voice.source instanceof OscillatorNode && options.endFrequency)voice.source.frequency.exponentialRampToValueAtTime(options.endFrequency,now+duration);
    voice.source.start(now);voice.source.stop(now+duration+.01);return true;
  }
  startLoop(key: string, channel: AudioChannel, volume: number, options: ToneOptions={}) {
    if(this.loops.has(key))return key;
    const voice=this.createVoice(options.frequency?'tone':'noise',channel,options,true);if(!voice || !this.context)return key;
    voice.gain.gain.value=0;voice.gain.gain.setTargetAtTime(volume,this.context.currentTime,.025);
    voice.volume=volume;voice.source.start();this.loops.set(key,voice);this.starts[key]=(this.starts[key]??0)+1;return key;
  }
  updateLoop(key: string, volume: number) { const voice=this.loops.get(key);if(voice && Math.abs(voice.volume-volume)>.003){voice.volume=volume;this.ramp(voice.gain,volume,.08);} }
  private stopVoice(voice:Voice, immediate=false) {
    if(voice.stopping || !this.context)return;voice.stopping=true;
    const now=this.context.currentTime, duration=immediate?.005:.055;
    voice.gain.gain.cancelScheduledValues(now);voice.gain.gain.setTargetAtTime(0,now,duration/3);
    try{voice.source.stop(now+duration);}catch{/* Already ended. */}
  }
  stopLoop(key: string) {const voice=this.loops.get(key);if(!voice)return;this.loops.delete(key);this.stopVoice(voice);}
  stopWorld() {for(const [key,voice] of [...this.loops])if(voice.channel!=='ui')this.stopLoop(key);for(const voice of this.voices)if(voice.channel!=='ui')this.stopVoice(voice,true);}
  stopAll() {for(const key of [...this.loops.keys()])this.stopLoop(key);for(const voice of this.voices)this.stopVoice(voice,true);}
  getDiagnostics(){return {state:this.context?.state??'uninitialized',worldBlocked:this.worldBlocked,inactive:this.inactive,sfxVolume:this.sfx,ambientVolume:this.ambient,loops:[...this.loops.keys()],activeVoices:this.voices.size,worldVoices:[...this.voices].filter(v=>v.channel!=='ui').length,bufferCount:this.buffers.size,starts:{...this.starts}};}
}
export const audioGraph=new AudioGraph();
