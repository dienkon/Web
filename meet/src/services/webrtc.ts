const STUN_SERVERS = [
  { urls: import.meta.env.VITE_STUN_SERVER || 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
  { urls: 'stun:global.stun.twilio.com:3478' },
];

const TURN_SERVER = import.meta.env.VITE_TURN_SERVER;
const TURN_USERNAME = import.meta.env.VITE_TURN_USERNAME;
const TURN_PASSWORD = import.meta.env.VITE_TURN_PASSWORD;

function getRTCConfiguration(): RTCConfiguration {
  const iceServers: RTCIceServer[] = [...STUN_SERVERS];

  if (TURN_SERVER) {
    iceServers.push({
      urls: TURN_SERVER,
      username: TURN_USERNAME || undefined,
      credential: TURN_PASSWORD || undefined,
    });
  } else {
    // Open relay TURN fallback for strict NATs & corporate firewalls
    iceServers.push(
      {
        urls: 'turn:openrelay.metered.ca:80',
        username: 'openrelayproject',
        credential: 'openrelayproject',
      },
      {
        urls: 'turn:openrelay.metered.ca:443',
        username: 'openrelayproject',
        credential: 'openrelayproject',
      }
    );
  }

  return {
    iceServers,
    iceCandidatePoolSize: 10,
  };
}

export class WebRTCManager {
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private pendingCandidates: Map<string, RTCIceCandidateInit[]> = new Map();

  public createPeerConnection(
    peerId: string,
    localStream: MediaStream | null,
    onTrack: (remoteStream: MediaStream) => void,
    onIceCandidate: (candidate: RTCIceCandidate) => void
  ): RTCPeerConnection {
    if (this.peerConnections.has(peerId)) {
      this.closePeerConnection(peerId);
    }

    const pc = new RTCPeerConnection(getRTCConfiguration());
    const remoteStream = new MediaStream();

    // Add local tracks to peer connection
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });
    }

    // Receive remote tracks
    pc.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        remoteStream.addTrack(track);
      });
      onTrack(remoteStream);
    };

    // Emit ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        onIceCandidate(event.candidate);
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
        console.warn(`[WebRTC] Peer connection state with ${peerId}: ${pc.iceConnectionState}`);
      }
    };

    this.peerConnections.set(peerId, pc);

    // Process queued candidates if any
    const pending = this.pendingCandidates.get(peerId);
    if (pending && pending.length > 0) {
      pending.forEach((candidate) => {
        pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.error);
      });
      this.pendingCandidates.delete(peerId);
    }

    return pc;
  }

  public async createOffer(peerId: string): Promise<RTCSessionDescriptionInit | null> {
    const pc = this.peerConnections.get(peerId);
    if (!pc) return null;
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      return offer;
    } catch (err) {
      console.error(`[WebRTC] Failed to create offer for ${peerId}:`, err);
      return null;
    }
  }

  public async handleOffer(peerId: string, offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit | null> {
    const pc = this.peerConnections.get(peerId);
    if (!pc) return null;
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      return answer;
    } catch (err) {
      console.error(`[WebRTC] Failed to handle offer from ${peerId}:`, err);
      return null;
    }
  }

  public async handleAnswer(peerId: string, answer: RTCSessionDescriptionInit): Promise<void> {
    const pc = this.peerConnections.get(peerId);
    if (!pc) return;
    try {
      if (pc.signalingState !== 'stable') {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    } catch (err) {
      console.error(`[WebRTC] Failed to handle answer from ${peerId}:`, err);
    }
  }

  public async addIceCandidate(peerId: string, candidate: RTCIceCandidateInit): Promise<void> {
    const pc = this.peerConnections.get(peerId);
    if (pc && pc.remoteDescription) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error(`[WebRTC] Failed to add ICE candidate for ${peerId}:`, err);
      }
    } else {
      if (!this.pendingCandidates.has(peerId)) {
        this.pendingCandidates.set(peerId, []);
      }
      this.pendingCandidates.get(peerId)!.push(candidate);
    }
  }

  public replaceVideoTrack(peerId: string, newTrack: MediaStreamTrack | null): void {
    const pc = this.peerConnections.get(peerId);
    if (!pc) return;
    const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
    if (sender) {
      sender.replaceTrack(newTrack).catch(console.error);
    }
  }

  public closePeerConnection(peerId: string): void {
    const pc = this.peerConnections.get(peerId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(peerId);
    }
    this.pendingCandidates.delete(peerId);
  }

  public closeAll(): void {
    this.peerConnections.forEach((pc) => pc.close());
    this.peerConnections.clear();
    this.pendingCandidates.clear();
  }
}

export const webRTCManager = new WebRTCManager();
