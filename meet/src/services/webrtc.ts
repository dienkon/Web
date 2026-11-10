const iceServers: RTCIceServer[] = [
  { urls: import.meta.env.VITE_STUN_SERVER || 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];
if (import.meta.env.VITE_TURN_SERVER) {
  iceServers.push({ urls: import.meta.env.VITE_TURN_SERVER,
    username: import.meta.env.VITE_TURN_USERNAME, credential: import.meta.env.VITE_TURN_PASSWORD });
}

// Fixed slots keep microphone, camera, screen video and screen audio independent.
type Peer = { pc: RTCPeerConnection; slots: RTCRtpTransceiver[]; tracks: (MediaStreamTrack | null)[] };
export class WebRTCManager {
  private peers = new Map<string, Peer>();
  private pendingCandidates = new Map<string, RTCIceCandidateInit[]>();
  private screenStream: MediaStream | null = null;

  hasPeerConnection(id: string) { return this.peers.has(id); }

  createPeerConnection(id: string, local: MediaStream | null,
    onTrack: (stream: MediaStream, screenStream: MediaStream) => void,
    onIce: (candidate: RTCIceCandidate) => void,
    onState?: (state: RTCPeerConnectionState) => void,
    onRestart?: (offer: RTCSessionDescriptionInit) => void) {
    const existing = this.peers.get(id);
    if (existing) return existing.pc;
    const pc = new RTCPeerConnection({ iceServers, iceCandidatePoolSize: 2 });
    const camera = new MediaStream();
    const screen = new MediaStream();
    const tracks = [local?.getAudioTracks()[0] || null, local?.getVideoTracks()[0] || null,
      this.screenStream?.getVideoTracks()[0] || null, this.screenStream?.getAudioTracks()[0] || null];
    // Answerers must adopt the offered transceivers before adding their sending tracks.
    this.peers.set(id, { pc, slots: [], tracks });
    pc.ontrack = ({ track, transceiver }) => {
      const stream = pc.getTransceivers().indexOf(transceiver) >= 2 ? screen : camera;
      if (!stream.getTrackById(track.id)) stream.addTrack(track);
      const notify = () => {
        if (this.peers.get(id)?.pc === pc) onTrack(new MediaStream(camera.getTracks()), new MediaStream(screen.getTracks()));
      };
      track.onunmute = notify;
      track.onmute = notify;
      track.onended = () => { stream.removeTrack(track); notify(); };
      notify();
    };
    pc.onicecandidate = ({ candidate }) => { if (candidate) onIce(candidate); };
    pc.onconnectionstatechange = () => {
      onState?.(pc.connectionState);
      if (pc.connectionState === 'failed' && onRestart && pc.signalingState === 'stable') {
        void this.createOffer(id, true).then(offer => { if (offer) onRestart(offer); });
      }
    };
    return pc;
  }

  private async flushCandidates(id: string) {
    const peer = this.peers.get(id);
    if (!peer?.pc.remoteDescription) return;
    const queued = this.pendingCandidates.get(id) || [];
    this.pendingCandidates.delete(id);
    for (const candidate of queued) {
      try { await peer.pc.addIceCandidate(candidate); } catch (error) { console.warn('[WebRTC] Queued ICE', error); }
    }
  }

  async createOffer(id: string, iceRestart = false): Promise<RTCSessionDescriptionInit | null> {
    const peer = this.peers.get(id);
    if (!peer || peer.pc.signalingState !== 'stable') return null;
    const { pc, tracks } = peer;
    try {
      if (!peer.slots.length) {
        peer.slots = (['audio', 'video', 'video', 'audio'] as const).map((kind, i) => pc.addTransceiver(tracks[i] || kind, { direction: 'sendrecv' }));
      }
      await pc.setLocalDescription(await pc.createOffer({ iceRestart }));
      return pc.localDescription?.toJSON() || null;
    } catch (error) { console.warn('[WebRTC] Offer failed', error); return null; }
  }

  async handleOffer(id: string, offer: RTCSessionDescriptionInit) {
    const peer = this.peers.get(id);
    if (!peer) return null;
    const { pc } = peer;
    try {
      if (pc.signalingState === 'have-local-offer') await pc.setLocalDescription({ type: 'rollback' });
      await pc.setRemoteDescription(offer);
      if (!peer.slots.length) peer.slots = pc.getTransceivers().slice(0, 4);
      await Promise.all(peer.slots.map(async (slot, i) => {
        slot.direction = 'sendrecv';
        await slot.sender.replaceTrack(peer.tracks[i]);
      }));
      await this.flushCandidates(id);
      await pc.setLocalDescription(await pc.createAnswer());
      return pc.localDescription?.toJSON() || null;
    } catch (error) { console.warn('[WebRTC] Answer failed', error); return null; }
  }

  async handleAnswer(id: string, answer: RTCSessionDescriptionInit) {
    const pc = this.peers.get(id)?.pc;
    if (pc?.signalingState === 'have-local-offer') {
      try {
        await pc.setRemoteDescription(answer);
        await this.flushCandidates(id);
      } catch (error) { console.warn('[WebRTC] Remote answer failed', error); }
    }
  }

  async addIceCandidate(id: string, candidate: RTCIceCandidateInit) {
    const pc = this.peers.get(id)?.pc;
    if (pc?.remoteDescription) {
      try { await pc.addIceCandidate(candidate); } catch (error) { console.warn('[WebRTC] ICE', error); }
    } else {
      this.pendingCandidates.set(id, [...(this.pendingCandidates.get(id) || []), candidate]);
    }
  }

  async replaceTrack(kind: 'audio' | 'video', track: MediaStreamTrack | null) {
    const index = kind === 'audio' ? 0 : 1;
    await Promise.all([...this.peers.values()].map(peer => {
      peer.tracks[index] = track;
      return peer.slots[index]?.sender.replaceTrack(track);
    }));
  }

  async updateLocalStream(stream: MediaStream | null) {
    await Promise.all([this.replaceTrack('audio', stream?.getAudioTracks()[0] || null),
      this.replaceTrack('video', stream?.getVideoTracks()[0] || null)]);
  }

  async updateScreenStream(stream: MediaStream | null) {
    this.screenStream = stream;
    await Promise.all([...this.peers.values()].map(async (peer) => {
      const { slots } = peer;
      peer.tracks[2] = stream?.getVideoTracks()[0] || null;
      peer.tracks[3] = stream?.getAudioTracks()[0] || null;
      if (!slots.length) return;
      await Promise.all([slots[2].sender.replaceTrack(stream?.getVideoTracks()[0] || null),
        slots[3].sender.replaceTrack(stream?.getAudioTracks()[0] || null)]);
      const sender = slots[2].sender;
      const params = sender.getParameters();
      if (stream && params.encodings?.length) {
        params.encodings[0].maxBitrate = 4_000_000;
        params.encodings[0].maxFramerate = 30;
        params.degradationPreference = 'maintain-resolution';
        await sender.setParameters(params).catch(() => {});
      }
    }));
  }

  closePeerConnection(id: string) {
    const pc = this.peers.get(id)?.pc;
    this.peers.delete(id);
    if (pc) { pc.onconnectionstatechange = null; pc.ontrack = null; pc.onicecandidate = null; pc.close(); }
    this.pendingCandidates.delete(id);
  }
  closeAll() {
    [...this.peers.keys()].forEach(id => this.closePeerConnection(id));
    this.pendingCandidates.clear(); this.screenStream = null;
  }
}
export const webRTCManager = new WebRTCManager();
