import { create } from 'zustand';
import { Participant, ChatMessage, SidePanelType, ConnectionState } from '../types/meeting';

interface Toast {
  id: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
}

interface MeetingState {
  roomId: string | null;
  roomCode: string | null;
  userName: string;
  isHost: boolean;
  joined: boolean;
  connectionState: ConnectionState;

  // Local media stream settings
  localStream: MediaStream | null;
  audioEnabled: boolean;
  videoEnabled: boolean;
  isScreenSharing: boolean;
  screenStream: MediaStream | null;

  // Participants & Presentation
  myParticipantId: string | null;
  participants: Map<string, Participant>;
  activeSpeakerId: string | null;
  pinnedParticipantId: string | null;

  // Panels & Messages
  activePanel: SidePanelType;
  chatMessages: ChatMessage[];

  // Toast notifications
  toasts: Toast[];

  // Actions
  setRoomInfo: (roomId: string, roomCode: string, isHost: boolean) => void;
  setUserName: (name: string) => void;
  setJoined: (joined: boolean) => void;
  setConnectionState: (state: ConnectionState) => void;
  setLocalStream: (stream: MediaStream | null) => void;
  setAudioEnabled: (enabled: boolean) => void;
  setVideoEnabled: (enabled: boolean) => void;
  setScreenSharing: (isSharing: boolean, stream?: MediaStream | null) => void;

  setMyParticipantId: (id: string | null) => void;
  addParticipant: (participant: Participant) => void;
  removeParticipant: (participantId: string) => void;
  updateParticipant: (participantId: string, updates: Partial<Participant>) => void;
  setParticipants: (participantsList: Participant[]) => void;
  setActiveSpeaker: (participantId: string | null) => void;
  setPinnedParticipant: (participantId: string | null) => void;

  setActivePanel: (panel: SidePanelType) => void;
  addChatMessage: (msg: ChatMessage) => void;

  addToast: (message: string, type?: Toast['type']) => void;
  removeToast: (id: string) => void;

  resetMeeting: () => void;
}

export const useMeetingStore = create<MeetingState>((set, get) => ({
  roomId: null,
  roomCode: null,
  userName: '',
  isHost: false,
  joined: false,
  connectionState: 'disconnected',

  localStream: null,
  audioEnabled: true,
  videoEnabled: true,
  isScreenSharing: false,
  screenStream: null,

  myParticipantId: null,
  participants: new Map(),
  activeSpeakerId: null,
  pinnedParticipantId: null,

  activePanel: 'none',
  chatMessages: [],
  toasts: [],

  setRoomInfo: (roomId, roomCode, isHost) => set({ roomId, roomCode, isHost }),
  setUserName: (userName) => set({ userName }),
  setJoined: (joined) => set({ joined }),
  setConnectionState: (connectionState) => set({ connectionState }),
  setLocalStream: (localStream) => set({ localStream }),
  setAudioEnabled: (audioEnabled) => set({ audioEnabled }),
  setVideoEnabled: (videoEnabled) => set({ videoEnabled }),
  setScreenSharing: (isScreenSharing, screenStream = null) => set({ isScreenSharing, screenStream }),

  setMyParticipantId: (myParticipantId) => set({ myParticipantId }),

  addParticipant: (participant) =>
    set((state) => {
      if (participant.id === state.myParticipantId || participant.id === 'local_user') {
        return state;
      }
      const updated = new Map(state.participants);
      updated.set(participant.id, participant);
      return { participants: updated };
    }),

  removeParticipant: (participantId) =>
    set((state) => {
      const updated = new Map(state.participants);
      updated.delete(participantId);
      return {
        participants: updated,
        pinnedParticipantId: state.pinnedParticipantId === participantId ? null : state.pinnedParticipantId,
        activeSpeakerId: state.activeSpeakerId === participantId ? null : state.activeSpeakerId,
      };
    }),

  updateParticipant: (participantId, updates) =>
    set((state) => {
      const existing = state.participants.get(participantId);
      if (!existing) return state;
      const updatedMap = new Map(state.participants);
      updatedMap.set(participantId, { ...existing, ...updates });
      return { participants: updatedMap };
    }),

  setParticipants: (participantsList) =>
    set((state) => {
      const map = new Map<string, Participant>();
      participantsList.forEach((p) => {
        if (p.id !== state.myParticipantId && p.id !== 'local_user') {
          map.set(p.id, p);
        }
      });
      return { participants: map };
    }),

  setActiveSpeaker: (activeSpeakerId) => set({ activeSpeakerId }),
  setPinnedParticipant: (pinnedParticipantId) =>
    set((state) => ({
      pinnedParticipantId: state.pinnedParticipantId === pinnedParticipantId ? null : pinnedParticipantId,
    })),

  setActivePanel: (panel) =>
    set((state) => ({
      activePanel: state.activePanel === panel ? 'none' : panel,
    })),

  addChatMessage: (msg) =>
    set((state) => ({
      chatMessages: [...state.chatMessages, msg],
    })),

  addToast: (message, type = 'info') =>
    set((state) => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
      return { toasts: [...state.toasts, { id, message, type }] };
    }),

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  resetMeeting: () =>
    set({
      roomId: null,
      roomCode: null,
      joined: false,
      isHost: false,
      connectionState: 'disconnected',
      localStream: null,
      screenStream: null,
      isScreenSharing: false,
      participants: new Map(),
      activeSpeakerId: null,
      pinnedParticipantId: null,
      activePanel: 'none',
      chatMessages: [],
    }),
}));
