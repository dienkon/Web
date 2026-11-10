export interface Participant {
  id: string;
  name: string;
  stream?: MediaStream;
  screenStream?: MediaStream;
  handRaised?: boolean;
  connectionState?: RTCPeerConnectionState;
  audioEnabled: boolean;
  videoEnabled: boolean;
  isHost: boolean;
  isSpeaking: boolean;
  isScreenSharing?: boolean;
  joinedAt?: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
}

export type SidePanelType = 'chat' | 'participants' | 'classroom' | 'none';

export type ConnectionState = 'connected' | 'reconnecting' | 'disconnected';
