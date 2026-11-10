import { SERVER_URL } from './api';
export interface PeerStats {
  rtt: number; // round-trip time in milliseconds
  packetLoss: number; // percentage
  bytesSent: number;
  bytesReceived: number;
  quality: 'good' | 'fair' | 'poor';
}

const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: import.meta.env.VITE_STUN_SERVER || 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
  { urls: 'stun:stun.relay.metered.ca:80' },
];

if (import.meta.env.VITE_TURN_SERVER) {
  const urls = (import.meta.env.VITE_TURN_SERVER as string).split(',').map((s) => s.trim());
  DEFAULT_ICE_SERVERS.push({
    urls,
    username: import.meta.env.VITE_TURN_USERNAME,
    credential: import.meta.env.VITE_TURN_PASSWORD,
  });
}

interface PeerEntry {
  id: string;
  pc: RTCPeerConnection;
  slots: RTCRtpTransceiver[];
  tracks: (MediaStreamTrack | null)[];
  isPolite: boolean;
  makingOffer: boolean;
  ignoreOffer: boolean;
  isSettingRemoteAnswerPending: boolean;
  cameraStream: MediaStream;
  screenStream: MediaStream;
  restarts: number;
  restartPending: boolean;
  restartTimer?: any;
  connectWatchdogTimer?: any;
  onTrack: (stream: MediaStream, screenStream: MediaStream) => void;
  onIce: (candidate: RTCIceCandidate) => void;
  onState?: (state: RTCPeerConnectionState) => void;
  onRestart?: (offer: RTCSessionDescriptionInit) => void;
}

export class WebRTCManager {
  private peers = new Map<string, PeerEntry>();
  private pendingCandidates = new Map<string, RTCIceCandidateInit[]>();
  private screenStream: MediaStream | null = null;
  public iceServers: RTCIceServer[] = [...DEFAULT_ICE_SERVERS];
  private iceLoadedAt = 0;

  private iceLoad: Promise<void> | null = null;
  async fetchDynamicIceServers(force = false): Promise<void> {
    if (!force && Date.now() - this.iceLoadedAt < 240000) return;
    if (!this.iceLoad) this.iceLoad = (async () => {
      try {
        const res = await fetch(`${SERVER_URL}/api/ice-servers`, { signal: AbortSignal.timeout(6000) });
        if (!res.ok) throw new Error('ICE configuration unavailable');
        const data = await res.json();
        if (Array.isArray(data.iceServers) && data.iceServers.length) {
          // Retain explicitly configured TURN if the API only returns STUN.
          this.iceServers = [...data.iceServers, ...DEFAULT_ICE_SERVERS.filter(s =>
            (Array.isArray(s.urls) ? s.urls : [s.urls]).some(url => /^turns?:/.test(url)))];
          this.iceLoadedAt = Date.now();
          this.peers.forEach(peer => peer.pc.setConfiguration({ ...peer.pc.getConfiguration(), iceServers: this.iceServers }));
        }
      } catch (error) { console.warn('[WebRTC] ICE configuration unavailable; using configured fallback.', error); }
    })().finally(() => { this.iceLoad = null; });
    return this.iceLoad;
  }

  hasPeerConnection(id: string): boolean {
    return this.peers.has(id);
  }

  getPeerConnection(id: string): RTCPeerConnection | undefined {
    return this.peers.get(id)?.pc;
  }

