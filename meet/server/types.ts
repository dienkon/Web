export type AnswerOption = 'A' | 'B' | 'C' | 'D';

export interface Participant {
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
  id: string;
  code: string;
  hostId: string;
  classroomMode: boolean;
  createdAt: number;
  participants: Map<string, Participant>;
  currentQuestion?: Question;
  answers: Map<string, UserAnswer>;
  whiteboardDataUrl?: string;
  isLocked?: boolean;
}

export interface AnswerStatistics {
  A: number;
  B: number;
  C: number;
  D: number;
  total: number;
}
