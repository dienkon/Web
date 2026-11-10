import { create } from 'zustand';
import {
  Participant,
  ChatMessage,
  SidePanelType,
  ConnectionState,
  ReactionItem,
  HostSettings,
} from '../types/meeting';

interface Toast {
  id: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
}

const DEFAULT_HOST_SETTINGS: HostSettings = {
  hostManagement: true,
  allowScreenShare: true,
  allowChat: true,
  allowReactions: true,
  allowMic: true,
  allowVideo: true,
};

interface MeetingState {
  roomId: string | null;
  roomCode: string | null;
  userName: string;
  isHost: boolean;
  timerEndsAt: number | null;
  serverTimeOffset: number;
  joined: boolean;
  joinStatus: 'connecting' | 'waiting' | 'joined' | 'error';
  joinError: string;
  requireApproval: boolean;
  waitingRequests: { id: string; name: string; requestedAt: number }[];
  connectionState: ConnectionState;

  // Local media stream settings
  localStream: MediaStream | null;
  audioEnabled: boolean;
  videoEnabled: boolean;
  isScreenSharing: boolean;
  screenStream: MediaStream | null;
  inputDeviceId: string;
  cameraDeviceId: string;
  outputDeviceId: string;
  speakerVolume: number;
  noiseSuppression: boolean;
  shareQuality: 'detail' | 'motion';
  layout: 'grid' | 'speaker';
  handRaised: boolean;
  cameraFacingMode: 'user' | 'environment';
  isMobileLandscape: boolean;
  setPreferences: (
    values: Partial<
      Pick<
        MeetingState,
        | 'inputDeviceId'
        | 'cameraDeviceId'
        | 'outputDeviceId'
        | 'speakerVolume'
        | 'noiseSuppression'
        | 'shareQuality'
        | 'layout'
        | 'handRaised'
        | 'cameraFacingMode'
        | 'isMobileLandscape'
      >
    >
  ) => void;

  // Participants & Presentation
  myParticipantId: string | null;
  participants: Map<string, Participant>;
  activeSpeakerId: string | null;
  pinnedParticipantId: string | null;

  // Panels & Messages
  activePanel: SidePanelType;
  chatMessages: ChatMessage[];
  unreadChatCount: number;

  // Interactive Whiteboard & Reactions
  isWhiteboardOpen: boolean;
  reactions: ReactionItem[];

  // Network stats & Moderation
  networkQuality: 'good' | 'fair' | 'poor' | 'checking';
  networkLatency: number;
  isRoomLocked: boolean;
  hostSettings: HostSettings;

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
  setCameraFacingMode: (mode: 'user' | 'environment') => void;
  toggleMobileLandscape: () => void;

  setMyParticipantId: (id: string | null) => void;
  addParticipant: (participant: Participant) => void;
  removeParticipant: (participantId: string) => void;
  updateParticipant: (participantId: string, updates: Partial<Participant>) => void;
  setParticipants: (participantsList: Participant[]) => void;
  setActiveSpeaker: (participantId: string | null) => void;
  setPinnedParticipant: (participantId: string | null) => void;

  setActivePanel: (panel: SidePanelType) => void;
  addChatMessage: (msg: ChatMessage) => void;
  incrementUnreadChat: () => void;
  resetUnreadChat: () => void;

  setWhiteboardOpen: (open: boolean) => void;
  addReaction: (reaction: ReactionItem) => void;

  setNetworkStats: (quality: 'good' | 'fair' | 'poor' | 'checking', latency: number) => void;
  setRoomLocked: (locked: boolean) => void;
  setHostSettings: (settings: Partial<HostSettings>) => void;

  addToast: (message: string, type?: Toast['type']) => void;
  removeToast: (id: string) => void;

  resetMeeting: () => void;
}

