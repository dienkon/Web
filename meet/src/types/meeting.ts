export interface Participant {
  id: string;
  name: string;
  stream?: MediaStream;
  screenStream?: MediaStream;
  handRaised?: boolean;
  handRaisedAt?: number;
  connectionState?: RTCPeerConnectionState;
  audioEnabled: boolean;
  videoEnabled: boolean;
  isHost: boolean;
  isSpeaking: boolean;
  isScreenSharing?: boolean;
  joinedAt?: number;
  networkQuality?: 'good' | 'fair' | 'poor' | 'checking';
  latency?: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
}

export interface ReactionItem {
  id: string;
  senderId: string;
  senderName: string;
  emoji: string;
  timestamp: number;
}

export interface WhiteboardStroke {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  color: string;
  size: number;
  isEraser?: boolean;
}

export type SidePanelType = 'chat' | 'participants' | 'classroom' | 'whiteboard' | 'none';

export type ConnectionState = 'connected' | 'reconnecting' | 'disconnected';
