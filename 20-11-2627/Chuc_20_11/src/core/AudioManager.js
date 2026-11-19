import { asset, tribute } from '../config.js';

const score = [
  { chord: [45,52,57,60], melody: [69,72,76,null,74,72,null,67] },
  { chord: [41,48,53,57], melody: [69,null,65,67,69,null,72,null] },
  { chord: [48,55,60,64], melody: [76,null,74,72,67,69,72,null] },
  { chord: [43,50,55,59], melody: [71,67,null,62,64,null,67,null] },
  { chord: [45,52,57,60], melody: [72,76,null,79,76,74,72,null] },
  { chord: [41,48,53,57], melody: [69,72,77,null,76,72,null,69] },
  { chord: [48,55,60,64], melody: [67,72,76,74,null,72,69,null] },
  { chord: [43,50,55,59], melody: [67,null,71,null,69,null,64,null] },
];
const step = .43;
const frequency = (midi) => 440 * 2 ** ((midi - 69) / 12);

export class AudioManager {
  enabled = true;
  buffers = new Map();
  primary = 0;

  async unlock() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    if (!this.ctx) {
      try {
        this.ctx = new AudioContext();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0;
        this.music = this.ctx.createGain();
        this.music.connect(this.master);
        const limiter = this.ctx.createDynamicsCompressor();
        this.master.connect(limiter).connect(this.ctx.destination);
        this.interval = window.setInterval(() => this.schedule(), 140);
        if (tribute.soundtrack) {
          this.track = new Audio(asset(tribute.soundtrack));
          this.track.loop = true;
          this.ctx.createMediaElementSource(this.track).connect(this.music);
        }
      } catch {
        this.enabled = false;
        return;
      }
    }
    try {
      await this.ctx.resume();
      this.apply();
    } catch {
      this.enabled = false;
    }
  }

  apply() {
    if (!this.ctx || !this.master) return;
    const sound = this.enabled && !document.hidden;
    this.master.gain.setTargetAtTime(sound ? tribute.volume : 0, this.ctx.currentTime, .27);
    if (this.track) {
      if (sound && this.ctx.state === 'running' && this.track.paused) this.track.play().catch(() => {});
      if (!sound) this.track.pause();
    }
  }

  scene(index) {
    if (!this.ctx || !this.music) return;
    this.music.gain.setTargetAtTime([.6,.61,.68,.52,.62,.44,.72,.73][index],this.ctx.currentTime,.64);
    if (!this.enabled) return;
    if (index === 1) this.cue('spark');
    if (index === 3) { this.cue('wind'); this.cue('bell'); this.cue('chalk'); }
    if (index === 4) this.cue('page');
    if (index === 6 || index === 7) this.cue('spark');
  }

  piano(midi) {
    if (this.buffers.has(midi)) return this.buffers.get(midi);
    const rate = this.ctx.sampleRate;
    const data = this.ctx.createBuffer(1, Math.floor(rate * 2.35), rate);
    const samples = data.getChannelData(0);
    const fundamental = frequency(midi) * Math.PI * 2;
    for (let i=0;i<samples.length;i++) {
      const t=i/rate;
      const attack=1-Math.exp(-t*295);
      const hf = Math.sin(fundamental*2.002*t)*.25*Math.exp(-t*3.1)
        + Math.sin(fundamental*3.009*t)*.12*Math.exp(-t*4.35)
        + Math.sin(fundamental*4.022*t)*.046*Math.exp(-t*8.3);
      const low=(Math.sin(fundamental*t)*.53+Math.sin(fundamental*1.0024*t)*.26)*Math.exp(-t*1.64);
      samples[i]=(low+hf)*attack*(1-i/samples.length);
    }
    this.buffers.set(midi,data);
    return data;
  }

  note(midi, when, volume) {
    const source=this.ctx.createBufferSource();
    const gain=this.ctx.createGain();
    source.buffer=this.piano(midi);
    gain.gain.value=volume;
    source.connect(gain).connect(this.music);
    source.start(when);
  }

  pad(notes, when, length) {
    const gain=this.ctx.createGain();
    gain.gain.setValueAtTime(.0001,when);
    gain.gain.linearRampToValueAtTime(.033,when+.78);
    gain.gain.setValueAtTime(.033,when+length-.65);
    gain.gain.exponentialRampToValueAtTime(.0001,when+length+.3);
    gain.connect(this.music);
    for (const [i,note] of notes.entries()) {
      const oscillator=this.ctx.createOscillator();
      oscillator.type = i===0 ? 'triangle' : 'sine';
      oscillator.frequency.value=frequency(note-12);
      oscillator.detune.value=i*2.1-4;
      oscillator.connect(gain);
      oscillator.start(when);
      oscillator.stop(when+length+.32);
    }
  }

  schedule() {
    if (!this.ctx || !this.enabled || this.track || document.hidden || this.ctx.state!=='running') return;
    const now=this.ctx.currentTime;
    if (!this.next || this.next < now-.4) this.next=now+.045;
    while(this.next<now+.65) {
      const beat=this.primary%8;
      const bar=score[Math.floor(this.primary/8)%score.length];
      const melody=bar.melody[beat];
      if(beat===0) this.pad(bar.chord,this.next,step*8);
      if(beat%2===0) this.note(bar.chord[beat/2],this.next,.125);
      if(melody) this.note(melody,this.next+.029,.17);
      this.primary++;
      this.next+=step;
    }
  }

  cue(kind) {
    if (!this.enabled || !this.ctx || this.ctx.state !== 'running') return;
    const now=this.ctx.currentTime;
    if (kind==='spark' || kind==='bell') {
      const notes=kind==='spark'?[81,86,93]:[70,77];
      notes.forEach((midi,i)=>this.note(midi,now+.095*i,kind==='bell'?.13:.075));
      return;
    }
    const lengths={ page:.28, chalk:.32, wind:2.1 };
    const duration=lengths[kind] ?? .2;
    const buffer=this.ctx.createBuffer(1,Math.ceil(this.ctx.sampleRate*duration),this.ctx.sampleRate);
    const array=buffer.getChannelData(0);
    for (let i=0;i<array.length;i++) {
      const p=i/array.length;
      const envelope=Math.sin(Math.PI*p)**(kind==='wind'?1.8:4);
      array[i]=(Math.random()*2-1)*envelope*(kind==='chalk'?(.45+.55*Math.sin(p*39)**2):1);
    }
    const source=this.ctx.createBufferSource();
    source.buffer=buffer;
    const tone=this.ctx.createBiquadFilter();
    tone.type='bandpass';
    tone.frequency.value={page:1250,chalk:2400,wind:410}[kind] ?? 1000;
    const volume=this.ctx.createGain();
    volume.gain.value=kind==='wind'?.19:.12;
    source.connect(tone).connect(volume).connect(this.master);
    source.start(now+(kind==='chalk'?.58:0));
  }
}