export const useMeetingStore = create<MeetingState>((set) => ({
  roomId: null,
  roomCode: null,
  userName: '',
  isHost: false,
  timerEndsAt: null,
  serverTimeOffset: 0,
  joined: false,
  joinStatus: 'connecting',
  joinError: '',
  requireApproval: false,
  waitingRequests: [],
  connectionState: 'disconnected',

  localStream: null,
  audioEnabled: true,
  videoEnabled: true,
  isScreenSharing: false,
  screenStream: null,
  inputDeviceId: '',
  cameraDeviceId: '',
  outputDeviceId: '',
  speakerVolume: 1,
  noiseSuppression: true,
  shareQuality: 'detail',
  layout: 'grid',
  handRaised: false,
  cameraFacingMode: 'user',
  isMobileLandscape: false,
  setPreferences: (values) => set(values),

  myParticipantId: null,
  participants: new Map(),
  activeSpeakerId: null,
  pinnedParticipantId: null,

  activePanel: 'none',
  chatMessages: [],
  unreadChatCount: 0,

  isWhiteboardOpen: false,
  reactions: [],

  networkQuality: 'checking',
  networkLatency: 0,
  isRoomLocked: false,
  hostSettings: DEFAULT_HOST_SETTINGS,

  toasts: [],

  setRoomInfo: (roomId, roomCode, isHost) => set({ roomId, roomCode, isHost }),
  setUserName: (userName) => set({ userName }),
  setJoined: (joined) => set({ joined }),
  setConnectionState: (connectionState) => set({ connectionState }),
  setLocalStream: (localStream) => set({ localStream }),
  setAudioEnabled: (audioEnabled) => set({ audioEnabled }),
  setVideoEnabled: (videoEnabled) => set({ videoEnabled }),
  setScreenSharing: (isScreenSharing, screenStream = null) => set({ isScreenSharing, screenStream }),
  setCameraFacingMode: (cameraFacingMode) => set({ cameraFacingMode }),
  toggleMobileLandscape: () => set((s) => ({ isMobileLandscape: !s.isMobileLandscape })),

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
      if (participantId === state.myParticipantId) return { isHost: updates.isHost ?? state.isHost };
      const existing = state.participants.get(participantId);
      const updatedMap = new Map(state.participants);
      if (existing) {
        updatedMap.set(participantId, { ...existing, ...updates });
      } else {
        const fallback: Participant = {
          id: participantId,
          name: 'Người tham gia',
          audioEnabled: true,
          videoEnabled: true,
          isHost: false,
          isSpeaking: false,
          joinedAt: Date.now(),
          ...updates,
        };
        updatedMap.set(participantId, fallback);
      }
      return { participants: updatedMap };
    }),

  setParticipants: (participantsList) =>
    set((state) => {
      const map = new Map<string, Participant>();
      // Deduplicate by name and ID
      participantsList.forEach((p) => {
        if (p.id !== state.myParticipantId && p.id !== 'local_user') {
          map.set(p.id, { ...state.participants.get(p.id), ...p });
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
      unreadChatCount: panel === 'chat' ? 0 : state.unreadChatCount,
    })),

  addChatMessage: (msg) =>
    set((state) => ({
      chatMessages: [...state.chatMessages, msg],
      unreadChatCount: state.activePanel !== 'chat' ? state.unreadChatCount + 1 : 0,
    })),

  incrementUnreadChat: () => set((s) => ({ unreadChatCount: s.unreadChatCount + 1 })),
  resetUnreadChat: () => set({ unreadChatCount: 0 }),

  setWhiteboardOpen: (isWhiteboardOpen) => set({ isWhiteboardOpen }),

  addReaction: (reaction) =>
    set((state) => ({
      reactions: [...state.reactions.slice(-15), reaction],
    })),

  setNetworkStats: (networkQuality, networkLatency) => set({ networkQuality, networkLatency }),
  setRoomLocked: (isRoomLocked) => set({ isRoomLocked }),
  setHostSettings: (settings) =>
    set((s) => ({ hostSettings: { ...s.hostSettings, ...settings } })),

  addToast: (message, type = 'info') =>
    set((state) => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
      return { toasts: [...state.toasts.slice(-2), { id, message, type }] };
    }),

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  resetMeeting: () =>
    set({
      roomId: null,
      roomCode: null,
      timerEndsAt: null,
      serverTimeOffset: 0,
      joined: false,
      joinStatus: 'connecting',
      joinError: '',
      requireApproval: false,
      waitingRequests: [],
      isHost: false,
      connectionState: 'disconnected',
      localStream: null,
      screenStream: null,
      isScreenSharing: false,
      myParticipantId: null,
      handRaised: false,
      participants: new Map(),
      activeSpeakerId: null,
      pinnedParticipantId: null,
      activePanel: 'none',
      chatMessages: [],
      unreadChatCount: 0,
      isWhiteboardOpen: false,
      reactions: [],
      networkQuality: 'checking',
      networkLatency: 0,
      isRoomLocked: false,
      isMobileLandscape: false,
      hostSettings: DEFAULT_HOST_SETTINGS,
    }),
}));
