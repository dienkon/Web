export type AnswerOption = 'A' | 'B' | 'C' | 'D';

export interface HostSettings {
  hostManagement: boolean;
  allowScreenShare: boolean;
  allowChat: boolean;
  allowReactions: boolean;
  allowMic: boolean;
  allowVideo: boolean;
}

export interface Participant {
  identityHash?: string;
  id: string;
  socketId: string;
  name: string;
  audioEnabled: boolean;
  videoEnabled: boolean;
  isHost: boolean;
  isSpeaking: boolean;
  isScreenSharing?: boolean;
  handRaised?: boolean;
  handRaisedAt?: number;
  joinedAt: number;
  lastHeartbeat?: number;
}

export interface Question {
  id: string;
  roomId: string;
  text: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  status: 'draft' | 'active' | 'locked';
  correctAnswer?: AnswerOption;
  createdAt: number;
}

export interface UserAnswer {
  userId: string;
  userName: string;
  answer: AnswerOption;
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

export interface Room {
  messages?: { id: string; senderId: string; senderName: string; text: string; timestamp: number }[];
  answersByIdentity?: Map<string, UserAnswer>;
  timerEndsAt?: number | null;
  whiteboardStrokes?: WhiteboardStroke[];
  ownerTokenHash: string;
  approvedUserIds: Set<string>;
  requireApproval?: boolean;
  id: string;
  code: string;
  hostId: string;
  classroomMode: boolean;
  createdAt: number;
  participants: Map<string, Participant>;
  currentQuestion?: Question;
  answers: Map<string, UserAnswer>;
  isLocked?: boolean;
  kickedUserIds?: Set<string>;
  hostSettings?: HostSettings;
}

export interface AnswerStatistics {
  A: number;
  B: number;
  C: number;
  D: number;
  total: number;
}