  createPeerConnection(
    id: string,
    local: MediaStream | null,
    onTrack: (stream: MediaStream, screenStream: MediaStream) => void,
    onIce: (candidate: RTCIceCandidate) => void,
    onState?: (state: RTCPeerConnectionState) => void,
    onRestart?: (offer: RTCSessionDescriptionInit) => void,
    isPolite: boolean = true
  ): RTCPeerConnection {
    const existing = this.peers.get(id);
    if (existing) return existing.pc;

    // TURN provides relay candidates when direct traversal is blocked.
    const pc = new RTCPeerConnection({
      iceServers: this.iceServers,
      iceCandidatePoolSize: 2,
      bundlePolicy: 'max-bundle', // Multiplexes all 4 media slots onto 1 candidate pair
      iceTransportPolicy: import.meta.env.VITE_ICE_TRANSPORT_POLICY === 'relay' ? 'relay' : 'all',
      rtcpMuxPolicy: 'require', // Multiplexes RTP and RTCP on the same port
    });

    const cameraStream = new MediaStream();
    const screenStream = new MediaStream();

    const tracks: (MediaStreamTrack | null)[] = [
      local?.getAudioTracks()[0] || null,
      local?.getVideoTracks()[0] || null,
      this.screenStream?.getVideoTracks()[0] || null,
      this.screenStream?.getAudioTracks()[0] || null,
    ];

    const peer: PeerEntry = {
      id,
      pc,
      slots: [],
      tracks,
      isPolite,
      restarts: 0,
      restartPending: false,
      makingOffer: false,
      ignoreOffer: false,
      isSettingRemoteAnswerPending: false,
      cameraStream,
      screenStream,
      onTrack,
      onIce,
      onState,
      onRestart,
    };

    this.peers.set(id, peer);

    pc.ontrack = ({ track, transceiver }) => {
      const transceivers = pc.getTransceivers();
      const index = transceivers.indexOf(transceiver);
      // Slots 0, 1 = camera/mic stream; Slots 2, 3 = presentation screen stream
      const stream = index >= 2 ? screenStream : cameraStream;

      if (!stream.getTrackById(track.id)) {
        stream.addTrack(track);
      }

      const notify = () => {
        if (this.peers.get(id)?.pc === pc) {
          onTrack(new MediaStream(cameraStream.getTracks()), new MediaStream(screenStream.getTracks()));
        }
      };

      track.onunmute = notify;
      track.onmute = notify;
      track.onended = () => {
        stream.removeTrack(track);
        notify();
      };
      notify();
    };

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        onIce(candidate);
      }
    };

    // Resilient ICE Restart watchdog for cross-network reconnections
    const armWatchdog = () => {
      clearTimeout(peer.connectWatchdogTimer);
      peer.connectWatchdogTimer = setTimeout(() => {
        if (this.peers.get(id) !== peer || pc.connectionState === 'closed') return;
        if (pc.connectionState !== 'connected') triggerRestart();
      }, 20000);
    };
    const triggerRestart = () => {
      if (this.peers.get(id) !== peer || pc.connectionState === 'closed' || peer.makingOffer || peer.restartPending) return;
      if (peer.restarts >= 2) {
        clearTimeout(peer.restartTimer);
        clearTimeout(peer.connectWatchdogTimer);
        pc.onconnectionstatechange = null;
        pc.oniceconnectionstatechange = null;
        pc.close();
        onState?.('failed');
        return;
      }
      peer.restarts++;
      // Only the designated offerer restarts; the other side waits for its offer.
      if (!peer.isPolite && pc.signalingState === 'stable' && peer.onRestart) {
        peer.restartPending = true;
        void this.fetchDynamicIceServers(true).then(() => this.createOffer(id, true))
          .then(offer => { if (offer) peer.onRestart?.(offer); })
          .finally(() => { peer.restartPending = false; });
      }
      armWatchdog();
    };

    const handleConnectionFail = () => {
      const state = pc.connectionState;
      const iceState = pc.iceConnectionState;

      if (state === 'failed' || iceState === 'failed') {
        clearTimeout(peer.restartTimer);
        // Both ICE and connection state can report the same failure. Coalesce them.
        peer.restartTimer = setTimeout(triggerRestart, 250);
      } else if (state === 'disconnected' || iceState === 'disconnected') {
        // Disconnection might be transient on mobile 4G handovers; allow 3.5s before restarting
        clearTimeout(peer.restartTimer);
        peer.restartTimer = setTimeout(() => {
          if (pc.connectionState === 'disconnected' || pc.iceConnectionState === 'disconnected') {
            triggerRestart();
          }
        }, 3500);
      }
    };

    pc.onconnectionstatechange = () => {
      onState?.(pc.connectionState);
      if (pc.connectionState === 'connected') {
        peer.restarts = 0;
        clearTimeout(peer.restartTimer);
        clearTimeout(peer.connectWatchdogTimer);
      } else {
        handleConnectionFail();
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        clearTimeout(peer.restartTimer);
        clearTimeout(peer.connectWatchdogTimer);
      } else {
        handleConnectionFail();
      }
    };

    armWatchdog();

    return pc;
  }

  private async flushCandidates(id: string) {
    const peer = this.peers.get(id);
    if (!peer?.pc.remoteDescription) return;

    const queued = this.pendingCandidates.get(id) || [];
    this.pendingCandidates.delete(id);

    for (const candidate of queued) {
      try {
        await peer.pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.warn('[WebRTC] Queued ICE candidate warning:', error);
      }
    }
  }

  async createOffer(id: string, iceRestart = false): Promise<RTCSessionDescriptionInit | null> {
    const peer = this.peers.get(id);
    if (!peer) return null;
    const { pc, tracks } = peer;

    if (pc.signalingState !== 'stable' || peer.makingOffer) return null;

    try {
      peer.makingOffer = true;

      if (!peer.slots.length) {
        peer.slots = (['audio', 'video', 'video', 'audio'] as const).map((kind, i) =>
          pc.addTransceiver(tracks[i] || kind, { direction: 'sendrecv' })
        );
      } else {
        await Promise.all(
          peer.slots.map(async (slot, i) => {
            if (tracks[i] && slot.sender.track !== tracks[i]) {
              await slot.sender.replaceTrack(tracks[i]).catch(() => {});
            }
          })
        );
      }

      const offer = await pc.createOffer({ iceRestart });
      await pc.setLocalDescription(offer);
      return pc.localDescription?.toJSON() || null;
    } catch (error) {
      console.warn('[WebRTC] Offer failed:', error);
      return null;
    } finally {
      peer.makingOffer = false;
    }
  }

  async handleOffer(id: string, offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit | null> {
    const peer = this.peers.get(id);
    if (!peer) return null;
    const { pc, isPolite } = peer;

    // Perfect negotiation glare handling
    const readyForOffer = !peer.makingOffer && (pc.signalingState === 'stable' || peer.isSettingRemoteAnswerPending);
    const offerCollision = !readyForOffer;
    peer.ignoreOffer = !isPolite && offerCollision;

    if (peer.ignoreOffer) {
      console.warn('[WebRTC] Glare collision detected: impolite peer ignoring offer from', id);
      return null;
    }

    try {
      await pc.setRemoteDescription(offer);
      peer.ignoreOffer = false;

      if (!peer.slots.length) {
        peer.slots = pc.getTransceivers().slice(0, 4);
      }

      await Promise.all(
        peer.slots.map(async (slot, i) => {
          slot.direction = 'sendrecv';
          if (peer.tracks[i] !== undefined) {
            await slot.sender.replaceTrack(peer.tracks[i]);
          }
        })
      );

      await this.flushCandidates(id);

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      return pc.localDescription?.toJSON() || null;
    } catch (error) {
      console.warn('[WebRTC] Answer failed:', error);
      return null;
    }
  }

  async handleAnswer(id: string, answer: RTCSessionDescriptionInit): Promise<void> {
    const peer = this.peers.get(id);
    if (!peer) return;
    const pc = peer.pc;

    if (pc.signalingState === 'have-local-offer') {
      try {
        peer.isSettingRemoteAnswerPending = true;
        await pc.setRemoteDescription(answer);
        peer.ignoreOffer = false;
        await this.flushCandidates(id);
      } catch (error) {
        console.warn('[WebRTC] Remote answer failed:', error);
      } finally {
        peer.isSettingRemoteAnswerPending = false;
      }
    }
  }

  async addIceCandidate(id: string, candidate: RTCIceCandidateInit): Promise<void> {
    const peer = this.peers.get(id);
    const pc = peer?.pc;

    if (!candidate || !candidate.candidate) return;

    if (pc?.remoteDescription && pc.remoteDescription.type) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        if (!peer?.ignoreOffer) {
          console.warn('[WebRTC] ICE candidate error:', error);
        }
      }
    } else {
      const queued = this.pendingCandidates.get(id) || [];
      this.pendingCandidates.set(id, [...queued, candidate]);
    }
  }

  async replaceTrack(kind: 'audio' | 'video', track: MediaStreamTrack | null) {
    const index = kind === 'audio' ? 0 : 1;
    await Promise.all(
      [...this.peers.values()].map(async (peer) => {
        peer.tracks[index] = track;
        const sender = peer.slots[index]?.sender;
        if (sender) {
          await sender.replaceTrack(track);

          // Configure optimal video parameters when enabling camera
          if (kind === 'video' && track) {
            try {
              const params = sender.getParameters();
              if (params.encodings?.length) {
                params.encodings[0].maxBitrate = 1_500_000;
                params.degradationPreference = 'maintain-framerate';
                await sender.setParameters(params);
              }
            } catch {}
          }
        }
      })
    );
  }

  async updateLocalStream(stream: MediaStream | null) {
    await Promise.all([
      this.replaceTrack('audio', stream?.getAudioTracks()[0] || null),
      this.replaceTrack('video', stream?.getVideoTracks()[0] || null),
    ]);
  }

  async updateScreenStream(stream: MediaStream | null) {
    this.screenStream = stream;
    await Promise.all(
      [...this.peers.values()].map(async (peer) => {
        const { slots } = peer;
        peer.tracks[2] = stream?.getVideoTracks()[0] || null;
        peer.tracks[3] = stream?.getAudioTracks()[0] || null;

        if (!slots.length) return;

        await Promise.all([
          slots[2].sender.replaceTrack(stream?.getVideoTracks()[0] || null),
          slots[3].sender.replaceTrack(stream?.getAudioTracks()[0] || null),
        ]);

        const sender = slots[2].sender;
        const params = sender.getParameters();
        if (stream && params.encodings?.length) {
          params.encodings[0].maxBitrate = 4_000_000;
          params.encodings[0].maxFramerate = 30;
          params.degradationPreference = 'maintain-resolution';
          await sender.setParameters(params).catch(() => {});
        }
      })
    );
  }

  async getPeerStats(id: string): Promise<PeerStats | null> {
    const peer = this.peers.get(id);
    if (!peer || peer.pc.connectionState !== 'connected') return null;

    try {
      const stats = await peer.pc.getStats();
      let rtt = 0;
      let packetsLost = 0;
      let packetsReceived = 0;
      let bytesSent = 0;
      let bytesReceived = 0;

      stats.forEach((report) => {
        if (
          report.type === 'candidate-pair' &&
          report.state === 'succeeded' &&
          report.currentRoundTripTime !== undefined
        ) {
          rtt = Math.round(report.currentRoundTripTime * 1000);
        }
        if (report.type === 'inbound-rtp') {
          packetsLost += report.packetsLost || 0;
          packetsReceived += report.packetsReceived || 0;
          bytesReceived += report.bytesReceived || 0;
        }
        if (report.type === 'outbound-rtp') {
          bytesSent += report.bytesSent || 0;
        }
      });

      const totalPackets = packetsLost + packetsReceived;
      const lossRate = totalPackets > 0 ? (packetsLost / totalPackets) * 100 : 0;

      let quality: 'good' | 'fair' | 'poor' = 'good';
      if (rtt > 300 || lossRate > 5) {
        quality = 'poor';
      } else if (rtt > 150 || lossRate > 1.5) {
        quality = 'fair';
      }

      return {
        rtt,
        packetLoss: Math.round(lossRate * 10) / 10,
        bytesSent,
        bytesReceived,
        quality,
      };
    } catch {
      return null;
    }
  }

  async getAllPeerStats(): Promise<{ averageRtt: number; overallQuality: 'good' | 'fair' | 'poor' }> {
    const activeIds = [...this.peers.keys()];
    if (!activeIds.length) return { averageRtt: 0, overallQuality: 'good' };

    const statsList = await Promise.all(activeIds.map((id) => this.getPeerStats(id)));
    const valid = statsList.filter((s): s is PeerStats => s !== null);

    if (!valid.length) return { averageRtt: 0, overallQuality: 'good' };

    const totalRtt = valid.reduce((sum, s) => sum + s.rtt, 0);
    const avgRtt = Math.round(totalRtt / valid.length);

    let overallQuality: 'good' | 'fair' | 'poor' = 'good';
    if (valid.some((s) => s.quality === 'poor')) overallQuality = 'poor';
    else if (valid.some((s) => s.quality === 'fair')) overallQuality = 'fair';

    return { averageRtt: avgRtt, overallQuality };
  }

  closePeerConnection(id: string) {
    const peer = this.peers.get(id);
    this.peers.delete(id);
    if (peer) {
      clearTimeout(peer.restartTimer);
      clearTimeout(peer.connectWatchdogTimer);
      const pc = peer.pc;
      pc.onconnectionstatechange = null;
      pc.oniceconnectionstatechange = null;
      pc.ontrack = null;
      pc.onicecandidate = null;
      pc.close();
    }
    this.pendingCandidates.delete(id);
  }

  closeAll() {
    [...this.peers.keys()].forEach((id) => this.closePeerConnection(id));
    this.pendingCandidates.clear();
    this.screenStream = null;
  }
}

export const webRTCManager = new WebRTCManager();
